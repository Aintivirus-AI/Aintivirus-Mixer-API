// ** import external libraries
import fs from 'fs'
import * as snarkjs from 'snarkjs'
import crypto from 'crypto'
import { ethers } from 'ethers'
import base58 from 'bs58'

export default class ZkSnark {
    static async createZkProof(currency: string, amount: BigInt | number | string) {
        try {

            const wasmPath = "./src/zksnark/mixer.wasm";
            const zkeyPath = "./src/zksnark/mixer_final.zkey";

            const secret = BigInt("0x" + crypto.randomBytes(31).toString("hex"));
            const nullifier = BigInt("0x" + crypto.randomBytes(31).toString("hex"));

            const input = {
                secret: secret.toString(),
                nullifier: nullifier.toString(),
                currency: BigInt(ethers.hexlify(ethers.getAddress(currency))),
                amount: amount.toString()
            };

            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
                input,
                wasmPath,
                zkeyPath
            );

            const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
            const argv = JSON.parse("[" + calldata + "]");

            const a = argv[0];
            const b = argv[1];
            const c = argv[2];
            const psInput = argv[3];

            // const commitment = publicSignals[0];
            // const hashedCommitment = ethers.keccak256(ethers.solidityPacked(["uint256"], [commitment]))
            const nullifierHash = ethers.keccak256(ethers.solidityPacked(["uint256"], [input.nullifier]))
            // const keystring = JSON.stringify({ proof, publicSignals, nullifier: input.nullifier });

            // return base58.encode(Buffer.from(keystring))
            return { proof, publicSignals, nullifier: input.nullifier, nullifierHash, calldata: { a, b, c, psInput } }
        }
        catch (error) {
            throw error
        }
    }

    static async offchainVerify(zkData: any) {
        try {
            const { proof, publicSignals, nullifier } = zkData
            const vKey = JSON.parse(fs.readFileSync("./src/zksnark/verification_key.json").toString());
            const valid = await snarkjs.groth16.verify(vKey, publicSignals, proof);

            return valid
        } catch (error) {
            console.error(error)
            return false
        }
    }
}