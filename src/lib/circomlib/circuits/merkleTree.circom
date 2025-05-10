include "./poseidon.circom";

template MerkleTreeChecker(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    signal output debug_hashes[levels + 1];

    signal currentHash;
    currentHash <== leaf;
    debug_hashes[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        component left = Poseidon(2);
        component right = Poseidon(2);

        left.inputs[0] <== currentHash;
        left.inputs[1] <== pathElements[i];

        right.inputs[0] <== pathElements[i];
        right.inputs[1] <== currentHash;

        signal isRight;
        isRight <== pathIndices[i];

        signal leftHash;
        signal rightHash;
        leftHash <== left.out;
        rightHash <== right.out;

        signal selectedHash;
        signal leftSelected;
        signal rightSelected;

        leftSelected <== leftHash * (1 - isRight);
        rightSelected <== rightHash * isRight;

        selectedHash <== leftSelected + rightSelected;

        currentHash <== selectedHash;
        debug_hashes[i + 1] <== selectedHash;
    }

    currentHash === root;
}
