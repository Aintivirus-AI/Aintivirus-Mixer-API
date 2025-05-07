import { ContractTransaction, ethers } from "ethers";
import { AintiVirusMixer as IAintiVirusMixer } from "../typechain-types"; // Generated typechain interface
import { MIXER_ABI } from "../../../constant/abi/Mixer";

export default class AintiVirusMixer {
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

    // === Constant and Immutable Variables ===

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
     * Gets the TREE_HEIGHT constant
     * @returns The Merkle tree height (20)
     */
    async getTreeHeight(): Promise<bigint> {
        try {
            return BigInt(20); // Constant in contract
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the Groth16 verifier address
     * @returns Verifier contract address
     */
    async getVerifier(): Promise<string> {
        try {
            const verifier = await this.contract.verifier();
            return verifier;
        } catch (error) {
            throw error;
        }
    }

    // === Nullifier Mappings ===

    /**
     * Checks if a nullifier has been used for Ethereum
     * @param nullifierHash Nullifier hash
     * @returns Whether the nullifier is used
     */
    async isEthNullifierUsed(nullifierHash: string): Promise<boolean> {
        try {
            const isUsed = await this.contract.ethUsedNullifiers(nullifierHash);
            return isUsed;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Checks if a nullifier has been used for Solana
     * @param nullifierHash Nullifier hash
     * @returns Whether the nullifier is used
     */
    async isSolNullifierUsed(nullifierHash: string): Promise<boolean> {
        try {
            const status = await this.contract.solUsedNullifiers(nullifierHash);
            return status == BigInt(0);
        } catch (error) {
            throw error;
        }
    }

    // === Merkle Path and Indices ===

    /**
     * Computes the Merkle path indices for a given leaf index
     * @param index Leaf index
     * @returns Array of 0s and 1s indicating left (0) or right (1) siblings
     */
    async computePathIndices(index: ethers.BigNumberish): Promise<number[]> {
        try {
            const treeHeight = await this.getTreeHeight();
            const pathIndices: number[] = new Array(Number(treeHeight)).fill(0);
            let currentIndex = Number(index);
            for (let level = 0; level < treeHeight; level++) {
                pathIndices[level] = currentIndex % 2; // 0 for left, 1 for right
                currentIndex = Math.floor(currentIndex / 2);
            }
            return pathIndices;
        } catch (error) {
            throw error;
        }
    }

    // === Writable Functions ===

    /**
     * Deposits funds into the contract for Solana withdrawal
     * @param currency Address of the ERC20 token (or zero address for ETH)
     * @param amount Amount to deposit
     * @param commitment Commitment hash
     * @returns Transaction response
     */
    async deposit(
        currency: string,
        amount: ethers.BigNumberish,
        commitment: ethers.BigNumberish
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const isEth = currency === ethers.ZeroAddress;
            const value = isEth ? BigInt(amount) : BigInt(0);
            const tx = await this.contract.deposit(currency, amount, commitment, { value });
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Adds a commitment for Ethereum withdrawal (operator only)
     * @param commitment Commitment hash
     * @returns Transaction response
     */
    async addCommitmentForEthWithdrawal(
        commitment: ethers.BigNumberish
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const tx = await this.contract.addCommitmentForEthWithdrawal(commitment);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Withdraws funds from the Ethereum Merkle tree
     * @param proofA Proof A for zk-SNARK
     * @param proofB Proof B for zk-SNARK
     * @param proofC Proof C for zk-SNARK
     * @param pubSignals Public signals for zk-SNARK
     * @returns Transaction response
     */
    async withdraw(
        proofA: [ethers.BigNumberish, ethers.BigNumberish],
        proofB: [[ethers.BigNumberish, ethers.BigNumberish], [ethers.BigNumberish, ethers.BigNumberish]],
        proofC: [ethers.BigNumberish, ethers.BigNumberish],
        pubSignals: [ethers.BigNumberish, ethers.BigNumberish, ethers.BigNumberish, ethers.BigNumberish, ethers.BigNumberish]
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const tx = await this.contract.withdraw(proofA, proofB, proofC, pubSignals);
            return tx;
        } catch (error) {
            throw error;
        }
    }
    /**
     * Verifies a Solana withdrawal proof
     * @param proofA Proof A for zk-SNARK
     * @param proofB Proof B for zk-SNARK
     * @param proofC Proof C for zk-SNARK
     * @param pubSignals Public signals for zk-SNARK
     * @returns Verification result
     */
    async verifySolWithdrawal(
        proofA: [ethers.BigNumberish, ethers.BigNumberish],
        proofB: [[ethers.BigNumberish, ethers.BigNumberish], [ethers.BigNumberish, ethers.BigNumberish]],
        proofC: [ethers.BigNumberish, ethers.BigNumberish],
        pubSignals: [ethers.BigNumberish, ethers.BigNumberish, ethers.BigNumberish, ethers.BigNumberish, ethers.BigNumberish]
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const tx = await this.contract.verifySolWithdrawal(proofA, proofB, proofC, pubSignals);
            return tx;
        } catch (error) {
            throw error;
        }
    }
    /**
     * Sets a nullifier for Solana withdrawal (operator only)
     * @param nullifierHash Nullifier hash
     * @returns Transaction response
     */
    async setNullifierForSolWithdrawal(
        nullifierHash: string
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const bytes32Hash = ethers.zeroPadValue(ethers.toBeHex(nullifierHash), 32)
            const tx = await this.contract.setNullifierForSolWithdrawal(bytes32Hash);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Sets a nullifier for Solana withdrawal (operator only)
     * @param nullifierHash Nullifier hash
     * @returns Transaction response
     */
    async revertNullifierForSolWithdrawal(
        nullifierHash: string
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const bytes32Hash = ethers.zeroPadValue(ethers.toBeHex(nullifierHash), 32)
            const tx = await this.contract.revertNullifierForSolWithdrawal(bytes32Hash);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    // === Raw Transaction Builders ===

    /**
     * Builds a raw transaction for depositing funds into the contract for Solana withdrawal
     * @param currency Address of the ERC20 token (or zero address for ETH)
     * @param amount Amount to deposit
     * @param commitment Commitment hash
     * @returns Transaction request
     */
    async populateTransactionDeposit(
        currency: string,
        amount: ethers.BigNumberish,
        commitment: ethers.BigNumberish
    ): Promise<ethers.ContractTransaction> {
        try {
            const isEth = currency === ethers.ZeroAddress;
            const value = isEth ? BigInt(amount).toString() : BigInt(0).toString();
            const tx = await this.contract.deposit.populateTransaction(currency, amount.toString(), commitment, { value });
            
            return JSON.parse(
                JSON.stringify(tx, (_key, value) =>
                    typeof value === 'bigint' ? value.toString() : value
                )
            );
        } catch (error) {
            console.error(error)
            throw error;
        }
    }

    /**
     * Builds a raw transaction for adding a commitment for Ethereum withdrawal (operator only)
     * @param commitment Commitment hash
     * @returns Transaction request
     */
    async populateTransactionAddCommitmentForEthWithdrawal(
        commitment: ethers.BigNumberish
    ): Promise<ethers.ContractTransaction> {
        try {
            const tx = await this.contract.addCommitmentForEthWithdrawal.populateTransaction(commitment);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Builds a raw transaction for withdrawing funds from the Ethereum Merkle tree
     * @param proofA Proof A for zk-SNARK
     * @param proofB Proof B for zk-SNARK
     * @param proofC Proof C for zk-SNARK
     * @param pubSignals Public signals for zk-SNARK
     * @returns Transaction request
     */
    async populateTransactionWithdraw(
        proofA: [ethers.BigNumberish, ethers.BigNumberish],
        proofB: [[ethers.BigNumberish, ethers.BigNumberish], [ethers.BigNumberish, ethers.BigNumberish]],
        proofC: [ethers.BigNumberish, ethers.BigNumberish],
        pubSignals: [ethers.BigNumberish, ethers.BigNumberish, ethers.BigNumberish, ethers.BigNumberish, ethers.BigNumberish]
    ): Promise<ethers.ContractTransaction> {
        try {
            const tx = await this.contract.withdraw.populateTransaction(proofA, proofB, proofC, pubSignals);
            return tx;
        } catch (error) {
            throw error;
        }
    }
    /**
     * Builds a raw transaction for setting a nullifier for Solana withdrawal (operator only)
     * @param nullifierHash Nullifier hash
     * @returns Transaction request
     */
    async populateTransactionSetNullifierForSolWithdrawal(
        nullifierHash: string
    ): Promise<ethers.ContractTransaction> {
        try {
            const tx = await this.contract.setNullifierForSolWithdrawal.populateTransaction(nullifierHash);
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Builds a raw transaction for granting a role to an account (admin only)
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
     * Builds a raw transaction for revoking a role from an account (admin only)
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
     * Builds a raw transaction for renouncing a role for the caller (self only)
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

    // === AccessControl Functions ===

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
            return ethers.ZeroAddress; // DEFAULT_ADMIN_ROLE is 0x00 in AccessControl
        } catch (error) {
            throw error;
        }
    }
}