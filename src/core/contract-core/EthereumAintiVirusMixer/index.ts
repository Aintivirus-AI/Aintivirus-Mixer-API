import { ContractTransaction, ethers } from "ethers";
import axios from "axios";
import { AintiVirusMixer as IAintiVirusMixer } from "../typechain-types"; // Adjust import path as necessary
import { MIXER_ABI } from "../../../constant/abi/Mixer"; // Adjust import path as necessary
import ENV from "../../../constant/env";

// Interface for WithdrawalProof struct
export interface WithdrawalProof {
    pA: [string, string];
    pB: [[string, string], [string, string]];
    pC: [string, string];
    pubSignals: [string, string, string, string, string];
}

export type FeeSpeed = "low" | "medium" | "high";

export interface GasOverrides {
    gasLimit: ethers.BigNumberish;
    maxPriorityFeePerGas?: ethers.BigNumberish;
    maxFeePerGas?: ethers.BigNumberish;
    gasPrice?: ethers.BigNumberish;
}

export default class EthereumAintiVirusMixer {
    private readonly provider: ethers.JsonRpcProvider;
    private readonly wallet: ethers.Wallet;
    private readonly contractAddress: string;
    private contract: IAintiVirusMixer;

    constructor(address: string, rpcUrl: string, privateKey: string) {
        try {
            this.provider = new ethers.JsonRpcProvider(rpcUrl);
            this.wallet = new ethers.Wallet(privateKey, this.provider);
            this.contractAddress = address;
            this.contract = new ethers.Contract(
                this.contractAddress,
                MIXER_ABI,
                this.wallet
            ) as unknown as IAintiVirusMixer;
        } catch (error) {
            throw new Error(`Failed to initialize AintiVirusMixer: ${(error as Error).message}`);
        }
    }

    // === Constants and Immutable Variables ===

    /**
     * Gets the FIELD_SIZE constant
     * @returns The BN254 field size
     */
    async getFieldSize(): Promise<bigint> {
        try {
            const fieldSize = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
            return fieldSize;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the ZERO_VALUE constant
     * @returns The zero value for empty leaves
     */
    async getZeroValue(): Promise<bigint> {
        try {
            const zeroValue = BigInt("9843416945950214527845121167110536396734923501368431511777016063417998984121");
            return zeroValue;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the OPERATOR_ROLE constant
     * @returns The keccak256 hash of "OPERATOR_ROLE"
     */
    async getOperatorRole(): Promise<string> {
        try {
            const operatorRole = await this.contract.OPERATOR_ROLE();
            return operatorRole;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the withdrawal verifier address
     * @returns The withdrawal verifier contract address
     */
    async getVerifier(): Promise<string> {
        try {
            const verifier = await this.contract.verifier();
            return verifier;
        } catch (error) {
            throw error;
        }
    }

    /**
     * 
     * @param commitment 
     * @returns Commitment validation result
     */
    async validateWithdrawlCommitments(commitment: string): Promise<boolean> {
        try {
            const isValid = await this.contract.withdrawalCommitments(commitment)

            return isValid
        }
        catch(error) {
            throw error
        }
    }

    // === State-Modifying Functions ===

    /**
     * Deposits funds into the contract for Solana withdrawal
     * @param currency Address of the ERC20 token (or zero address for ETH)
     * @param amount Amount to deposit
     * @param commitment Commitment hash
     * @param proof Deposit proof struct
     * @returns Transaction response
     */
    async deposit(
        mode: number,
        amount: ethers.BigNumberish,
        commitment: string
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const value = (mode === 1 || mode === 3) ? amount.toString() : "0";
            const tx = await this.contract.deposit(mode, amount, commitment, { value });
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Adds a commitment for Ethereum withdrawal (operator only)
     * Sends the transaction with a very high gas fee.
     * @param commitment Commitment hash
     * @returns Transaction response
     */
    async registerSolToEthCommitment(
        commitment: string
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            // const populatedTx = await this.populateTransactionRegisterSolToEthCommitment(commitment)
            // const gasOverride = await this.getGasOverrides(populatedTx, "high")
            const tx = await this.contract.registerSolToEthCommitment(commitment);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Withdraws funds from the Ethereum Merkle tree
     * @param root Merkle root
     * @param proof Withdrawal proof struct
     * @returns Transaction response
     */
    async withdraw(
        proof: WithdrawalProof,
        recipient: string
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const tx = await this.contract.withdraw(proof, recipient);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    // === Access Control Functions ===

    /**
     * Grants a role to an account (admin only)
     * @param role Role hash
     * @param account Account address
     * @returns Transaction response
     */
    async grantRole(
        role: string,
        account: string
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const tx = await this.contract.grantRole(role, account);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Revokes a role from an account (admin only)
     * @param role Role hash
     * @param account Account address
     * @returns Transaction response
     */
    async revokeRole(
        role: string,
        account: string
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const tx = await this.contract.revokeRole(role, account);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Renounces a role for the caller (self only)
     * @param role Role hash
     * @returns Transaction response
     */
    async renounceRole(
        role: string
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const tx = await this.contract.renounceRole(role, this.wallet.address);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Checks if an account has a specific role
     * @param role Role hash
     * @param account Account address
     * @returns Whether the account has the role
     */
    async hasRole(role: string, account: string): Promise<boolean> {
        try {
            const hasRole = await this.contract.hasRole(role, account);
            return hasRole;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the admin role for a given role
     * @param role Role hash
     * @returns Admin role hash
     */
    async getRoleAdmin(role: string): Promise<string> {
        try {
            const roleAdmin = await this.contract.getRoleAdmin(role);
            return roleAdmin;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the DEFAULT_ADMIN_ROLE constant
     * @returns The keccak256 hash of DEFAULT_ADMIN_ROLE (0x00)
     */
    async getDefaultAdminRole(): Promise<string> {
        try {
            const defaultAdminRole = ethers.ZeroAddress; // DEFAULT_ADMIN_ROLE is 0x00 in AccessControl
            return defaultAdminRole;
        } catch (error) {
            throw error;
        }
    }

    // === Raw Transaction Builders ===

    /**
     * Builds a raw transaction for depositing funds
     * @param currency Address of the ERC20 token (or zero address for ETH)
     * @param amount Amount to deposit
     * @param commitment Commitment hash
     * @param proof Deposit proof struct
     * @returns Transaction request
     */
    async populateTransactionDeposit(
        mode: number,
        amount: ethers.BigNumberish,
        commitment: string
    ): Promise<ethers.ContractTransaction> {
        try {
            const isEth = mode === 1 || mode === 3;
            const value = isEth ? amount.toString() : "0";
            const tx = await this.contract.deposit.populateTransaction(mode, amount, commitment, { value });
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Builds a raw transaction for adding a commitment for Ethereum withdrawal
     * @param commitment Commitment hash
     * @returns Transaction request
     */
    async populateTransactionRegisterSolToEthCommitment(
        commitment: string
    ): Promise<ethers.ContractTransaction> {
        try {
            const tx = await this.contract.registerSolToEthCommitment.populateTransaction(commitment);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Builds a raw transaction for withdrawing funds
     * @param root Merkle root
     * @param proof Withdrawal proof struct
     * @returns Transaction request
     */
    async populateTransactionWithdraw(
        root: string,
        proof: WithdrawalProof,
        recipient: string
    ): Promise<ethers.ContractTransaction> {
        try {
            const tx = await this.contract.withdraw.populateTransaction(proof, recipient);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Builds a raw transaction for granting a role
     * @param role Role hash
     * @param account Account address
     * @returns Transaction request
     */
    async populateTransactionGrantRole(
        role: string,
        account: string
    ): Promise<ethers.ContractTransaction> {
        try {
            const tx = await this.contract.grantRole.populateTransaction(role, account);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Builds a raw transaction for revoking a role
     * @param role Role hash
     * @param account Account address
     * @returns Transaction request
     */
    async populateTransactionRevokeRole(
        role: string,
        account: string
    ): Promise<ethers.ContractTransaction> {
        try {
            const tx = await this.contract.revokeRole.populateTransaction(role, account);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Builds a raw transaction for renouncing a role
     * @param role Role hash
     * @returns Transaction request
     */
    async populateTransactionRenounceRole(
        role: string
    ): Promise<ethers.ContractTransaction> {
        try {
            const tx = await this.contract.renounceRole.populateTransaction(role, this.wallet.address);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    // === Utility functions ===
    /**
     * Estimates gas overrides (gasLimit + EIP-1559 or legacy fees) using MetaMask logic.
     */
    async getGasOverrides(txParams: ethers.ContractTransaction | ethers.TransactionRequest, speed: FeeSpeed): Promise<GasOverrides> {
        const gasLimit = await this.provider.estimateGas({...txParams, from: this.wallet.address});
        const chainId = (await this.provider.getNetwork()).chainId;
        try {
            const res = await axios.get(`https://gas.api.infura.io/v3/${ENV.INFURA_API_KEY}/networks/${chainId}/suggestedGasFees`);
            const data = await res.data;
            const suggestion = data[speed];

            const maxFeePerGas = ethers.parseUnits(suggestion.suggestedMaxFeePerGas, "gwei");
            const maxPriorityFeePerGas = ethers.parseUnits(suggestion.suggestedMaxPriorityFeePerGas, "gwei");

            return {
                gasLimit,
                maxFeePerGas,
                maxPriorityFeePerGas,
            };
        } catch (e) {
            // Fallback to legacy gas price if EIP-1559 estimation fails
            try {
                const gasPriceHex = await this.provider.send("eth_gasPrice", []);
                const gasPrice = BigInt(gasPriceHex);
    
                return {
                    gasLimit,
                    gasPrice,
                };
            }
            catch {
                return { gasLimit: BigInt(20000) }
            }
        }
    }
}