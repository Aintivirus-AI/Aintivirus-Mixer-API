// ** import external libraries
import Boom from '@hapi/boom'
import { ethers } from "ethers"
import {
    Keypair,
    Transaction,
    Connection,
    SystemProgram
} from "@solana/web3.js"
import { TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token"
import base58 from 'bs58'
// ** import custom type
import { ResponsePayload, RequestPayload } from "../../types"
// ** import custom libraries
import { CryptoUtil } from "../../utils"
import SessionStore, { Session } from "../../store/db/SessionStore"
import ZkSnark, { SolWithdrawalNoteObject, EthereumWithdrawalNoteObject, EthereumProof } from "../../zksnark/ZkSnark"
import ZkSolana, { SolanaProof } from '../../zksnark/ZkSnark-Solana'
import { CoinMarketcapAPI, SolanaSDK } from "../../sdk"
import {
    EthereumAintiVirusMixer,
    ERC20Standard,
    SolanaAintiVirusMixer
} from "../../core/contract-core"
// ** import local constants
import { MIX_CONFIG } from "../../constant"
import ENV from "../../constant/env"
import { MIXER_ABI } from "../../constant/abi/Mixer"

class MixerController {
    static canDeposit = async (mode: "ETH-SOL" | "SOL-ETH"): Promise<boolean> => {
        if (mode === "ETH-SOL") {
            return true
        }
        else if (mode === "SOL-ETH") {

        }
        else {
            throw new Error(`Invalid mixing mode!`)
        }
    }
    static depositETH = async (payload: RequestPayload): Promise<ResponsePayload> => {
        try {
            const { amount, sender, mode } = payload

            const isNative = (mode === 1 || mode === 3)
            const mixType: "SIMPLE" | "BRIDGE" = (mode === 1 || mode === 2) ? "SIMPLE" : "BRIDGE"

            // Define session variables
            const sessionId = CryptoUtil.generate32BytesRandomHash()
            const timestamp = Date.now()
            const expires = timestamp + MIX_CONFIG.EXPIRES
            const expiresAt = timestamp + expires

            // Define SDK and contract clients
            const ethereumAintiVirusMixer = new EthereumAintiVirusMixer(MIX_CONFIG.ADDRESS.MIXER_CONTRACT_ADDRESS, ENV.ETHEREUM_RPC_URL, ENV.ETH_POOL_PRIVKEY)
            const erc20Standard = new ERC20Standard(MIX_CONFIG.ADDRESS.ETH_TOKEN, ENV.ETHEREUM_RPC_URL, ENV.ETH_POOL_PRIVKEY)
            const solanaAintiVirusMixer = new SolanaAintiVirusMixer(
                ENV.SOLANA_RPC_URL,
                ENV.SOL_POOL_PRIVKEY,
                MIX_CONFIG.ADDRESS.SOL_TOKEN,
                MIX_CONFIG.ADDRESS.MIXER_PROGRAM_ID
            )
            const solanaSDK = new SolanaSDK(ENV.SOL_POOL_PRIVKEY, ENV.SOLANA_RPC_URL)

            // Geernate transactions
            let amountInWei: bigint = 0n
            let amountInLamport: bigint = 0n
            let transactions: Array<ethers.TransactionRequest> = []

            // Get amount in wei
            if (isNative) {
                amountInWei = ethers.parseEther(
                    Number(amount).toString()
                )

                const solAmount = await CoinMarketcapAPI.getQuoteBySymbol('ETH', 'SOL', amount)
                amountInLamport = solanaAintiVirusMixer.splDecimalize(
                    solAmount
                )
            }
            else {
                const erc20TokenDecimals = await erc20Standard.decimals()
                const splTokenDecimals = await solanaSDK.getTokenDecimals(MIX_CONFIG.ADDRESS.SOL_TOKEN)

                amountInWei = ethers.parseUnits(
                    Number(amount).toString(),
                    erc20TokenDecimals
                )
                amountInLamport = solanaAintiVirusMixer.splDecimalize(
                    amount,
                    splTokenDecimals
                )
            }

            // Generate zksnark data
            const { secret, nullifier } = ZkSnark.generateSecretAndNullifier()
            let zkProof: EthereumProof | SolanaProof;
            let commitment: bigint;

            if (mixType === "SIMPLE") {
                commitment = ZkSnark.computeCommitment(secret, nullifier, amountInWei, mode)
                zkProof = await ZkSnark.createWithdrawalProof(
                    secret,
                    nullifier,
                    amountInWei,
                    commitment,
                    mode
                )
            }
            else {
                commitment = ZkSnark.computeCommitment(secret, nullifier, amountInLamport, mode)
                zkProof = await ZkSolana.generateProof(
                    secret.toString(),
                    nullifier.toString(),
                    amountInLamport.toString(),
                    commitment.toString(),
                    mode
                )
            }

            if (isNative) {
                const depositTransaction = await ethereumAintiVirusMixer.populateTransactionDeposit(
                    mode,
                    amountInWei.toString(),
                    CryptoUtil.bigIntToBytes32(commitment)
                )

                // Sanitize BigInts in transaction objec
                transactions.push(CryptoUtil.toSafeTransaction(depositTransaction))
            }
            else {
                const approveTransaction = await erc20Standard.populateTransactionApprove(
                    MIX_CONFIG.ADDRESS.MIXER_CONTRACT_ADDRESS,
                    amountInWei.toString()
                )
                const depositTransaction = await ethereumAintiVirusMixer.populateTransactionDeposit(
                    mode,
                    amountInWei.toString(),
                    CryptoUtil.bigIntToBytes32(commitment)
                )

                // Sanitize BigInts in transaction objec
                transactions.push(CryptoUtil.toSafeTransaction(approveTransaction))
                transactions.push(CryptoUtil.toSafeTransaction(depositTransaction))
            }

            // Store session data
            const sessionStore = new SessionStore('./src/store/db/session_store.db')
            await sessionStore.initialize()

            await sessionStore.create({
                mixType,
                amount: Number(amountInWei),
                currency: MIX_CONFIG.ADDRESS.ETH_TOKEN,
                expiresAt,
                id: sessionId,
                sender,
                txHash: '',
                zkSecret: JSON.stringify(zkProof),
                secret: secret.toString(),
                nullifier: nullifier.toString(),
                commitment: commitment.toString()
            })

            await sessionStore.close()

            return {
                data: {
                    sessionId,
                    expiresAt,
                    transactions: JSON.stringify(transactions)
                }
            }
        }
        catch (error) {
            console.error(error)
            throw Boom.internal((error as Error).message, { originalError: error });
        }
    }
    static depositSOL = async (payload: RequestPayload): Promise<ResponsePayload> => {
        try {
            const { amount, sender, mode } = payload

            const isNative = (mode === 1 || mode === 3)
            const mixType = (mode === 1 || mode === 2) ? "SIMPLE" : "BRIDGE"

            // Define session variables
            const sessionId = CryptoUtil.generate32BytesRandomHash()
            const timestamp = Date.now()
            const expires = timestamp + MIX_CONFIG.EXPIRES
            const expiresAt = timestamp + expires

            // Define SDK and contract clients
            const solanaSDK = new SolanaSDK(ENV.SOL_POOL_PRIVKEY, ENV.SOLANA_RPC_URL)
            const erc20Standard = new ERC20Standard(MIX_CONFIG.ADDRESS.ETH_TOKEN, ENV.ETHEREUM_RPC_URL, ENV.ETH_POOL_PRIVKEY)
            const solanaAintiVirusMixer = new SolanaAintiVirusMixer(
                ENV.SOLANA_RPC_URL,
                ENV.SOL_POOL_PRIVKEY,
                MIX_CONFIG.ADDRESS.SOL_TOKEN,
                MIX_CONFIG.ADDRESS.MIXER_PROGRAM_ID
            )

            // Geernate transactions
            let amountInLamport: bigint = 0n
            let amountInWei: bigint = 0n

            // Get amount in wei
            if (isNative) {
                amountInLamport = solanaAintiVirusMixer.splDecimalize(amount)

                const ethPrice = await CoinMarketcapAPI.getQuoteBySymbol('SOL', 'ETH', amount)
                amountInWei = ethers.parseEther(ethPrice.toFixed(3).toString())
            }
            else {
                const erc20TokenDecimals = await erc20Standard.decimals()
                const splTokenDecimals = await solanaSDK.getTokenDecimals(MIX_CONFIG.ADDRESS.SOL_TOKEN)

                amountInLamport = solanaAintiVirusMixer.splDecimalize(amount, splTokenDecimals)
                amountInWei = ethers.parseUnits(amount.toFixed(3).toString(), erc20TokenDecimals)
            }

            // Generate zksnark data
            const { secret, nullifier } = ZkSnark.generateSecretAndNullifier()
            let commitment: bigint;
            let zkProof: EthereumProof | SolanaProof;

            if (mixType === "SIMPLE") {
                commitment = ZkSnark.computeCommitment(secret, nullifier, amountInLamport, mode)

                zkProof = await ZkSolana.generateProof(
                    secret.toString(),
                    nullifier.toString(),
                    amountInLamport.toString(),
                    commitment.toString(),
                    mode
                )
            } else {
                commitment = ZkSnark.computeCommitment(secret, nullifier, amountInWei, mode)

                zkProof = await ZkSnark.createWithdrawalProof(
                    secret,
                    nullifier,
                    amountInWei,
                    commitment,
                    mode
                )
            }

            const transaction = await solanaAintiVirusMixer.populateDepositTransaction(mode, amount, sender, commitment)

            // Store session data
            const sessionStore = new SessionStore('./src/store/db/session_store.db')
            await sessionStore.initialize()

            await sessionStore.create({
                mixType,
                amount: Number(amountInLamport.toString()),
                currency: MIX_CONFIG.ADDRESS.ETH_TOKEN,
                expiresAt,
                id: sessionId,
                sender,
                txHash: '',
                secret: secret.toString(),
                nullifier: nullifier.toString(),
                zkSecret: JSON.stringify(zkProof),
                commitment: commitment.toString()
            })

            await sessionStore.close()

            return {
                data: {
                    sessionId,
                    expiresAt,
                    transaction
                }
            }
        }
        catch (error) {
            console.error(error)
            throw Boom.internal((error as Error).message, { originalError: error });
        }
    }
    static validateETHDeposit = async (payload: RequestPayload): Promise<ResponsePayload> => {
        try {
            const { sessionId, txHash } = payload

            // Initialize session store
            const sessionStore = new SessionStore('./src/store/db/session_store.db')
            await sessionStore.initialize()

            // Validate session id
            const session = await sessionStore.read(sessionId)
            if (!session) {
                throw Boom.internal('Error: Invalid session id')
            }
            if (session.txHash !== '') {
                throw Boom.internal('Error: Session already validated')
            }
            if (Number(session.expiresAt) < Date.now()) {
                throw Boom.internal('Error: Session expired')
            }

            // Validate transaction hash
            const provider = new ethers.JsonRpcProvider(ENV.ETHEREUM_RPC_URL)
            const contractInterface = new ethers.Interface(MIXER_ABI)
            const tx = await provider.getTransaction(txHash)
            const receipt = await provider.getTransactionReceipt(txHash)
            const parsedTx = contractInterface.parseTransaction({ data: tx.data })
            const sessions = await sessionStore.readAll()
            const transactionIds = sessions.map((session: Session) => session.txHash)

            if (!tx) {
                throw Boom.internal('Error: Invalid transaction hash')
            }
            if (receipt.status !== 1) {
                throw Boom.internal('Error: Transaction failed')
            }
            if (tx.from.toLowerCase() !== session.sender.toLowerCase()) {
                throw Boom.internal(`Error: Invalid transaction sender. Expected ${session.sender} but got ${tx.from}`)
            }
            if (tx.to.toLowerCase() !== MIX_CONFIG.ADDRESS.MIXER_CONTRACT_ADDRESS.toLowerCase()) {
                throw Boom.internal(`Error: Invalid transaction recipient. Expected ${MIX_CONFIG.ADDRESS.MIXER_CONTRACT_ADDRESS} but got ${tx.to}`)
            }
            if (parsedTx.name !== 'deposit') {
                throw Boom.internal(`Error: Invalid transaction function. Expected deposit but got ${parsedTx.name}`)
            }
            // if (parsedTx.args[0].toString().toLowerCase() !== session.currency.toLowerCase()) {
            //     throw Boom.internal(`Error: Invalid transaction argument(currency). Expected ${session.currency} but got ${parsedTx.args[0].toString()}`)
            // }
            if (BigInt(parsedTx.args[1]).toString() !== BigInt(session.amount).toString()) {
                throw Boom.internal(`Error: Invalid transaction argument(amount). Expected ${BigInt(session.amount).toString()} but got ${BigInt(parsedTx.args[1]).toString()}`)
            }
            if (transactionIds.includes(txHash)) {
                throw Boom.internal('Error: Transaction ID already exists')
            }

            // Create ZK secret note
            let noteObject: EthereumWithdrawalNoteObject | SolWithdrawalNoteObject;

            if (session.mixType === "SIMPLE") {
                const withdrawalProof: EthereumProof = JSON.parse(session.zkSecret);

                noteObject = {
                    secret: session.secret,
                    nullifier: session.nullifier,
                    proof: withdrawalProof
                }
                console.log("mode is simple")
            }
            else {
                const solanaAintiVirusMixer = new SolanaAintiVirusMixer(
                    ENV.SOLANA_RPC_URL,
                    ENV.SOL_POOL_PRIVKEY,
                    MIX_CONFIG.ADDRESS.SOL_TOKEN,
                    MIX_CONFIG.ADDRESS.MIXER_PROGRAM_ID
                )

                const txSig = await solanaAintiVirusMixer.registerEthSolCommitment(
                    BigInt(
                        session.commitment
                    )
                )

                const withdrawalProof: SolanaProof = JSON.parse(session.zkSecret);

                noteObject = {
                    secret: session.secret,
                    nullifier: session.nullifier,
                    proof: withdrawalProof
                }
                console.log("mode is bridge")
                console.log("txSig: ", txSig)
            }

            const note = base58.encode(Buffer.from(JSON.stringify(noteObject)))

            // Clear Zk secret note in session
            await sessionStore.update(sessionId, { zkSecret: '', secret: '', nullifier: '', commitment: '' })
            await sessionStore.close()

            return { data: { note } }
        }
        catch (error) {
            throw Boom.internal((error as Error).message, { originalError: error });
        }
    }
    static validateSOLDeposit = async (payload: RequestPayload): Promise<ResponsePayload> => {
        try {
            const { sessionId, txHash } = payload

            // Initialize session store
            const sessionStore = new SessionStore('./src/store/db/session_store.db')
            await sessionStore.initialize()

            // Validate session id
            const session = await sessionStore.read(sessionId)
            if (!session) {
                throw Boom.internal('Error: Invalid session id')
            }
            if (session.txHash !== '') {
                throw Boom.internal('Error: Session already validated')
            }
            if (Number(session.expiresAt) < Date.now()) {
                throw Boom.internal('Error: Session expired')
            }

            // Validate transaction hash
            const sessions = await sessionStore.readAll()
            const transactionIds = sessions.map((session: Session) => session.txHash)
            const connection = new Connection(ENV.SOLANA_RPC_URL, 'confirmed')

            const tx1 = await connection.getTransaction(txHash, {
                commitment: 'confirmed',
                maxSupportedTransactionVersion: 0,
            });
            const message = tx1.transaction.message;
            const accountKeys = tx1.transaction.message.getAccountKeys();
            const compiledInstructions = message.compiledInstructions;

            const sender = accountKeys.get(0)?.toBase58(); // Usually fee payer
            const operatorSOLWallet = Keypair.fromSecretKey(base58.decode(ENV.SOL_POOL_PRIVKEY))

            if (!tx1) {
                throw Boom.internal('Error: Invalid transaction signature')
            }
            if (!tx1 || !tx1.transaction || !("message" in tx1.transaction)) {
                throw Boom.internal("Invalid transaction format or not found");
            }
            if (tx1.meta?.err) {
                throw Boom.internal('Error: Transaction failed');
            }
            if (sender?.toLowerCase() !== session.sender.toLowerCase()) {
                throw Boom.internal('Error: Invalid transaction sender');
            }
            if (transactionIds.includes(txHash)) {
                throw Boom.internal('Error: Transaction ID already exists')
            }
            for (const ix of compiledInstructions) {
                const programId = accountKeys.get(ix.programIdIndex);
                const txInfo = await connection.getParsedTransaction(txHash, "confirmed");

                // Validate transaction
                if (!txInfo || !txInfo.meta) throw Boom.internal("Transaction not found");

                // Case of SOL transfer
                if (programId.equals(SystemProgram.programId)) {
                    // Check transfer amount
                    const instructions = txInfo.transaction.message.instructions;

                    let actualTransferAmount = 0;
                    for (const ix of instructions) {
                        if (
                            "parsed" in ix &&
                            ix.program === "system" &&
                            ix.parsed?.type === "transfer"
                        ) {
                            actualTransferAmount += Number(ix.parsed.info.lamports); // in lamports
                        }
                    }
                    if (actualTransferAmount !== Number(session.amount)) {
                        throw Boom.internal(`Error: Invalid transaction argument(amount). Expected: ${session.amount}, Actual: ${actualTransferAmount}`);
                    }

                    // Check transaction recipient
                    const to = accountKeys.get(ix.accountKeyIndexes[1]);
                    if (to.toBase58().toLowerCase() !== operatorSOLWallet.publicKey.toString().toLowerCase()) {
                        throw Boom.internal(`Error: Invalid transaction receiver. Expected: ${operatorSOLWallet.publicKey.toString()}, Actual: ${to.toBase58()}`);
                    }
                }

                // Case of SPL token transfer
                if (programId.equals(TOKEN_PROGRAM_ID)) {
                    // Check transfer amount
                    const parsedTx = await connection.getParsedTransaction(txHash, {
                        maxSupportedTransactionVersion: 0,
                    });
                    if (!parsedTx || !parsedTx.meta || !parsedTx.transaction) {
                        throw Boom.internal('Transaction not found or incomplete');
                    }

                    let actualTransferAmount = 0;
                    for (const ix of parsedTx.transaction.message.instructions) {
                        if ('parsed' in ix && ix.program === 'spl-token') {
                            const parsed = ix.parsed;
                            if (parsed.type === 'transfer' || parsed.type === 'transferChecked') {
                                const rawAmount = parsed.info.amount;
                                actualTransferAmount += Number(rawAmount); // return raw amount (not human-readable)
                            }
                        }
                    }
                    if (actualTransferAmount !== Number(session.amount)) {
                        throw Boom.internal(`Error: Invalid transaction argument(amount). Expected: ${session.amount}, Actual: ${actualTransferAmount}`);
                    }

                    // Check transaction recipient
                    const fromATA = accountKeys.get(ix.accountKeyIndexes[0]);
                    const toATA = accountKeys.get(ix.accountKeyIndexes[1]);
                    const fromTokenAccountInfo = await getAccount(connection, fromATA);
                    const toTokenAccountInfo = await getAccount(connection, toATA);
                    const mintAddress = fromTokenAccountInfo.mint;

                    if (mintAddress.toBase58().toLowerCase() !== session.currency.toLowerCase()) {
                        throw Boom.internal(`Error: Invalid transaction argument(currency). Expected: ${session.currency}, Actual: ${mintAddress.toBase58()}`);
                    }
                    if (toTokenAccountInfo.owner.toBase58().toLowerCase() !== operatorSOLWallet.publicKey.toString().toLowerCase()) {
                        throw Boom.internal(`Error: Invalid transaction receiver. Expected: ${operatorSOLWallet.publicKey.toString()}, Actual: ${toTokenAccountInfo.owner.toBase58()}`);
                    }
                }
            }

            // Create ZK secret note
            let noteObj: EthereumWithdrawalNoteObject | SolWithdrawalNoteObject;

            if (session.mixType === "SIMPLE") {
                const withdrawalProof: SolanaProof = JSON.parse(session.zkSecret)
                noteObj = {
                    secret: session.secret,
                    nullifier: session.nullifier,
                    proof: withdrawalProof
                }
            }
            else {
                console.log(session.commitment)
                console.log(CryptoUtil.bigIntToBytes32(BigInt(session.commitment)))

                
                const ethereumAintiVirusMixer = new EthereumAintiVirusMixer(MIX_CONFIG.ADDRESS.MIXER_CONTRACT_ADDRESS, ENV.ETHEREUM_RPC_URL, ENV.ETH_POOL_PRIVKEY)
                const tx = await ethereumAintiVirusMixer.registerSolToEthCommitment(CryptoUtil.bigIntToBytes32(BigInt(session.commitment)))
                await tx.wait()

                const withdrawalProof: EthereumProof = JSON.parse(session.zkSecret)
                noteObj = {
                    secret: session.secret,
                    nullifier: session.nullifier,
                    proof: withdrawalProof
                }
            }

            const note = base58.encode(Buffer.from(JSON.stringify(noteObj)))

            // Clear Zk secret note in session
            await sessionStore.update(sessionId, { zkSecret: '', secret: '', nullifier: '', commitment: '' })
            await sessionStore.close()

            return { data: { note } }
        }
        catch (error) {
            throw Boom.internal((error as Error).message, { originalError: error });
        }
    }
    static withdrawSOL = async (payload: RequestPayload): Promise<ResponsePayload> => {
        try {
            const { note, receiver } = payload
            const noteObject: SolWithdrawalNoteObject = JSON.parse(
                Buffer.from(
                    base58.decode(note)
                ).toString('utf8')
            )

            // Pre verification
            const preproofValidation = await ZkSolana.offchainVerifyProof(noteObject.proof)
            if (!preproofValidation) {
                throw Boom.internal('Error: Invalid proof')
            }

            const solanaAintiVirusMixer = new SolanaAintiVirusMixer(
                ENV.SOLANA_RPC_URL,
                ENV.SOL_POOL_PRIVKEY,
                MIX_CONFIG.ADDRESS.SOL_TOKEN,
                MIX_CONFIG.ADDRESS.MIXER_PROGRAM_ID
            )

            // Recover and verify commitment
            const secret = noteObject.secret
            const nullifier = noteObject.nullifier
            const publicSignals = noteObject.proof.publicSignals

            const nullifierHash = ZkSnark.computeNullifierHash(BigInt(nullifier))
            if (nullifierHash.toString() !== noteObject.proof.publicSignals[0].toString()) {
                console.log(nullifierHash, noteObject.proof.publicSignals[0])
                throw Boom.internal("Invalid secret and nullifier provided")
            }

            const commitment = ZkSnark.computeCommitment(
                BigInt(secret),
                BigInt(nullifier),
                publicSignals[1],
                publicSignals[2]
            )

            try {
                await solanaAintiVirusMixer.validateCommitment(commitment)
            }
            catch {
                throw Boom.internal("Unknown commitment")
            }

            // Withdrawal process
            const txSig = await solanaAintiVirusMixer.withdraw(receiver, noteObject.proof.proof, noteObject.proof.publicSignals)

            return {
                data: {
                    txSig
                }
            }
        }
        catch (error) {
            console.error(error)
            throw Boom.internal((error as Error).message, { originalError: error });
        }
    }
    static withdrawETH = async (payload: RequestPayload): Promise<ResponsePayload> => {
        try {
            const { note, receiver } = payload
            const noteObject: EthereumWithdrawalNoteObject = JSON.parse(
                Buffer.from(
                    base58.decode(note)
                ).toString('utf8')
            )

            // Pre verification
            const preproofValidation = await ZkSnark.offchainVerify({ proof: noteObject.proof.proof, publicSignals: noteObject.proof.publicSignals })
            if (!preproofValidation) {
                throw Boom.internal('Error: Invalid proof')
            }

            const ethereumAintiVirusMixer = new EthereumAintiVirusMixer(
                MIX_CONFIG.ADDRESS.MIXER_CONTRACT_ADDRESS,
                ENV.ETHEREUM_RPC_URL,
                ENV.ETH_POOL_PRIVKEY
            )

            // Recover and verify commitment
            const secret = noteObject.secret
            const nullifier = noteObject.nullifier
            const publicSignals = noteObject.proof.publicSignals

            const nullifierHash = ZkSnark.computeNullifierHash(BigInt(nullifier))
            if (nullifierHash.toString() !== noteObject.proof.publicSignals[0].toString()) {
                throw new Error("Invalid secret and nullifier provided")
            }

            const commitment = ZkSnark.computeCommitment(
                BigInt(secret),
                BigInt(nullifier),
                publicSignals[1],
                publicSignals[2]
            )

            const isCommitmentValid = await ethereumAintiVirusMixer.validateWithdrawlCommitments(
                CryptoUtil.bigIntToBytes32(commitment)
            )

            if (!isCommitmentValid) {
                throw Boom.internal("Unknown commitment")
            }

            // Withdrawal commitments
            const tx = await ethereumAintiVirusMixer.withdraw(
                {
                    pA: noteObject.proof.calldata.a,
                    pB: noteObject.proof.calldata.b,
                    pC: noteObject.proof.calldata.c,
                    pubSignals: noteObject.proof.calldata.psInput
                },
                receiver
            )
            await tx.wait()

            return {
                data: {
                    txSig: tx.hash
                }
            }
        }
        catch (error) {
            console.error(error)
            throw Boom.internal((error as Error).message, { originalError: error });
        }
    }
}

export default MixerController