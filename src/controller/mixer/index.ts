// ** import external libraries
import axios from "axios"
import { ethers, ContractTransaction, Signer } from "ethers"
import {
    Keypair,
    Transaction,
    PublicKey,
    Connection,
    TransactionInstruction,
    VersionedTransaction,
    SystemProgram
} from "@solana/web3.js"
import { TOKEN_PROGRAM_ID, getAccount } from "@solana/spl-token"
import base58 from 'bs58'
// ** import custom type
import { ResponsePayload, RequestPayload } from "../../types"
// ** import custom libraries
import { CryptoUtil } from "../../utils"
import SolanaLedger from "../../store/db/SolanaLedger"
import SessionStore, { Session } from "../../store/db/SessionStore"
import ZkSnark from "../../zksnark/ZkSnark"
import { CoinMarketcapAPI, SolanaSDK } from "../../sdk"
// ** import local constants
import { MIX_CONFIG } from "../../constant"
import ENV from "../../constant/env"
import { ERC20_ABI } from "../../constant/abi/ERC20"
import { MIXER_ABI } from "../../constant/abi/Mixer"

interface MixerContractInterface {
    addCommitment(commitment: string): Promise<ContractTransaction>;
    setNullifierHash(nullifierHash: string): Promise<ContractTransaction>;
    connect(signerOrProvider: Signer): MixerContractInterface;
  }

class MixerController {
    static depositETH = async (payload: RequestPayload): Promise<ResponsePayload> => {
        try {
            const { amount, currency, sender } = payload

            if (MIX_CONFIG.ETH2SOL_CURRENCY_MAP[currency] === undefined) {
                throw new Error('Error: Unknown currency can not be processed')
            }

            const isNative = currency === MIX_CONFIG.ADDRESS.ETH_COIN_ADDRESS ? true : false

            // Define session variables
            const sessionId = CryptoUtil.generate32BytesRandomHash()
            const timestamp = Date.now()
            const expires = timestamp + MIX_CONFIG.EXPIRES
            const expiresAt = timestamp + expires

            // Process currency metadata
            const provider = new ethers.JsonRpcProvider(ENV.ETHEREUM_RPC_URL)

            // Geernate transactions
            let amountInWei: bigint = 0n;
            let transactions: Array<ethers.TransactionRequest> = []

            const mixerContract = new ethers.Contract(MIX_CONFIG.ADDRESS.MIXER_CONTRACT_ADDRESS, MIXER_ABI, provider)

            // Get amount in wei
            if (isNative) {
                amountInWei = ethers.parseEther(amount)
            }
            else {
                const tokenContract = new ethers.Contract(currency, ERC20_ABI, provider)

                const decimals = await tokenContract.decimals()
                amountInWei = ethers.parseUnits(amount, decimals)
            }

            // Generate zksnark data
            const zkData = await ZkSnark.createZkProof(currency, amountInWei.toString())

            if (isNative) {
                const depositTransaction = await mixerContract.deposit.populateTransaction(currency, amountInWei.toString(), { value: amountInWei })

                // Sanitize BigInts in transaction object
                const safeTransaction = JSON.parse(
                    JSON.stringify(depositTransaction, (_key, value) =>
                        typeof value === 'bigint' ? value.toString() : value
                    )
                )

                transactions.push(safeTransaction)
            }
            else {
                const tokenContract = new ethers.Contract(currency, ERC20_ABI, provider)

                const approveTransaction = await tokenContract.approve.populateTransaction(MIX_CONFIG.ADDRESS.MIXER_CONTRACT_ADDRESS, amountInWei.toString())
                const depositTransaction = await mixerContract.deposit.populateTransaction(currency, amountInWei.toString())

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
                zkSecret: JSON.stringify(zkData)
            })

            await sessionStore.close()

            return {
                data: {
                    sessionId,
                    expiresAt,
                    transactions
                }
            }
        }
        catch (error) {
            console.error(error)
            throw error
        }
    }

    static depositSOL = async (payload: RequestPayload): Promise<ResponsePayload> => {
        try {
            const { amount, currency, sender } = payload

            if (MIX_CONFIG.SOL2ETH_CURRENCY_MAP[currency] === undefined) {
                throw new Error('Error: Unknown currency can not be processed')
            }

            const isNative = currency === MIX_CONFIG.ADDRESS.SOL_COIN_ADDRESS ? true : false
            const operatorETHWallet = new ethers.Wallet(ENV.ETH_POOL_PRIVKEY)
            const operatorSOLWallet = Keypair.fromSecretKey(base58.decode(ENV.SOL_POOL_PRIVKEY))

            // Define session variables
            const sessionId = CryptoUtil.generate32BytesRandomHash()
            const timestamp = Date.now()
            const expires = timestamp + MIX_CONFIG.EXPIRES
            const expiresAt = timestamp + expires

            // Process currency metadata
            const solanaSDK = new SolanaSDK(ENV.SOL_POOL_PRIVKEY, ENV.SOLANA_RPC_URL)
            const provider = new ethers.JsonRpcProvider(ENV.ETHEREUM_RPC_URL)
            const etherToken = new ethers.Contract(MIX_CONFIG.SOL2ETH_CURRENCY_MAP[currency], ERC20_ABI, provider)

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
                
                const erc20TokenDecimals = await etherToken.decimals()
                etherAmount = ethers.parseUnits(amount.toFixed(3).toString(), erc20TokenDecimals)
            }

            // Generate zksnark data
            const zkData = await ZkSnark.createZkProof(MIX_CONFIG.SOL2ETH_CURRENCY_MAP[currency], etherAmount.toString())

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
                zkSecret: JSON.stringify(zkData)
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
            throw error
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
                throw new Error('Error: Invalid session id')
            }
            if (session.txHash !== '') {
                throw new Error('Error: Session already validated')
            }
            if (Number(session.expiresAt) < Date.now()) {
                throw new Error('Error: Session expired')
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
                throw new Error('Error: Invalid transaction hash')
            }
            if (receipt.status !== 1) {
                throw new Error('Error: Transaction failed')
            }
            if (tx.from.toLowerCase() !== session.sender.toLowerCase()) {
                throw new Error(`Error: Invalid transaction sender. Expected ${session.sender} but got ${tx.from}`)
            }
            if (tx.to.toLowerCase() !== MIX_CONFIG.ADDRESS.MIXER_CONTRACT_ADDRESS.toLowerCase()) {
                throw new Error(`Error: Invalid transaction recipient. Expected ${MIX_CONFIG.ADDRESS.MIXER_CONTRACT_ADDRESS} but got ${tx.to}`)
            }
            if (parsedTx.name !== 'deposit') {
                throw new Error(`Error: Invalid transaction function. Expected deposit but got ${parsedTx.name}`)
            }
            if (parsedTx.args[0].toString().toLowerCase() !== session.currency.toLowerCase()) {
                throw new Error(`Error: Invalid transaction argument(currency). Expected ${session.currency} but got ${parsedTx.args[0].toString()}`)
            }
            if (parsedTx.args[1].toString() !== session.amount.toString()) {
                throw new Error(`Error: Invalid transaction argument(amount). Expected ${session.amount.toString()} but got ${parsedTx.args[1].toString()}`)
            }
            if (transactionIds.includes(txHash)) {
                throw new Error('Error: Transaction ID already exists')
            }

            // Create ZK secret note
            const noteObj = {
                currency: session.currency,
                type: 'ETH2SOL',
                zkData: JSON.parse(session.zkSecret)
            }

            const note = base58.encode(Buffer.from(JSON.stringify(noteObj)))

            // Register deposit in Solana ledger
            const solanaLedger = new SolanaLedger('./src/store/db/solana_ledger.db')
            await solanaLedger.initialize()

            // const duplicatedCommitment = await solanaLedger.read(JSON.parse(session.zkSecret).publicSignals[0].toString())
            // if (duplicatedCommitment) {
            //     throw new Error('Error: Duplicated commitment')
            // }

            await solanaLedger.create(JSON.parse(session.zkSecret).publicSignals[0].toString(), {
                commitment: JSON.parse(session.zkSecret).publicSignals[0],
                nullifierHash: false
            })
            await solanaLedger.close()

            // Clear Zk secret note in session
            await sessionStore.update(sessionId, { zkSecret: '' })
            await sessionStore.close()

            return { data: { note } }
        }
        catch (error) {
            throw error
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
                throw new Error('Error: Invalid session id')
            }
            if (session.txHash !== '') {
                throw new Error('Error: Session already validated')
            }
            if (Number(session.expiresAt) < Date.now()) {
                throw new Error('Error: Session expired')
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
                throw new Error('Error: Invalid transaction signature')
            }
            if (!tx1 || !tx1.transaction || !("message" in tx1.transaction)) {
                throw new Error("Invalid transaction format or not found");
            }
            if (tx1.meta?.err) {
                throw new Error('Error: Transaction failed');
            }
            if (sender?.toLowerCase() !== session.sender.toLowerCase()) {
                throw new Error('Error: Invalid transaction sender');
            }
            if (transactionIds.includes(txHash)) {
                throw new Error('Error: Transaction ID already exists')
            }
            for (const ix of compiledInstructions) {
                const programId = accountKeys.get(ix.programIdIndex);
                const txInfo = await connection.getParsedTransaction(txHash, "confirmed");

                // Validate transaction
                if (!txInfo || !txInfo.meta) throw new Error("Transaction not found");

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
                        throw new Error(`Error: Invalid transaction argument(amount). Expected: ${session.amount}, Actual: ${actualTransferAmount}`);
                    }

                    // Check transaction recipient
                    const to = accountKeys.get(ix.accountKeyIndexes[1]);
                    if (to.toBase58().toLowerCase() !== operatorSOLWallet.publicKey.toString().toLowerCase()) {
                        throw new Error(`Error: Invalid transaction receiver. Expected: ${operatorSOLWallet.publicKey.toString()}, Actual: ${to.toBase58()}`);
                    }
                }

                // Case of SPL token transfer
                if (programId.equals(TOKEN_PROGRAM_ID)) {
                    // Check transfer amount
                    const parsedTx = await connection.getParsedTransaction(txHash, {
                        maxSupportedTransactionVersion: 0,
                    });
                    if (!parsedTx || !parsedTx.meta || !parsedTx.transaction) {
                        throw new Error('Transaction not found or incomplete');
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
                        throw new Error(`Error: Invalid transaction argument(amount). Expected: ${session.amount}, Actual: ${actualTransferAmount}`);
                    }

                    // Check transaction recipient
                    const fromATA = accountKeys.get(ix.accountKeyIndexes[0]);
                    const toATA = accountKeys.get(ix.accountKeyIndexes[1]);
                    const fromTokenAccountInfo = await getAccount(connection, fromATA);
                    const toTokenAccountInfo = await getAccount(connection, toATA);
                    const mintAddress = fromTokenAccountInfo.mint;

                    if (mintAddress.toBase58().toLowerCase() !== session.currency.toLowerCase()) {
                        throw new Error(`Error: Invalid transaction argument(currency). Expected: ${session.currency}, Actual: ${mintAddress.toBase58()}`);
                    }
                    if (toTokenAccountInfo.owner.toBase58().toLowerCase() !== operatorSOLWallet.publicKey.toString().toLowerCase()) {
                        throw new Error(`Error: Invalid transaction receiver. Expected: ${operatorSOLWallet.publicKey.toString()}, Actual: ${toTokenAccountInfo.owner.toBase58()}`);
                    }
                }
            }

            // Create ZK secret note
            const noteObj = {
                currency: session.currency,
                type: 'SOL2ETH',
                zkData: JSON.parse(session.zkSecret)
            }

            const note = base58.encode(Buffer.from(JSON.stringify(noteObj)))

            // Register deposit in Solana ledger
            // const solanaLedger = new SolanaLedger('./src/store/db/solana_ledger.db')
            // await solanaLedger.initialize()

            // const duplicatedCommitment = await solanaLedger.read(JSON.parse(session.zkSecret).publicSignals[0].toString())
            // if (duplicatedCommitment) {
            //     throw new Error('Error: Duplicated commitment')
            // }

            // await solanaLedger.create(JSON.parse(session.zkSecret).publicSignals[0].toString(), {
            //     commitment: JSON.parse(session.zkSecret).publicSignals[0],
            //     nullifierHash: false
            // })
            // await solanaLedger.close()

            // Clear Zk secret note in session
            await sessionStore.update(sessionId, { zkSecret: '' })
            await sessionStore.close()

            // Add commitment on Mixer smart contract on Ethereum
            const provider = new ethers.JsonRpcProvider(ENV.ETHEREUM_RPC_URL)
            const operatorETHWallet = new ethers.Wallet(ENV.ETH_POOL_PRIVKEY, provider)
            const mixerContract = new ethers.Contract(MIX_CONFIG.ADDRESS.MIXER_CONTRACT_ADDRESS, MIXER_ABI, operatorETHWallet) as unknown as MixerContractInterface
            const signedMixerContract = mixerContract.connect(operatorETHWallet)

            await signedMixerContract.addCommitment(noteObj.zkData.publicSignals[0])

            return { data: { note } }
        }
        catch (error) {
            throw error
        }
    }

    static withdrawSOL = async (payload: RequestPayload): Promise<ResponsePayload> => {
        try {
            const { note, receiver } = payload
            const noteObj = JSON.parse(
                Buffer.from(
                    base58.decode(note)
                ).toString('utf8')
            )

            // Register deposit in Solana ledger
            const solanaLedger = new SolanaLedger('./src/store/db/solana_ledger.db')
            await solanaLedger.initialize()

            const depositProof = await solanaLedger.read(noteObj.zkData.publicSignals[0].toString())
            const isValid = await ZkSnark.offchainVerify(noteObj.zkData)

            if (!depositProof) {
                throw new Error('Error: Deposit proof not found')
            }
            if (depositProof.nullifierHash) {
                throw new Error('Error: Deposit already withdrawn')
            }
            if (!isValid) {
                throw new Error('Error: Invalid withdraw proof')
            }

            await solanaLedger.update(noteObj.zkData.publicSignals[0].toString(), {
                nullifierHash: true
            })
            await solanaLedger.close()

            const hex = ethers.zeroPadValue(ethers.toBeHex(noteObj.zkData.publicSignals[3]), 20);
            const tokenAddress = ethers.getAddress(hex);

            const solanaSDK = new SolanaSDK(ENV.SOL_POOL_PRIVKEY, ENV.SOLANA_RPC_URL)
            const provider = new ethers.JsonRpcProvider(ENV.ETHEREUM_RPC_URL)
            const operatorETHWallet = new ethers.Wallet(ENV.ETH_POOL_PRIVKEY, provider)
            const mixerContract = new ethers.Contract(MIX_CONFIG.ADDRESS.MIXER_CONTRACT_ADDRESS, MIXER_ABI, operatorETHWallet) as unknown as MixerContractInterface
            const signedMixerContract = mixerContract.connect(operatorETHWallet)

            if (tokenAddress === MIX_CONFIG.ADDRESS.ETH_COIN_ADDRESS) {
                const amount = ethers.formatEther(noteObj.zkData.publicSignals[4])
                const solAmount = await CoinMarketcapAPI.getQuoteBySymbol('ETH', 'sol', amount)

                const tx = await solanaSDK.sendSol(receiver, solAmount)

                await signedMixerContract.setNullifierHash(noteObj.zkData.nullifierHash)

                return {
                    data: {
                        txSig: tx
                    }
                }
            }
            else {
                const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, provider)
                const decimals = await tokenContract.decimals()
                const amount = ethers.formatUnits(noteObj.zkData.publicSignals[4], decimals)

                const tx = await solanaSDK.sendSPLToken(MIX_CONFIG.ETH2SOL_CURRENCY_MAP[tokenAddress], receiver, Number(amount))

                await signedMixerContract.setNullifierHash(noteObj.zkData.nullifierHash)

                return {
                    data: {
                        txSig: tx
                    }
                }
            }
        }
        catch (error) {
            console.error(error)
            throw error
        }
    }

    static withdrawETH = async (payload: RequestPayload): Promise<ResponsePayload> => {
        try {
            const { note, receiver } = payload
            const noteObj = JSON.parse(
                Buffer.from(
                    base58.decode(note)
                ).toString('utf8')
            )

            const provider = new ethers.JsonRpcProvider(ENV.ETHEREUM_RPC_URL)
            const mixerContract = new ethers.Contract(MIX_CONFIG.ADDRESS.MIXER_CONTRACT_ADDRESS, MIXER_ABI, provider)

            const transaction = await mixerContract.withdraw.populateTransaction(
                noteObj.zkData.nullifierHash,
                noteObj.zkData.calldata.a,
                noteObj.zkData.calldata.b,
                noteObj.zkData.calldata.c,
                noteObj.zkData.calldata.psInput,
                receiver
            )

            const solanaLedger = new SolanaLedger('./src/store/db/solana_ledger.db')
            await solanaLedger.initialize()

            await solanaLedger.update(noteObj.zkData.publicSignals[0].toString(), {
                nullifierHash: true
            })
            await solanaLedger.close()

            return {
                data: transaction
            }
        }
        catch (error) {
            console.error(error)
            throw error
        }
    }
}

export default MixerController