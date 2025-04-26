include "../lib/circomlib/circuits/poseidon.circom";

template Mixer() {
    signal input secret;       // user's secret
    signal input nullifier;    // unique nullifier to prevent reuse
    signal input currency;    // mix currency address
    signal input amount;    // mix currency amount
    signal output commitment;  // public hash: Poseidon(secret, nullifier)

    component hasher = Poseidon(4);
    hasher.inputs[0] <== secret;
    hasher.inputs[1] <== nullifier;
    hasher.inputs[2] <== currency;
    hasher.inputs[3] <== amount;
    commitment <== hasher.out;
}

component main = Mixer();