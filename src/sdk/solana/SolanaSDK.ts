// solana-transfer.ts
import { BN } from '@project-serum/anchor';
import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    Transaction,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
    createTransferInstruction,
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
    getMint,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    getAccount
} from '@solana/spl-token';
import bs58 from 'bs58';

export default class SolanaSDK {
    private connection: Connection;
    private payer: Keypair;

    constructor(privateKey: string, rpcUrl: string) {
        this.connection = new Connection(rpcUrl, 'confirmed');
        this.payer = Keypair.fromSecretKey(bs58.decode(privateKey));
    }

    splDecimalize = (value: number, decimals: number = 9): BN => {
        // return new BN(value).mul(new BN(10).pow(new BN(decimals)))
        return BigInt(Math.floor(value * 10 ** decimals));
    }

    deSplDecimalize = (value: BN, decimals: number = 9) => {
        // return value.div(new BN(10 ** decimals)).toNumber() + value.mod(new BN(10 ** decimals)).toNumber() / (10 ** decimals);
        return Number(value) / 10 ** decimals;
    }

    async sendSol(destination: string, amountSol: number): Promise<string> {
        try {
            const recipient = new PublicKey(destination);
            const lamports = this.splDecimalize(amountSol);

            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: this.payer.publicKey,
                    toPubkey: recipient,
                    lamports,
                })
            );

            const signature = await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [this.payer]
            );

            return signature;
        }
        catch (error) {
            throw error
        }
    }

    async sendSPLToken(
        mintAddress: string,
        recipientAddress: string,
        amount: number,
    ): Promise<string> {
        try {
            const mint = new PublicKey(mintAddress);
            const recipient = new PublicKey(recipientAddress);

            // Fetch mint info to get decimals
            const mintInfo = await getMint(this.connection, mint);
            const decimals = mintInfo.decimals;

            const fromTokenAccount = await getAssociatedTokenAddress(mint, this.payer.publicKey);
            const toTokenAccount = await getAssociatedTokenAddress(mint, recipient);

            const amountInSmallestUnit = this.splDecimalize(amount, decimals);

            const transaction = new Transaction();

            // Check if recipient's associated token account exists, if not create it
            try {
                await getAccount(this.connection, toTokenAccount);
            } catch (error) {
                // If account doesn't exist, create it
                transaction.add(
                    createAssociatedTokenAccountInstruction(
                        this.payer.publicKey, // payer
                        toTokenAccount,        // associated token account
                        recipient,             // token account owner
                        mint,                  // token mint
                        TOKEN_PROGRAM_ID,
                        ASSOCIATED_TOKEN_PROGRAM_ID
                    )
                );
            }

            // Transfer tokens
            transaction.add(
                createTransferInstruction(
                    fromTokenAccount,
                    toTokenAccount,
                    this.payer.publicKey,
                    amountInSmallestUnit,
                    [],
                    TOKEN_PROGRAM_ID
                )
            );

            const signature = await sendAndConfirmTransaction(
                this.connection,
                transaction,
                [this.payer]
            );

            return signature;
        }
        catch (error) {
            throw error
        }
    }

    async buildSendSOLTransaction(recipientAddress: string, amountSOL: number, payer: string): Promise<Transaction> {
        try {
            const recipient = new PublicKey(recipientAddress);
            const transaction = new Transaction().add(
                SystemProgram.transfer({
                    fromPubkey: new PublicKey(payer),
                    toPubkey: recipient,
                    lamports: this.splDecimalize(amountSOL, 9),
                })
            );
            return transaction;
        }
        catch (error) {
            throw error
        }
    }

    async buildSendSPLTransaction(
        mintAddress: string,
        recipientAddress: string,
        amount: number,
        payer: string
    ): Promise<Transaction> {
        try {
            const mint = new PublicKey(mintAddress);
            const recipient = new PublicKey(recipientAddress);

            const mintInfo = await getMint(this.connection, mint);
            const decimals = mintInfo.decimals;

            // const fromTokenAccount = await getAssociatedTokenAddress(mint, this.payer.publicKey);
            const fromTokenAccount = await getAssociatedTokenAddress(mint, new PublicKey(payer));
            const toTokenAccount = await getAssociatedTokenAddress(mint, recipient);

            const amountInSmallestUnit = this.splDecimalize(amount, decimals);

            const transaction = new Transaction();

            // Ensure recipient token account exists or create instruction
            try {
                await getAccount(this.connection, toTokenAccount);
            } catch (e) {
                transaction.add(
                    createAssociatedTokenAccountInstruction(
                        new PublicKey(payer),
                        toTokenAccount,
                        recipient,
                        mint,
                        TOKEN_PROGRAM_ID,
                        ASSOCIATED_TOKEN_PROGRAM_ID
                    )
                );
            }

            // Add transfer instruction
            transaction.add(
                createTransferInstruction(
                    fromTokenAccount,
                    toTokenAccount,
                    new PublicKey(payer),
                    amountInSmallestUnit,
                    [],
                    TOKEN_PROGRAM_ID
                )
            );

            return transaction;
        }
        catch (error) {
            throw error
        }
    }

    getPublicKey(): string {
        return this.payer.publicKey.toBase58();
    }

    async getTokenDecimals(mint: string): Promise<number> {
        try {
            const accountInfo = await this.connection.getParsedAccountInfo(new PublicKey(mint));
            const data = accountInfo.value?.data;
    
            if (
                data &&
                typeof data === "object" &&
                "parsed" in data &&
                data.parsed?.info?.decimals !== undefined
            ) {
                return data.parsed.info.decimals;
            }
    
            throw new Error("Failed to retrieve token decimals.");
        }
        catch(error) {
            throw error
        }
    }
}
