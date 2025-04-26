circom mixer.circom --r1cs --wasm --sym
snarkjs groth16 setup mixer.r1cs pot12_final.ptau mixer_0000.zkey
snarkjs zkey contribute mixer_0000.zkey mixer_final.zkey --name="cyberstorm"
snarkjs zkey export verificationkey mixer_final.zkey verification_key.json
snarkjs zkey export solidityverifier mixer_final.zkey Verifier.sol
