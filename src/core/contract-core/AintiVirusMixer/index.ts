import { ContractTransaction, ethers } from "ethers";
import { AintiVirusMixer as IAintiVirusMixer } from "../typechain-types"; // Adjust import path as necessary
import { MIXER_ABI } from "../../../constant/abi/Mixer"; // Adjust import path as necessary

// Enum for Solana nullifier status
export enum SolNullifierStatus {
    UNINITIATED = 0,
    VERIFYING = 1,
    CONFIRMED = 2 // Note: Matches contract's spelling "COMFIRMED"
}

// Enum for Ethereum nullifier status
export enum EthNullifierStatus {
    UNINITIATED = 0,
    CONFIRMED = 1
}

// Interface for DepositProof struct
export interface DepositProof {
    pA: [string, string];
    pB: [[string, string], [string, string]];
    pC: [string, string];
    pubSignals: [string, string, string, string, string];
}

// Interface for WithdrawalProof struct
export interface WithdrawalProof {
    pA: [string, string];
    pB: [[string, string], [string, string]];
    pC: [string, string];
    pubSignals: [string, string, string, string, string, string, string, string, string, string];
}

export default class AintiVirusMixer {
    private readonly provider: ethers.JsonRpcProvider;
    private readonly wallet: ethers.Wallet;
    private readonly contractAddress: string;
    private contract: IAintiVirusMixer;

    constructor(address: string, rpcUrl: string, privateKey: string) {
        try {
            this.provider = new ethers.JsonRpcProvider(rpcUrl);
            this.wallet = new ethers.Wallet(privateKey, this.provider);
            this.contractAddress = address;
            this.contract = new ethers.Contract(
                this.contractAddress,
                MIXER_ABI,
                this.wallet
            ) as unknown as IAintiVirusMixer;
        } catch (error) {
            throw new Error(`Failed to initialize AintiVirusMixer: ${(error as Error).message}`);
        }
    }

    // === Constants and Immutable Variables ===

    /**
     * Gets the FIELD_SIZE constant
     * @returns The BN254 field size
     */
    async getFieldSize(): Promise<bigint> {
        try {
            const fieldSize = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
            return fieldSize;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the ZERO_VALUE constant
     * @returns The zero value for empty leaves
     */
    async getZeroValue(): Promise<bigint> {
        try {
            const zeroValue = BigInt("9843416945950214527845121167110536396734923501368431511777016063417998984121");
            return zeroValue;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the TREE_DEPTH constant
     * @returns The maximum Merkle tree depth (31)
     */
    async getTreeDepth(): Promise<number> {
        try {
            const treeDepth = 31;
            return treeDepth;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the ROOT_HISTORY_SIZE constant
     * @returns The size of root history (30)
     */
    async getRootHistorySize(): Promise<number> {
        try {
            const rootHistorySize = 30;
            return rootHistorySize;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the OPERATOR_ROLE constant
     * @returns The keccak256 hash of "OPERATOR_ROLE"
     */
    async getOperatorRole(): Promise<string> {
        try {
            const operatorRole = await this.contract.OPERATOR_ROLE();
            return operatorRole;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the hasher contract address
     * @returns The Poseidon hasher contract address
     */
    async getHasher(): Promise<string> {
        try {
            const hasher = await this.contract.hasher();
            return hasher;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the number of tree levels
     * @returns The number of levels in the Merkle tree
     */
    async getLevels(): Promise<number> {
        try {
            const levels = Number(await this.contract.levels());
            return levels;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the withdrawal verifier address
     * @returns The withdrawal verifier contract address
     */
    async getVerifier(): Promise<string> {
        try {
            const verifier = await this.contract.verifier();
            return verifier;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the deposit verifier address
     * @returns The deposit verifier contract address
     */
    async getDepositVerifier(): Promise<string> {
        try {
            const depositVerifier = await this.contract.depositVerifier();
            return depositVerifier;
        } catch (error) {
            throw error;
        }
    }

    // === State Variables ===

    /**
     * Gets the ETH subtree hash at a specific level
     * @param level The tree level
     * @returns The subtree hash
     */
    async getFilledSubtreeETH(level: number): Promise<string> {
        try {
            const subtreeHash = await this.contract.filledSubtreesETH(level);
            return subtreeHash;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the ETH root at a specific index
     * @param index The root history index
     * @returns The root hash
     */
    async getRootETH(index: number): Promise<string> {
        try {
            const rootHash = await this.contract.rootsETH(index);
            return rootHash;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the current ETH root history index
     * @returns The current root index
     */
    async getCurrentRootIndexETH(): Promise<number> {
        try {
            const rootIndex = Number(await this.contract.currentRootIndexETH());
            return rootIndex;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the next ETH leaf index
     * @returns The next leaf index
     */
    async getNextIndexETH(): Promise<number> {
        try {
            const nextIndex = Number(await this.contract.nextIndexETH());
            return nextIndex;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the SOL subtree hash at a specific level
     * @param level The tree level
     * @returns The subtree hash
     */
    async getFilledSubtreeSOL(level: number): Promise<string> {
        try {
            const subtreeHash = await this.contract.filledSubtreesSOL(level);
            return subtreeHash;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the SOL root at a specific index
     * @param index The root history index
     * @returns The root hash
     */
    async getRootSOL(index: number): Promise<string> {
        try {
            const rootHash = await this.contract.rootsSOL(index);
            return rootHash;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the current SOL root history index
     * @returns The current root index
     */
    async getCurrentRootIndexSOL(): Promise<number> {
        try {
            const rootIndex = Number(await this.contract.currentRootIndexSOL());
            return rootIndex;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the next SOL leaf index
     * @returns The next leaf index
     */
    async getNextIndexSOL(): Promise<number> {
        try {
            const nextIndex = Number(await this.contract.nextIndexSOL());
            return nextIndex;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Checks if an ETH commitment is known
     * @param commitment The commitment hash
     * @returns Whether the commitment is known
     */
    async isEthCommitmentKnown(commitment: string): Promise<boolean> {
        try {
            const isKnown = await this.contract.ethKnownCommitments(commitment);
            return isKnown;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Checks if a SOL commitment is known
     * @param commitment The commitment hash
     * @returns Whether the commitment is known
     */
    async isSolCommitmentKnown(commitment: string): Promise<boolean> {
        try {
            const isKnown = await this.contract.solKnownCommitments(commitment);
            return isKnown;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Checks if an ETH nullifier has been used
     * @param nullifierHash The nullifier hash
     * @returns The status of the nullifier (UNINITIATED or CONFIRMED)
     */
    async getEthNullifierStatus(nullifierHash: string): Promise<EthNullifierStatus> {
        try {
            const status = await this.contract.ethUsedNullifiers(nullifierHash);
            return status as unknown as EthNullifierStatus;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the status of a SOL nullifier
     * @param nullifierHash The nullifier hash
     * @returns The nullifier status (UNINITIATED, VERIFYING, CONFIRMED)
     */
    async getSolNullifierStatus(nullifierHash: string): Promise<SolNullifierStatus> {
        try {
            const status = await this.contract.solUsedNullifiers(nullifierHash);
            return status as unknown as SolNullifierStatus;
        } catch (error) {
            throw error;
        }
    }

    // === Merkle Tree Functions ===

    /**
     * Checks if a root is known in the ETH Merkle tree
     * @param root The Merkle root
     * @returns Whether the root is known
     */
    async isKnownETHRoot(root: string): Promise<boolean> {
        try {
            const isKnown = await this.contract.isKnownETHRoot(root);
            return isKnown;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Checks if a root is known in the SOL Merkle tree
     * @param root The Merkle root
     * @returns Whether the root is known
     */
    async isKnownSOLRoot(root: string): Promise<boolean> {
        try {
            const isKnown = await this.contract.isKnownSOLRoot(root);
            return isKnown;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the most recent ETH Merkle root
     * @returns The latest ETH Merkle root
     */
    async getLastETHRoot(): Promise<string> {
        try {
            const lastRoot = await this.contract.getLastETHRoot();
            return lastRoot;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the most recent SOL Merkle root
     * @returns The latest SOL Merkle root
     */
    async getLastSOLRoot(): Promise<string> {
        try {
            const lastRoot = await this.contract.getLastSOLRoot();
            return lastRoot;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Computes the Merkle path indices for a given leaf index
     * @param index The leaf index
     * @returns Array of 0s and 1s indicating left (0) or right (1) siblings
     */
    async computePathIndices(index: ethers.BigNumberish): Promise<number[]> {
        try {
            const treeHeight = await this.getLevels();
            const pathIndices: number[] = new Array(treeHeight).fill(0);
            let currentIndex = Number(index);
            for (let level = 0; level < treeHeight; level++) {
                pathIndices[level] = currentIndex % 2; // 0 for left, 1 for right
                currentIndex = Math.floor(currentIndex / 2);
            }
            return pathIndices;
        } catch (error) {
            throw error;
        }
    }

    /**
 * Retrieves the leaf index for a Solana commitment by querying DepositForSolWithdrawal events
 * @param commitment The commitment hash to search for
 * @param fromBlock The starting block number for the query (optional, defaults to 0)
 * @param toBlock The ending block number for the query (optional, defaults to "latest")
 * @returns The leaf index if found, null if no event is found, or throws if multiple events are found
 */
    async getSolLeafIndexByCommitment(
        commitment: string,
        fromBlock: number | string = 0,
        toBlock: number | string = "latest"
    ): Promise<number | null> {
        try {
            // Ensure commitment is a valid bytes32 hash
            if (!ethers.isBytesLike(commitment) || commitment.length !== 66) {
                throw new Error("Invalid commitment: must be a 32-byte hash");
            }

            // Create event filter for DepositForSolWithdrawal
            const filter = this.contract.filters.DepositForSolWithdrawal(commitment);

            // Query events
            const events = await this.contract.queryFilter(filter, fromBlock, toBlock);

            // Handle results
            if (events.length === 0) {
                return null; // No event found
            }
            if (events.length > 1) {
                throw new Error(`Multiple DepositForSolWithdrawal events found for commitment ${commitment}`);
            }

            // Extract leafIndex from event
            const event = events[0];
            const leafIndex = Number(event.args.leafIndex);

            return leafIndex;
        } catch (error) {
            throw new Error(`Failed to get SOL leaf index for commitment ${commitment}: ${(error as Error).message}`);
        }
    }

    /**
     * Retrieves the leaf index for an Ethereum commitment by querying CommitmentAddedForEthWithdrawal events
     * @param commitment The commitment hash to search for
     * @param fromBlock The starting block number for the query (optional, defaults to 0)
     * @param toBlock The ending block number for the query (optional, defaults to "latest")
     * @returns The leaf index if found, null if no event is found, or throws if multiple events are found
     */
    async getEthLeafIndexByCommitment(
        commitment: string,
        fromBlock: number | string = 0,
        toBlock: number | string = "latest"
    ): Promise<number | null> {
        try {
            // Ensure commitment is a valid bytes32 hash
            if (!ethers.isBytesLike(commitment) || commitment.length !== 66) {
                throw new Error("Invalid commitment: must be a 32-byte hash");
            }

            // Create event filter for CommitmentAddedForEthWithdrawal
            const filter = this.contract.filters.CommitmentAddedForEthWithdrawal(commitment);

            // Query events
            const events = await this.contract.queryFilter(filter, fromBlock, toBlock);

            // Handle results
            if (events.length === 0) {
                return null; // No event found
            }
            if (events.length > 1) {
                throw new Error(`Multiple CommitmentAddedForEthWithdrawal events found for commitment ${commitment}`);
            }

            // Extract leafIndex from event
            const event = events[0];
            const leafIndex = Number(event.args.leafIndex);

            return leafIndex;
        } catch (error) {
            throw new Error(`Failed to get ETH leaf index for commitment ${commitment}: ${(error as Error).message}`);
        }
    }

    // === State-Modifying Functions ===

    /**
     * Deposits funds into the contract for Solana withdrawal
     * @param currency Address of the ERC20 token (or zero address for ETH)
     * @param amount Amount to deposit
     * @param commitment Commitment hash
     * @param proof Deposit proof struct
     * @returns Transaction response
     */
    async deposit(
        currency: string,
        amount: ethers.BigNumberish,
        commitment: string,
        proof: DepositProof
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const isEth = currency === ethers.ZeroAddress;
            const value = isEth ? amount.toString() : "0";
            const tx = await this.contract.deposit(currency, amount, commitment, proof, { value });
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Adds a commitment for Ethereum withdrawal (operator only)
     * @param commitment Commitment hash
     * @returns Transaction response
     */
    async addCommitmentForEthWithdrawal(
        commitment: string
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const tx = await this.contract.addCommitmentForEthWithdrawal(commitment);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Withdraws funds from the Ethereum Merkle tree
     * @param root Merkle root
     * @param proof Withdrawal proof struct
     * @returns Transaction response
     */
    async withdraw(
        root: string,
        proof: WithdrawalProof
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const tx = await this.contract.withdraw(root, proof);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Verifies a Solana withdrawal proof
     * @param root Merkle root
     * @param proof Withdrawal proof struct
     * @returns Transaction response
     */
    async verifySolWithdrawal(
        root: string,
        proof: WithdrawalProof
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const tx = await this.contract.verifySolWithdrawal(root, proof);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Sets a nullifier for Solana withdrawal (operator only)
     * @param nullifierHash Nullifier hash
     * @returns Transaction response
     */
    async setNullifierForSolWithdrawal(
        nullifierHash: string
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const tx = await this.contract.setNullifierForSolWithdrawal(nullifierHash);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Reverts a nullifier for Solana withdrawal (operator only)
     * @param nullifierHash Nullifier hash
     * @returns Transaction response
     */
    async revertNullifierForSolWithdrawal(
        nullifierHash: string
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const tx = await this.contract.revertNullifierForSolWithdrawal(nullifierHash);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    // === Access Control Functions ===

    /**
     * Grants a role to an account (admin only)
     * @param role Role hash
     * @param account Account address
     * @returns Transaction response
     */
    async grantRole(
        role: string,
        account: string
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const tx = await this.contract.grantRole(role, account);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Revokes a role from an account (admin only)
     * @param role Role hash
     * @param account Account address
     * @returns Transaction response
     */
    async revokeRole(
        role: string,
        account: string
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const tx = await this.contract.revokeRole(role, account);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Renounces a role for the caller (self only)
     * @param role Role hash
     * @returns Transaction response
     */
    async renounceRole(
        role: string
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const tx = await this.contract.renounceRole(role, this.wallet.address);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Checks if an account has a specific role
     * @param role Role hash
     * @param account Account address
     * @returns Whether the account has the role
     */
    async hasRole(role: string, account: string): Promise<boolean> {
        try {
            const hasRole = await this.contract.hasRole(role, account);
            return hasRole;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the admin role for a given role
     * @param role Role hash
     * @returns Admin role hash
     */
    async getRoleAdmin(role: string): Promise<string> {
        try {
            const roleAdmin = await this.contract.getRoleAdmin(role);
            return roleAdmin;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the DEFAULT_ADMIN_ROLE constant
     * @returns The keccak256 hash of DEFAULT_ADMIN_ROLE (0x00)
     */
    async getDefaultAdminRole(): Promise<string> {
        try {
            const defaultAdminRole = ethers.ZeroAddress; // DEFAULT_ADMIN_ROLE is 0x00 in AccessControl
            return defaultAdminRole;
        } catch (error) {
            throw error;
        }
    }

    // === Raw Transaction Builders ===

    /**
     * Builds a raw transaction for depositing funds
     * @param currency Address of the ERC20 token (or zero address for ETH)
     * @param amount Amount to deposit
     * @param commitment Commitment hash
     * @param proof Deposit proof struct
     * @returns Transaction request
     */
    async populateTransactionDeposit(
        currency: string,
        amount: ethers.BigNumberish,
        commitment: string,
        proof: DepositProof
    ): Promise<ethers.ContractTransaction> {
        try {
            const isEth = currency === ethers.ZeroAddress;
            const value = isEth ? amount.toString() : "0";
            const tx = await this.contract.deposit.populateTransaction(currency, amount, commitment, proof, { value });
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Builds a raw transaction for adding a commitment for Ethereum withdrawal
     * @param commitment Commitment hash
     * @returns Transaction request
     */
    async populateTransactionAddCommitmentForEthWithdrawal(
        commitment: string
    ): Promise<ethers.ContractTransaction> {
        try {
            const tx = await this.contract.addCommitmentForEthWithdrawal.populateTransaction(commitment);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Builds a raw transaction for withdrawing funds
     * @param root Merkle root
     * @param proof Withdrawal proof struct
     * @returns Transaction request
     */
    async populateTransactionWithdraw(
        root: string,
        proof: WithdrawalProof
    ): Promise<ethers.ContractTransaction> {
        try {
            const tx = await this.contract.withdraw.populateTransaction(root, proof);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Builds a raw transaction for verifying a Solana withdrawal
     * @param root Merkle root
     * @param proof Withdrawal proof struct
     * @returns Transaction request
     */
    async populateTransactionVerifySolWithdrawal(
        root: string,
        proof: WithdrawalProof
    ): Promise<ethers.ContractTransaction> {
        try {
            const tx = await this.contract.verifySolWithdrawal.populateTransaction(root, proof);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Builds a raw transaction for setting a nullifier for Solana withdrawal
     * @param nullifierHash Nullifier hash
     * @returns Transaction request
     */
    async populateTransactionSetNullifierForSolWithdrawal(
        nullifierHash: string
    ): Promise<ethers.ContractTransaction> {
        try {
            const tx = await this.contract.setNullifierForSolWithdrawal.populateTransaction(nullifierHash);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Builds a raw transaction for reverting a nullifier for Solana withdrawal
     * @param nullifierHash Nullifier hash
     * @returns Transaction request
     */
    async populateTransactionRevertNullifierForSolWithdrawal(
        nullifierHash: string
    ): Promise<ethers.ContractTransaction> {
        try {
            const tx = await this.contract.revertNullifierForSolWithdrawal.populateTransaction(nullifierHash);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Builds a raw transaction for granting a role
     * @param role Role hash
     * @param account Account address
     * @returns Transaction request
     */
    async populateTransactionGrantRole(
        role: string,
        account: string
    ): Promise<ethers.ContractTransaction> {
        try {
            const tx = await this.contract.grantRole.populateTransaction(role, account);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Builds a raw transaction for revoking a role
     * @param role Role hash
     * @param account Account address
     * @returns Transaction request
     */
    async populateTransactionRevokeRole(
        role: string,
        account: string
    ): Promise<ethers.ContractTransaction> {
        try {
            const tx = await this.contract.revokeRole.populateTransaction(role, account);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Builds a raw transaction for renouncing a role
     * @param role Role hash
     * @returns Transaction request
     */
    async populateTransactionRenounceRole(
        role: string
    ): Promise<ethers.ContractTransaction> {
        try {
            const tx = await this.contract.renounceRole.populateTransaction(role, this.wallet.address);
            return tx;
        } catch (error) {
            throw error;
        }
    }
}