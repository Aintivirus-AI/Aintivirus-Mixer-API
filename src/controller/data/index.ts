// ** import external libraries
import { Connection, PublicKey, sendAndConfirmRawTransaction, sendAndConfirmTransaction } from "@solana/web3.js"
import { getMint } from "@solana/spl-token"
import { poseidon2 } from "poseidon-lite"
// ** import custom libraries
import { SolanaSDK } from "../../sdk"
import { CryptoUtil } from "../../utils"
import { EnvManager } from "../../helper"
// ** import custom type
import { ResponsePayload, RequestPayload } from "../../types"

class DataController {
    /**
     * 
     * @param {RequestPayload} payload 
     * @returns {ResponsePayload}
     */
    static checkResponse = (payload: RequestPayload): ResponsePayload => {
        try {
            return { data: payload }
        }
        catch(error) {
            throw error
        }
    }

    /**
     * 
     * @param {RequestPayload} payload 
     * @returns {ResponsePayload}
     */
    static zeroHashes = (payload: RequestPayload): ResponsePayload => {
        try {
            const { tree_depth, zero_value } = payload
            const treeDepth: number = tree_depth ? tree_depth : 31
            const zeroValue: number = zero_value ? zero_value : 9843416945950214527845121167110536396734923501368431511777016063417998984121

            const hashes: Array<string> = [
                CryptoUtil.bigIntToBytes32(BigInt(zeroValue))
            ]

            let currentHash = BigInt(zeroValue)

            for (let i = 0; i < treeDepth; i++) {
                currentHash = poseidon2([currentHash, currentHash])
                hashes.push(CryptoUtil.bigIntToBytes32(currentHash))
            }

            return { data: hashes }
        }
        catch(error) {
            throw error
        }
    }

    /**
     * 
     * @returns {String}
     */
    static totalSupply = async (): Promise<number> => {
        try {
            const rpcUrl = await EnvManager.readEnvValues("SOLANA_RPC_URL")
            const connection = new Connection(rpcUrl)
            const mint = new PublicKey(`BAezfVmia8UYLt4rst6PCU4dvL2i2qHzqn4wGhytpNJW`)
            const mintInfo = await getMint(connection, mint)

            const totalSupply = await SolanaSDK.deSplDecimalize(mintInfo.supply, mintInfo.decimals)

            return totalSupply
        }
        catch(error) {
            console.error(error)
            throw error
        }
    }

    /**
     * 
     * @returns {ResponsePayload}
     */
    static getLatestBlock = async (): Promise<ResponsePayload> => {
        try {
            const rpcUrl = await EnvManager.readEnvValues("SOLANA_RPC_URL")
            const connection = new Connection(rpcUrl)
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed")
        
            return {
                data: {
                    blockhash,
                    lastValidBlockHeight
                }
            }
        }
        catch(error) {
            throw error
        }
    }

    /**
     * 
     * @param {RequestPayload} payload 
     * @returns {ResponsePayload}
     */
    static sendTransaction = async (payload: RequestPayload): Promise<ResponsePayload> => {
        try {
            const { transaction } = payload

            console.log(transaction)

            const rpcUrl = await EnvManager.readEnvValues("SOLANA_RPC_URL")
            const connection = new Connection(rpcUrl)

            const txSig = await sendAndConfirmRawTransaction(connection, transaction, {
                skipPreflight: false,
                preflightCommitment: "confirmed"
            })
            
            return {
                data: {
                    txSig
                }
            }
        }
        catch(error) {
            console.error(error)
            throw error
        }
    }
}

export default DataController