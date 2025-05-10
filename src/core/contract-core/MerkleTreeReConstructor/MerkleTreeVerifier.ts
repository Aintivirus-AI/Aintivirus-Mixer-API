import { poseidon2 } from "poseidon-lite";

type MerklePath = {
  pathElements: string[];
  pathIndices: number[];
};

export default class MerkleTreeVerifier {
  private levels: number;

  constructor(levels: number) {
    this.levels = levels;
  }

  // Function to compute hash of two elements using Poseidon hash
  private async hashLeftRight(left: string, right: string): Promise<string> {
    const poseidonHash = await poseidon2([left, right]);
    return poseidonHash.toString();
  }

  // Function to verify Merkle tree proof
  public async verifyMerkleProof(
    leaf: string,
    root: string,
    merklePath: MerklePath
  ): Promise<boolean> {
    let currentHash = leaf;
    const { pathElements, pathIndices } = merklePath;

    // Iterate through the path elements and check if they match
    for (let i = 0; i < this.levels; i++) {
      const pathElement = pathElements[i];
      const pathIndex = pathIndices[i];

      // console.log(`Level ${i + 1}:`);
      // console.log(`Current Hash: ${BigInt(currentHash)}`);
      // console.log(`Path Element: ${BigInt(pathElement)}`);
      // console.log(`Path Index: ${pathIndex}`);

      if (pathIndex === 0) {
        // If pathIndex is 0, the pathElement is the right sibling
        currentHash = await this.hashLeftRight(currentHash, pathElement);
      } else if (pathIndex === 1) {
        // If pathIndex is 1, the pathElement is the left sibling
        currentHash = await this.hashLeftRight(pathElement, currentHash);
      } else {
        throw new Error("Invalid path index");
      }

      // console.log(`Updated Hash: ${BigInt(currentHash)}`);
    }

    // After processing all levels, currentHash should match the root
    // console.log(`Final Hash: ${BigInt(currentHash)}`);
    // console.log(`Expected Root: ${BigInt(root)}`);
    return currentHash === root;
  }
}
