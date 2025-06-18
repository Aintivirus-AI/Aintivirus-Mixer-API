// ** import external library
import * as anchor from "@project-serum/anchor"
import { Program, Idl } from "@project-serum/anchor"
import { PublicKey, Keypair, Transaction } from "@solana/web3.js"
import { getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import bs58 from 'bs58'
import { ethers } from 'ethers'

// ** import local libraries
import ZkSolana from "../../../zksnark/ZkSnark-Solana"
import { SolanaSDK } from "../../../sdk"

// ** import local constants
import { MIXER_IDL } from '../../../constant/idl/Mixer'
import { AintivirusMixer as IAintiVirusMixer } from '../anchor-types/AintiVirusMixer'

export default class SolanaAintiVirusMixer {
    privateKey: string
    mint: PublicKey
    connection: anchor.web3.Connection
    signer: Keypair
    program: Program<IAintiVirusMixer>
    provider: anchor.AnchorProvider
    pda = {} as {
        mixStorage: PublicKey
        escrowVault: PublicKey
        escrowVaultForSol: PublicKey
    }

    constructor(rpcUrl: string, privateKey: string, mintKey: string, address: string) {
        this.privateKey = privateKey
        this.connection = new anchor.web3.Connection(rpcUrl, { commitment: "confirmed" })
        this.signer = Keypair.fromSecretKey(bs58.decode(privateKey))
        this.provider = new anchor.AnchorProvider(
            this.connection,
            new anchor.Wallet(this.signer),
            { commitment: "confirmed" }
        )
        this.mint = new PublicKey(mintKey)
        this.program = new Program(
            MIXER_IDL as Idl,
            new PublicKey(address),
            this.provider
        ) as Program<IAintiVirusMixer>

        // Get and initialize PDAs
        const [mixStorage, mixStorageBump] = PublicKey.findProgramAddressSync(
            [],
            new PublicKey(address)
        );

        this.pda.mixStorage = mixStorage

        const [escrowVault,] = PublicKey.findProgramAddressSync(
            [
                Buffer.from("escrow_vault"),
                this.mint.toBuffer(),
            ],
            new PublicKey(address)
        );
        this.pda.escrowVault = escrowVault

        const [escrowVaultForSol] = PublicKey.findProgramAddressSync(
            [Buffer.from("escrow_vault_for_sol")],
            new PublicKey(address)
        );
        this.pda.escrowVaultForSol = escrowVaultForSol
    }

    async populateDepositTransaction(mode: number, amount: number, from: string, commitment: bigint): Promise<Transaction> {
        try {
            const fromAta = await getOrCreateAssociatedTokenAccount(
                this.connection,
                this.signer,
                this.mint,
                new PublicKey(from)
            )

            let decimals = 0

            if (mode == 1 || mode == 3) {
                decimals = 9
            }
            else {
                const sdk = new SolanaSDK(this.privateKey, this.connection.rpcEndpoint)
                decimals = await sdk.getTokenDecimals(this.mint.toBase58())
            }

            return this.program.methods.deposit(
                mode,
                this.splDecimalize(amount, decimals),
                ZkSolana.bigintToU8Array32(commitment)
            ).accounts({
                from,
                fromAta: fromAta.address,
                authority: from,
                tokenProgram: TOKEN_PROGRAM_ID,
                mint: this.mint,
                escrowVault: this.pda.escrowVault,
                escrowVaultForSol: this.pda.escrowVaultForSol,
                mixStorage: this.pda.mixStorage
            }).transaction()
        }
        catch (error) {
            throw error
        }
    }

    async registerEthSolCommitment(commitment: bigint): Promise<string> {
        try {
            const commitmentU8Array = ZkSolana.bigintToU8Array32(commitment)
            const txSig = await this.program.methods.registerEthSolCommitment(commitmentU8Array).accounts({
                authority: this.signer.publicKey,
                signer: this.signer.publicKey,
                mixStorage: this.pda.mixStorage
            }).rpc({ commitment: "confirmed" })

            return txSig
        }
        catch (error) {
            throw error
        }
    }

    async validateCommitment(commitment: bigint): Promise<string> {
        try {
            const commitmentU8Array = ZkSolana.bigintToU8Array32(commitment)
            const txSig = await this.program.methods.validateCommitment(commitmentU8Array).accounts({
                authority: this.signer.publicKey,
                mixStorage: this.pda.mixStorage
            }).rpc({ commitment: "confirmed" })

            return txSig
        }
        catch (error) {
            throw error
        }
    }

    async withdraw(to: string, proof: { pi_a: string[]; pi_b: string[][]; pi_c: string[] }, publicSignals: bigint[]): Promise<string> {
        try {
            const toAta = await getOrCreateAssociatedTokenAccount(
                this.connection,
                this.signer,
                this.mint,
                new PublicKey(to)
            )

            const calldata = await ZkSolana.toSolanaCalldata(proof, publicSignals)
            const txSig = await this.program.methods.withdraw(Buffer.from(calldata)).accounts({
                to,
                toAta: toAta.address,
                authority: this.signer.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                mint: this.mint,
                escrowVault: this.pda.escrowVault,
                escrowVaultForSol: this.pda.escrowVaultForSol,
                mixStorage: this.pda.mixStorage
            }).rpc({ commitment: "confirmed" })

            return txSig
        }
        catch (error) {
            throw error
        }
    }

    splDecimalize = (value: number, decimals: number = 9): anchor.BN => {
        // return new anchor.BN(value).mul(new anchor.BN(10).pow(new anchor.BN(decimals)));
        // return new anchor.BN(Math.floor(value * 10 ** decimals));
        return new anchor.BN(ethers.parseUnits(value.toFixed(3).toString(), decimals).toString())
    }

    deSplDecimalize = (value: anchor.BN, decimals: number = 9) => {
        // return value.div(new anchor.BN(10).pow(new anchor.BN(decimals)));
        return Number(value) / 10 ** decimals;
    }
}