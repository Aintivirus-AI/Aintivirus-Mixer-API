// ** import external library
import * as anchor from "@project-serum/anchor"
import { Program, Idl } from "@project-serum/anchor"
import { PublicKey, Keypair, Transaction, ComputeBudgetProgram, sendAndConfirmTransaction } from "@solana/web3.js"
import {
    getOrCreateAssociatedTokenAccount,
    TOKEN_PROGRAM_ID,
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction
} from "@solana/spl-token"
import bs58 from 'bs58'
import { ethers } from 'ethers'

// ** import local libraries
import ZkSolana from "../../../zksnark/ZkSnark-Solana"
import { SolanaSDK } from "../../../sdk"

// ** import local constants
import { MIXER_IDL } from '../../../constant/idl/Mixer'
import { AintivirusMixer as IAintiVirusMixer } from '../anchor-types/AintiVirusMixer'

export default class SolanaAintiVirusMixer {
    private readonly privateKey: string
    private readonly mint: PublicKey
    private readonly connection: anchor.web3.Connection
    private readonly signer: Keypair
    private readonly program: Program<IAintiVirusMixer>
    private readonly provider: anchor.AnchorProvider
    private readonly pda = {} as {
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

            console.log(this.splDecimalize(amount, decimals))

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

    async populateMaintainerSetTransaction(maintainer: string, signer: string): Promise<Transaction> {
        try {
            return this.program.methods.setMaintainer(new PublicKey(maintainer)).accounts({
                authority: signer,
                mixStorage: this.pda.mixStorage
            }).transaction()
        }
        catch (error) {
            throw error
        }
    }

    async populateFeeCollectorSetTransaction(feeCollector: string, signer: string): Promise<Transaction> {
        try {
            // Get associated token account address
            const feeCollectorAta = await getAssociatedTokenAddress(this.mint, new PublicKey(feeCollector));
            // Check if the ATA exists
            const ataAccountInfo = this.connection.getAccountInfo(feeCollectorAta)

            // Prepare transaction
            const transaction = new Transaction()

            if (!ataAccountInfo) {
                const createAtaIx = createAssociatedTokenAccountInstruction(
                    new PublicKey(signer),  // payer
                    feeCollectorAta,        // ata to be created
                    new PublicKey(feeCollector),         // owner of ATA
                    this.mint               // token mint
                );
                transaction.add(createAtaIx);
            }

            const setFeeCollectorTx = await this.program.methods.setFeeCollector(
                new PublicKey(feeCollector),
                feeCollectorAta
            ).accounts({
                authority: signer,
                mixStorage: this.pda.mixStorage
            }).transaction()

            transaction.add(setFeeCollectorTx)

            return transaction
        }
        catch (error) {
            throw error
        }
    }

    async populateRefundSetTransaction(refund: number, signer: string): Promise<Transaction> {
        try {
            return this.program.methods.setRefund(this.splDecimalize(refund)).accounts({
                authority: signer,
                mixStorage: this.pda.mixStorage
            }).transaction()
        }
        catch (error) {
            throw error
        }
    }

    async populateFeeSetTransaction(fee: number, signer: string): Promise<Transaction> {
        try {
            const sdk = new SolanaSDK(this.privateKey, this.connection.rpcEndpoint)
            const decimals = await sdk.getTokenDecimals(this.mint.toBase58())

            return this.program.methods.setFee(this.splDecimalize(fee, decimals)).accounts({
                authority: signer,
                mixStorage: this.pda.mixStorage
            }).transaction()
        }
        catch (error) {
            throw error
        }
    }

    async populateMinSolDepositAmountSetTransaction(minAmount: number, signer: string): Promise<Transaction> {
        try {
            return this.program.methods.setMinSolDeposit(this.splDecimalize(minAmount)).accounts({
                authority: signer,
                mixStorage: this.pda.mixStorage
            }).transaction()
        }
        catch (error) {
            throw error
        }
    }

    async populateMinTokenDepositAmountSetTransaction(minAmount: number, signer: string): Promise<Transaction> {
        try {
            const sdk = new SolanaSDK(this.privateKey, this.connection.rpcEndpoint)
            const decimals = await sdk.getTokenDecimals(this.mint.toBase58())

            return this.program.methods.setMinTokenDeposit(this.splDecimalize(minAmount, decimals)).accounts({
                authority: signer,
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

            const mixStorageData = (await this.program.account.mixStorage.all())[0].account
            const calldata = await ZkSolana.toSolanaCalldata(proof, publicSignals)
            // Build the Anchor instruction manually
            const ix = await this.program.methods.withdraw(Buffer.from(calldata)).accounts({
                to,
                toAta: toAta.address,
                authority: this.signer.publicKey,
                tokenProgram: TOKEN_PROGRAM_ID,
                mint: this.mint,
                escrowVault: this.pda.escrowVault,
                escrowVaultForSol: this.pda.escrowVaultForSol,
                mixStorage: this.pda.mixStorage,
                feeCollector: mixStorageData.feeCollector,
                feeCollectorAta: mixStorageData.feeCollectorAta
            }).instruction()

            // Create compute budget instructions
            const computeLimitIx = ComputeBudgetProgram.setComputeUnitLimit({
                units: 1_400_000, // Max allowed per Solana
            });

            const computePriceIx = ComputeBudgetProgram.setComputeUnitPrice({
                microLamports: 1, // Optional, you can omit this if not prioritizing
            });

            // Build transaction
            const tx = new Transaction();
            tx.add(computePriceIx);
            tx.add(computeLimitIx);
            tx.add(ix);

            // Send transaction
            const txSig = await sendAndConfirmTransaction(
                this.connection,
                tx,
                [this.signer],
                { commitment: "confirmed" }
            )

            return txSig
        }
        catch (error) {
            throw error
        }
    }

    async getProgramSolBalance(): Promise<number> {
        try {
            const balance = await this.connection.getBalance(this.pda.escrowVaultForSol)
            return balance
        }
        catch (error) {
            throw error
        }
    }

    async getProgramTokenBalance(): Promise<anchor.web3.RpcResponseAndContext<anchor.web3.TokenAmount>> {
        try {
            const balance = await this.connection.getTokenAccountBalance(this.pda.escrowVault)
            console.log(this.pda.escrowVault)
            return balance
        }
        catch (error) {
            throw error
        }
    }

    async getMixStorageData(): Promise<{
        maintainer: PublicKey,
        feeCollector: PublicKey,
        refund: number,
        fee: number,
        minSolDepositAmount: number,
        minTokenDepositAmount: number
    }> {
        try {
            const sdk = new SolanaSDK(this.privateKey, this.connection.rpcEndpoint)
            const decimals = await sdk.getTokenDecimals(this.mint.toBase58())

            const mixStorageData = (await this.program.account.mixStorage.all())[0].account
            return {
                maintainer: mixStorageData.maintainer,
                feeCollector: mixStorageData.feeCollector,
                refund: this.deSplDecimalize(mixStorageData.refund),
                fee: this.deSplDecimalize(mixStorageData.fee, decimals),
                minSolDepositAmount: this.deSplDecimalize(mixStorageData.minSolDeposit),
                minTokenDepositAmount: this.deSplDecimalize(mixStorageData.minTokenDeposit, decimals)
            }
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