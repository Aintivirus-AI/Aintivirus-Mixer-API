import { ethers } from "ethers";
import { MerkleTreeWithHistory as IMerkleTreeWithHistory } from "../typechain-types"; // Adjust import path as necessary
import { MIXER_ABI } from "../../../constant/abi/Mixer"; // Adjust import path as necessary
// Assume a Poseidon hash function is available
import { poseidon2 } from "poseidon-lite";

// Constants from the MerkleTreeWithHistory contract
const FIELD_SIZE = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
const ZERO_VALUE = BigInt("9843416945950214527845121167110536396734923501368431511777016063417998984121");
const TREE_DEPTH = 31;
const ROOT_HISTORY_SIZE = 30;

// Interface for Merkle path result
interface MerklePath {
    pathElements: string[]; // Sibling hashes
    pathIndices: number[]; // 0 for left, 1 for right
}

// Enum for tree type
export enum TreeType {
    ETH = "ETH",
    SOL = "SOL"
}

export default class MerkleTreeReconstructor {
    private readonly provider: ethers.JsonRpcProvider;
    private readonly contract: IMerkleTreeWithHistory;
    private levels: number;

    constructor(contractAddress: string, rpcUrl: string) {
        try {
            this.provider = new ethers.JsonRpcProvider(rpcUrl);
            this.contract = new ethers.Contract(
                contractAddress,
                MIXER_ABI,
                this.provider
            ) as unknown as IMerkleTreeWithHistory;
            this.levels = 0; // Will be set after fetching from contract
        } catch (error) {
            throw new Error(`Failed to initialize MerkleTreeReconstructor: ${(error as Error).message}`);
        }
    }

    /**
     * Initializes the reconstructor by fetching the tree levels
     */
    async initialize(): Promise<void> {
        try {
            this.levels = Number(await this.contract.levels());
            if (this.levels <= 0 || this.levels > TREE_DEPTH) {
                throw new Error("Invalid tree levels");
            }
        } catch (error) {
            throw new Error(`Failed to initialize levels: ${(error as Error).message}`);
        }
    }

    /**
     * Computes the zero hash at a given level
     * @param index The level index
     * @returns The zero hash as a hex string
     */
    private async getZeroHashAt(index: number): Promise<string> {
        if (index >= TREE_DEPTH) {
            throw new Error("Index out of range");
        }
        let current = ZERO_VALUE;
        for (let i = 0; i < index; i++) {
            current = BigInt(poseidon2([current, current]));
        }
        return ethers.toBeHex(current, 32);
    }

    /**
     * Hashes two inputs using Poseidon
     * @param left The left input (hex string)
     * @param right The right input (hex string)
     * @returns The hash as a hex string
     */
    private async hashLeftRight(left: string, right: string): Promise<string> {
        const leftBigInt = BigInt(left);
        const rightBigInt = BigInt(right);
        if (leftBigInt >= FIELD_SIZE || rightBigInt >= FIELD_SIZE) {
            throw new Error("Input out of field");
        }
        const hash = poseidon2([leftBigInt, rightBigInt]);
        return ethers.toBeHex(hash, 32);
    }

    /**
     * Reconstructs the Merkle tree and returns the root
     * @param treeType The tree to reconstruct ("ETH" or "SOL")
     * @param fromBlock Starting block number (optional, defaults to 0)
     * @param toBlock Ending block number (optional, defaults to "latest")
     * @returns The Merkle root as a hex string
     */
    async getMerkleRoot(
        treeType: TreeType,
        fromBlock: number | string = 0,
        toBlock: number | string = "latest"
    ): Promise<string> {
        try {
            if (!this.levels) {
                await this.initialize();
            }

            // Fetch leaves from events
            const leaves = await this.getLeaves(treeType, fromBlock, toBlock);

            // Initialize subtrees
            const subtrees: string[] = new Array(this.levels).fill("");
            for (let i = 0; i < this.levels; i++) {
                subtrees[i] = await this.getZeroHashAt(i);
            }

            // Insert leaves to reconstruct the tree
            let currentIndex = 0;
            let currentHash = "";
            for (const leaf of leaves) {
                currentIndex = leaves.indexOf(leaf);
                currentHash = leaf;

                for (let i = 0; i < this.levels; i++) {
                    if (currentIndex % 2 === 0) {
                        // Insert as left child
                        subtrees[i] = currentHash;
                        currentHash = await this.hashLeftRight(
                            currentHash,
                            await this.getZeroHashAt(i)
                        );
                    } else {
                        // Insert as right child
                        currentHash = await this.hashLeftRight(subtrees[i], currentHash);
                    }
                    currentIndex = Math.floor(currentIndex / 2);
                }
            }

            return currentHash || subtrees[this.levels - 1]; // Return root or initial zero hash
        } catch (error) {
            throw new Error(`Failed to reconstruct ${treeType} Merkle root: ${(error as Error).message}`);
        }
    }

    /**
     * Reconstructs the Merkle path for a given leaf index
     * @param treeType The tree to reconstruct ("ETH" or "SOL")
     * @param leafIndex The index of the leaf
     * @param fromBlock Starting block number (optional, defaults to 0)
     * @param toBlock Ending block number (optional, defaults to "latest")
     * @returns The Merkle path (pathElements and pathIndices)
     */
    async getMerklePath1(
        treeType: TreeType,
        leafIndex: number,
        fromBlock: number | string = 0,
        toBlock: number | string = "latest"
    ): Promise<MerklePath> {
        try {
            if (!this.levels) {
                await this.initialize();
            }

            if (leafIndex < 0 || leafIndex >= (1 << this.levels)) {
                throw new Error("Invalid leaf index");
            }

            // Fetch leaves
            const leaves = await this.getLeaves(treeType, fromBlock, toBlock);
            if (leafIndex >= leaves.length) {
                throw new Error("Leaf index out of range of inserted leaves");
            }

            // Reconstruct the tree
            const subtrees: string[][] = new Array(this.levels).fill([]).map(() => []);
            for (let i = 0; i < this.levels; i++) {
                subtrees[i][0] = await this.getZeroHashAt(i);
            }

            let currentIndex = 0;
            let currentHash = "";
            for (const leaf of leaves) {
                currentIndex = leaves.indexOf(leaf);
                currentHash = leaf;

                for (let i = 0; i < this.levels; i++) {
                    subtrees[i][currentIndex] = currentHash;
                    if (currentIndex % 2 === 0) {
                        // Insert as left child
                        currentHash = await this.hashLeftRight(
                            currentHash,
                            subtrees[i][currentIndex + 1] || await this.getZeroHashAt(i)
                        );
                    } else {
                        // Insert as right child
                        currentHash = await this.hashLeftRight(
                            subtrees[i][currentIndex - 1],
                            currentHash
                        );
                    }
                    currentIndex = Math.floor(currentIndex / 2);
                }
            }

            // Compute Merkle path
            const pathElements: string[] = [];
            const pathIndices: number[] = [];
            currentIndex = leafIndex;
            currentHash = leaves[leafIndex];

            for (let i = 0; i < this.levels; i++) {
                if (currentIndex % 2 === 0) {
                    // Leaf is left child, sibling is right
                    pathIndices.push(0);
                    pathElements.push(
                        subtrees[i][currentIndex + 1] || await this.getZeroHashAt(i)
                    );
                } else {
                    // Leaf is right child, sibling is left
                    pathIndices.push(1);
                    pathElements.push(subtrees[i][currentIndex - 1]);
                }
                currentIndex = Math.floor(currentIndex / 2);
            }

            return { pathElements, pathIndices };
        } catch (error) {
            throw new Error(`Failed to get ${treeType} Merkle path for leaf ${leafIndex}: ${(error as Error).message}`);
        }
    }

    async getMerklePath(treeType: TreeType, leafIndex: number, fromBlock: number | string = 0, toBlock: number | string = "latest"): Promise<MerklePath> {
        try {
            if (!this.levels) {
                await this.initialize();
            }

            const leaves = await this.getLeaves(treeType, fromBlock, toBlock);
            if (leafIndex >= leaves.length) {
                throw new Error("Leaf index out of range");
            }

            // Build tree levels
            let currentLevel = leaves.slice();
            const pathElements: string[] = [];
            const pathIndices: number[] = [];
            let index = leafIndex;

            for (let level = 0; level < this.levels; level++) {
                pathIndices.push(index % 2);
                const siblingIndex = index ^ 1;
                if (siblingIndex < currentLevel.length) {
                    pathElements.push(currentLevel[siblingIndex]);
                } else {
                    pathElements.push(await this.getZeroHashAt(level));
                }
                // Compute parent level
                const parentLevel: string[] = [];
                for (let i = 0; i < currentLevel.length; i += 2) {
                    if (i + 1 < currentLevel.length) {
                        parentLevel.push(await this.hashLeftRight(currentLevel[i], currentLevel[i + 1]));
                    } else {
                        parentLevel.push(await this.hashLeftRight(currentLevel[i], await this.getZeroHashAt(level)));
                    }
                }
                currentLevel = parentLevel;
                index = Math.floor(index / 2);
            }

            return { pathElements, pathIndices };
        } catch (error) {
            throw new Error(`Failed to get ${treeType} Merkle path for leaf ${leafIndex}: ${(error as Error).message}`);
        }
    }

    /**
     * Fetches leaves from LeafInsertedETH or LeafInsertedSOL events
     * @param treeType The tree to query ("ETH" or "SOL")
     * @param fromBlock Starting block number
     * @param toBlock Ending block number
     * @returns Array of leaf hashes
     */
    private async getLeaves(
        treeType: TreeType,
        fromBlock: number | string,
        toBlock: number | string
    ): Promise<string[]> {
        try {
            const filter = treeType === TreeType.ETH
                ? this.contract.filters.LeafInsertedETH()
                : this.contract.filters.LeafInsertedSOL();

            const events = await this.contract.queryFilter(filter, fromBlock, toBlock);

            // Sort events by block number and transaction index to ensure insertion order
            const sortedEvents = events.sort((a, b) => {
                if (a.blockNumber !== b.blockNumber) {
                    return a.blockNumber - b.blockNumber;
                }
                return (a.transactionIndex || 0) - (b.transactionIndex || 0);
            });

            // Extract leaves
            const leaves = sortedEvents.map(event => event.args.leaf);

            return leaves;
        } catch (error) {
            throw new Error(`Failed to fetch ${treeType} leaves: ${(error as Error).message}`);
        }
    }

    /**
     * Retrieves the last Merkle root and the Merkle path for a given leaf index
     * @param treeType The tree to query ("ETH" or "SOL")
     * @param leafIndex The index of the leaf
     * @param fromBlock Starting block number (optional, defaults to 0)
     * @param toBlock Ending block number (optional, defaults to "latest")
     * @returns An object containing the last root and the Merkle path (pathElements and pathIndices)
     */
    async getLastRootAndMerklePath(
        treeType: TreeType,
        leafIndex: number,
        fromBlock: number | string = 0,
        toBlock: number | string = "latest"
    ): Promise<{ root: string; path: MerklePath }> {
        try {
            if (!this.levels) {
                await this.initialize();
            }

            // Fetch the last root from the contract
            const lastRoot = treeType === TreeType.ETH
                ? await this.contract.getLastETHRoot()
                : await this.contract.getLastSOLRoot();

            // Get the Merkle path
            const path = await this.getMerklePath(treeType, leafIndex, fromBlock, toBlock);

            const path1 = await this.getMerklePath1(treeType, leafIndex, fromBlock, toBlock);

            // Reconstruct the root to validate
            const reconstructedRoot = await this.getMerkleRoot(treeType, fromBlock, toBlock);
            if (reconstructedRoot !== lastRoot) {
                throw new Error(
                    `Reconstructed root ${reconstructedRoot} does not match contract's last root ${lastRoot}`
                );
            }

            return {
                root: lastRoot,
                path
            };
        } catch (error) {
            throw new Error(
                `Failed to get ${treeType} last root and Merkle path for leaf ${leafIndex}: ${(error as Error).message}`
            );
        }
    }

    /**
     * Validates the reconstructed root against the contract
     * @param treeType The tree to validate ("ETH" or "SOL")
     * @param root The reconstructed root
     * @returns Whether the root is known to the contract
     */
    async validateRoot(treeType: TreeType, root: string): Promise<boolean> {
        try {
            if (!ethers.isBytesLike(root) || root.length !== 66) {
                throw new Error("Invalid root: must be a 32-byte hash");
            }
            return treeType === TreeType.ETH
                ? await this.contract.isKnownETHRoot(root)
                : await this.contract.isKnownSOLRoot(root);
        } catch (error) {
            throw new Error(`Failed to validate ${treeType} root: ${(error as Error).message}`);
        }
    }
}