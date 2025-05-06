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
import { NoteObj } from "../../zksnark/ZkSnark"
// ** import custom libraries
import { CryptoUtil } from "../../utils"
import SessionStore, { Session } from "../../store/db/SessionStore"
import ZkSnark from "../../zksnark/ZkSnark"
import { CoinMarketcapAPI, SolanaSDK } from "../../sdk"
import { AintiVirusMixer, ERC20Standard } from "../../core/contract-core"
// ** import local constants
import { MIX_CONFIG } from "../../constant"
import ENV from "../../constant/env"
import { MIXER_ABI } from "../../constant/abi/Mixer"

class MixerController {
    static depositETH = async (payload: RequestPayload): Promise<ResponsePayload> => {
        try {
            const { amount, currency, sender } = payload

            if (MIX_CONFIG.ETH2SOL_CURRENCY_MAP[currency] === undefined) {
                throw Boom.internal('Error: Unknown currency can not be processed')
            }

            const isNative = currency === MIX_CONFIG.ADDRESS.ETH_COIN_ADDRESS ? true : false

            // Define session variables
            const sessionId = CryptoUtil.generate32BytesRandomHash()
            const timestamp = Date.now()
            const expires = timestamp + MIX_CONFIG.EXPIRES
            const expiresAt = timestamp + expires

            // Process currency metadata
            const aintiVirusMixer = new AintiVirusMixer(MIX_CONFIG.ADDRESS.MIXER_CONTRACT_ADDRESS, ENV.ETHEREUM_RPC_URL, ENV.ETH_POOL_PRIVKEY)
            const erc20Standard = new ERC20Standard(currency, ENV.ETHEREUM_RPC_URL, ENV.ETH_POOL_PRIVKEY)

            // Geernate transactions
            let amountInWei: bigint = 0n;
            let transactions: Array<ethers.TransactionRequest> = []

            // Get amount in wei
            if (isNative) {
                amountInWei = ethers.parseEther(amount)
            }
            else {
                const decimals = await erc20Standard.decimals()
                amountInWei = ethers.parseUnits(amount, decimals)
            }

            // Generate zksnark data
            const { secret, nullifier } = ZkSnark.generateSecretAndNullifier()
            const zkPreProofData = await ZkSnark.createPreProof(secret, nullifier, currency, amountInWei)
            const commitment = ZkSnark.computeCommitment(secret, currency, amountInWei)

            if (isNative) {
                const depositTransaction = await aintiVirusMixer.populateTransactionDeposit(currency, amountInWei, commitment.toString())

                // Sanitize BigInts in transaction object
                const safeTransaction = JSON.parse(
                    JSON.stringify(depositTransaction, (_key, value) =>
                        typeof value === 'bigint' ? value.toString() : value
                    )
                )

                transactions.push(safeTransaction)
            }
            else {
                const approveTransaction = await erc20Standard.populateTransactionApprove(MIX_CONFIG.ADDRESS.MIXER_CONTRACT_ADDRESS, amountInWei)
                const depositTransaction = await aintiVirusMixer.populateTransactionDeposit(currency, amountInWei, commitment.toString())

                transactions.push(approveTransaction)
                transactions.push(depositTransaction)
            }
            
            // Store session data
            const sessionStore = new SessionStore('./src/store/db/session_store.db')
            await sessionStore.initialize()
            
            await sessionStore.create({
                amount: Number(amountInWei),
                currency,
                expiresAt,
                id: sessionId,
                sender,
                txHash: '',
                zkSecret: JSON.stringify(zkPreProofData),
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
            const { amount, currency, sender } = payload

            if (MIX_CONFIG.SOL2ETH_CURRENCY_MAP[currency] === undefined) {
                throw Boom.internal('Error: Unknown currency can not be processed')
            }

            const isNative = currency === MIX_CONFIG.ADDRESS.SOL_COIN_ADDRESS ? true : false
            const operatorSOLWallet = Keypair.fromSecretKey(base58.decode(ENV.SOL_POOL_PRIVKEY))

            // Define session variables
            const sessionId = CryptoUtil.generate32BytesRandomHash()
            const timestamp = Date.now()
            const expires = timestamp + MIX_CONFIG.EXPIRES
            const expiresAt = timestamp + expires

            // Process currency metadata
            const solanaSDK = new SolanaSDK(ENV.SOL_POOL_PRIVKEY, ENV.SOLANA_RPC_URL)
            const erc20Standard = new ERC20Standard(MIX_CONFIG.SOL2ETH_CURRENCY_MAP[currency], ENV.ETHEREUM_RPC_URL, ENV.ETH_POOL_PRIVKEY)

            // Geernate transactions
            let amountInLamport: bigint = 0n;
            let transaction: Transaction;
            let etherAmount: bigint = 0n

            // Get amount in wei
            if (isNative) {
                amountInLamport = solanaSDK.splDecimalize(amount)
                transaction = await solanaSDK.buildSendSOLTransaction(operatorSOLWallet.publicKey.toString(), amount, sender)

                const ethPrice = await CoinMarketcapAPI.getQuoteBySymbol('SOL', 'ETH', amount)
                etherAmount = ethers.parseEther(ethPrice.toFixed(3).toString())
            }
            else {
                const splTokenDecimals = await solanaSDK.getTokenDecimals(currency)
                amountInLamport = solanaSDK.splDecimalize(amount, splTokenDecimals)
                transaction = await solanaSDK.buildSendSPLTransaction(currency, operatorSOLWallet.publicKey.toString(), Number(amount), sender)

                const erc20TokenDecimals = await erc20Standard.decimals()
                etherAmount = ethers.parseUnits(amount.toFixed(3).toString(), erc20TokenDecimals)
            }

            // Generate zksnark data
            const { secret, nullifier } = ZkSnark.generateSecretAndNullifier()
            const zkPreProofData = await ZkSnark.createPreProof(secret, nullifier, MIX_CONFIG.SOL2ETH_CURRENCY_MAP[currency], etherAmount)
            const commitment = ZkSnark.computeCommitment(secret, MIX_CONFIG.SOL2ETH_CURRENCY_MAP[currency], etherAmount)

            // Store session data
            const sessionStore = new SessionStore('./src/store/db/session_store.db')
            await sessionStore.initialize()

            await sessionStore.create({
                amount: Number(amountInLamport.toString()),
                currency,
                expiresAt,
                id: sessionId,
                sender,
                txHash: '',
                secret: secret.toString(),
                nullifier: nullifier.toString(),
                zkSecret: JSON.stringify(zkPreProofData),
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
            if (parsedTx.args[0].toString().toLowerCase() !== session.currency.toLowerCase()) {
                throw Boom.internal(`Error: Invalid transaction argument(currency). Expected ${session.currency} but got ${parsedTx.args[0].toString()}`)
            }
            if (BigInt(parsedTx.args[1]).toString() !== BigInt(session.amount).toString()) {
                throw Boom.internal(`Error: Invalid transaction argument(amount). Expected ${BigInt(session.amount).toString()} but got ${BigInt(parsedTx.args[1]).toString()}`)
            }
            if (transactionIds.includes(txHash)) {
                throw Boom.internal('Error: Transaction ID already exists')
            }

            // Create ZK secret note
            const noteObj: NoteObj = {
                currency: session.currency,
                type: 'ETH2SOL',
                secret: session.secret,
                nullifier: session.nullifier,
                commitment: session.commitment,
                zkData: JSON.parse(session.zkSecret)
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
            const noteObj: NoteObj = {
                currency: session.currency,
                type: 'SOL2ETH',
                secret: session.secret,
                nullifier: session.nullifier,
                commitment: session.commitment,
                zkData: JSON.parse(session.zkSecret)
            }

            const note = base58.encode(Buffer.from(JSON.stringify(noteObj)))

            // Add commitment on Mixer smart contract on Ethereum
            const aintiVirusMixer = new AintiVirusMixer(MIX_CONFIG.ADDRESS.MIXER_CONTRACT_ADDRESS, ENV.ETHEREUM_RPC_URL, ENV.ETH_POOL_PRIVKEY)
            const tx = await aintiVirusMixer.addCommitmentForEthWithdrawal(session.commitment)
            await tx.wait()

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
            const noteObj: NoteObj = JSON.parse(
                Buffer.from(
                    base58.decode(note)
                ).toString('utf8')
            )

            const preproofValidation = await ZkSnark.offchainVerifyPreProof(noteObj.zkData)
            if (!preproofValidation) {
                throw Boom.internal('Error: Invalid proof')
            }

            const solanaSDK = new SolanaSDK(ENV.SOL_POOL_PRIVKEY, ENV.SOLANA_RPC_URL)
            const aintiVirusMixer = new AintiVirusMixer(MIX_CONFIG.ADDRESS.MIXER_CONTRACT_ADDRESS, ENV.ETHEREUM_RPC_URL, ENV.ETH_POOL_PRIVKEY)
            const nullifierHash = ZkSnark.computeNullifierHash(BigInt(noteObj.nullifier))
            const { currency, amount } = ZkSnark.recoverPreProofData(noteObj.zkData)

            
            const withdrawalProof = await ZkSnark.createWithdrawalProof(
                BigInt(noteObj.secret),
                BigInt(noteObj.nullifier),
                nullifierHash,
                receiver,
                currency,
                BigInt(amount),
                true
            )

            console.log("Nullifier Hash", nullifierHash)
            console.log(withdrawalProof)

            const isValid = await aintiVirusMixer.verifySolWithdrawal(
                withdrawalProof.calldata.a,
                withdrawalProof.calldata.b,
                withdrawalProof.calldata.c,
                withdrawalProof.publicSignals
            )

            if (!isValid) {
                throw Boom.internal('Error: Invalid withdrawal proof')
            }

            if (currency === MIX_CONFIG.ADDRESS.ETH_COIN_ADDRESS) {
                const formattedAmount = ethers.formatEther(amount)
                const solAmount = await CoinMarketcapAPI.getQuoteBySymbol('ETH', 'sol', formattedAmount)

                const txSig = await solanaSDK.sendSol(receiver, solAmount)

                const tx = await aintiVirusMixer.setNullifierForSolWithdrawal(nullifierHash.toString())
                await tx.wait()

                return {
                    data: {
                        txSig
                    }
                }
            }
            else {
                const erc20Standard = new ERC20Standard(currency, ENV.ETHEREUM_RPC_URL, ENV.ETH_POOL_PRIVKEY)
                const decimals = await erc20Standard.decimals()
                const formattedAmount = ethers.formatUnits(noteObj.zkData.publicSignals[4], decimals)

                const txSig = await solanaSDK.sendSPLToken(MIX_CONFIG.ETH2SOL_CURRENCY_MAP[currency], receiver, Number(formattedAmount))

                const tx = await aintiVirusMixer.setNullifierForSolWithdrawal(nullifierHash.toString())
                await tx.wait()

                return {
                    data: {
                        txSig
                    }
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
            const noteObj: NoteObj = JSON.parse(
                Buffer.from(
                    base58.decode(note)
                ).toString('utf8')
            )

            const aintiVirusMixer = new AintiVirusMixer(MIX_CONFIG.ADDRESS.MIXER_CONTRACT_ADDRESS, ENV.ETHEREUM_RPC_URL, ENV.ETH_POOL_PRIVKEY)
            const nullifierHash = ZkSnark.computeNullifierHash(BigInt(noteObj.nullifier))
            const { currency, amount } = ZkSnark.recoverPreProofData(noteObj.zkData)

            const withdrawalProof = await ZkSnark.createWithdrawalProof(
                BigInt(noteObj.secret),
                BigInt(noteObj.nullifier),
                nullifierHash,
                receiver,
                currency,
                BigInt(amount)
            )

            const transaction = await aintiVirusMixer.populateTransactionWithdraw(
                withdrawalProof.calldata.a,
                withdrawalProof.calldata.b,
                withdrawalProof.calldata.c,
                withdrawalProof.publicSignals
            )

            return {
                data: transaction
            }
        }
        catch (error) {
            console.error(error)
            throw Boom.internal((error as Error).message, { originalError: error });
        }
    }
}

export default MixerController