include "../lib/circomlib/circuits/poseidon.circom";
include "../lib/circomlib/circuits/bitify.circom"; // Added for Num2Bits
include "../lib/circomlib/circuits/merkleTree.circom";

template Mixer(levels) {
    // Private inputs
    signal private input secret;
    signal private input nullifier;
    signal private input merklePath[levels];
    signal private input pathIndices[levels];
    signal private input leafIndex;

    // Public inputs
    signal input nullifierHash;
    signal input merkleRoot;
    signal input currency;
    signal input amount;
    signal input recipient;

    // signal output hashes[levels + 1];

    // Compute commitment = Poseidon(nullifier, secret)
    component poseidon1 = Poseidon(4);
    poseidon1.inputs[0] <== nullifier;
    poseidon1.inputs[1] <== secret;
    poseidon1.inputs[2] <== currency;
    poseidon1.inputs[3] <== amount;
    signal commitment;
    commitment <== poseidon1.out;

    // Compute nullifier hash = Poseidon(nullifier, 0)
    component poseidon2 = Poseidon(2);
    poseidon2.inputs[0] <== nullifier;
    poseidon2.inputs[1] <== 0;
    nullifierHash === poseidon2.out;

    // Verify Merkle tree inclusion
    component tree = MerkleTreeChecker(levels);
    tree.leaf <== commitment;
    tree.root <== merkleRoot;

    for (var i = 0; i < levels; i++) {
        tree.pathElements[i] <== merklePath[i];
    }

    Convert leafIndex to bits and assign to tree.pathIndices
    component n2b = Num2Bits(levels);
    n2b.in <== leafIndex;
    for (var i = 0; i < levels; i++) {
        tree.pathIndices[i] <== n2b.out[i];
    }

    for (var i = 0; i < levels; i++) {
        tree.pathIndices[i] <== pathIndices[i];
    }

    for (var i = 0; i <= levels; i++) {
        hashes[i] <== tree.debug_hashes[i];
    }

    // Output public signals
    signal output publicSignals[5];
    publicSignals[0] <== nullifierHash;
    publicSignals[1] <== merkleRoot;
    publicSignals[2] <== currency;
    publicSignals[3] <== amount;
    publicSignals[4] <== recipient;
}

component main = Mixer(20);