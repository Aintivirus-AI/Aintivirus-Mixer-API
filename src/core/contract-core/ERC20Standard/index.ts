import { ethers } from "ethers";
import { ERC20Standard as IERC20Standard } from "../typechain-types"; // Generated typechain interface
import { ERC20_ABI } from "../../../constant/abi/ERC20";

export default class ERC20Standard {
    private readonly provider: ethers.JsonRpcProvider;
    private readonly wallet: ethers.Wallet;
    private readonly contractAddress: string;
    private contract: IERC20Standard;

    constructor(address: string, rpcUrl: string, privateKey: string) {
        try {
            this.provider = new ethers.JsonRpcProvider(rpcUrl);
            this.wallet = new ethers.Wallet(privateKey, this.provider);
            this.contractAddress = address;
            this.contract = new ethers.Contract(
                this.contractAddress,
                ERC20_ABI,
                this.wallet
            ) as unknown as IERC20Standard;
        } catch (error) {
            throw new Error(`Failed to initialize ERC20Standard: ${(error as Error).message}`);
        }
    }

    // === Read Functions ===

    /**
     * Gets the name of the token
     * @returns Token name
     */
    async name(): Promise<string> {
        try {
            const name = await this.contract.name();
            return name;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the symbol of the token
     * @returns Token symbol
     */
    async symbol(): Promise<string> {
        try {
            const symbol = await this.contract.symbol();
            return symbol;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the number of decimals for the token
     * @returns Token decimals (18)
     */
    async decimals(): Promise<number> {
        try {
            const decimals = await this.contract.decimals();
            return Number(decimals);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the total supply of the token
     * @returns Total supply
     */
    async totalSupply(): Promise<bigint> {
        try {
            const totalSupply = await this.contract.totalSupply();
            return totalSupply;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the balance of an account
     * @param account Account address
     * @returns Account balance
     */
    async balanceOf(account: string): Promise<bigint> {
        try {
            const balance = await this.contract.balanceOf(account);
            return balance;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Gets the allowance of a spender for an owner
     * @param owner Owner address
     * @param spender Spender address
     * @returns Allowance amount
     */
    async allowance(owner: string, spender: string): Promise<bigint> {
        try {
            const allowance = await this.contract.allowance(owner, spender);
            return allowance;
        } catch (error) {
            throw error;
        }
    }

    // === Write Functions ===

    /**
     * Transfers tokens to a recipient
     * @param recipient Recipient address
     * @param amount Amount to transfer
     * @returns Transaction response
     */
    async transfer(
        recipient: string,
        amount: ethers.BigNumberish
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const tx = await this.contract.transfer(recipient, amount.toString());
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Approves a spender to spend tokens
     * @param spender Spender address
     * @param amount Amount to approve
     * @returns Transaction response
     */
    async approve(
        spender: string,
        amount: ethers.BigNumberish
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const tx = await this.contract.approve(spender, amount.toString());
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Transfers tokens from a sender to a recipient using allowance
     * @param sender Sender address
     * @param recipient Recipient address
     * @param amount Amount to transfer
     * @returns Transaction response
     */
    async transferFrom(
        sender: string,
        recipient: string,
        amount: ethers.BigNumberish
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const tx = await this.contract.transferFrom(sender, recipient, amount.toString());
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Increases the allowance of a spender
     * @param spender Spender address
     * @param addedValue Amount to add to allowance
     * @returns Transaction response
     */
    async increaseAllowance(
        spender: string,
        addedValue: ethers.BigNumberish
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const tx = await this.contract.increaseAllowance(spender, addedValue.toString());
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Decreases the allowance of a spender
     * @param spender Spender address
     * @param subtractedValue Amount to subtract from allowance
     * @returns Transaction response
     */
    async decreaseAllowance(
        spender: string,
        subtractedValue: ethers.BigNumberish
    ): Promise<ethers.ContractTransactionResponse> {
        try {
            const tx = await this.contract.decreaseAllowance(spender, subtractedValue.toString());
            return tx;
        } catch (error) {
            throw error;
        }
    }

    // === Raw Transaction Builders ===

    /**
     * Builds a raw transaction for transferring tokens to a recipient
     * @param recipient Recipient address
     * @param amount Amount to transfer
     * @returns Transaction request
     */
    async populateTransactionTransfer(
        recipient: string,
        amount: ethers.BigNumberish
    ): Promise<ethers.TransactionRequest> {
        try {
            const tx = await this.contract.transfer.populateTransaction(recipient, amount.toString());
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Builds a raw transaction for approving a spender to spend tokens
     * @param spender Spender address
     * @param amount Amount to approve
     * @returns Transaction request
     */
    async populateTransactionApprove(
        spender: string,
        amount: ethers.BigNumberish
    ): Promise<ethers.TransactionRequest> {
        try {
            const tx = await this.contract.approve.populateTransaction(spender, amount.toString());
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Builds a raw transaction for transferring tokens from a sender to a recipient
     * @param sender Sender address
     * @param recipient Recipient address
     * @param amount Amount to transfer
     * @returns Transaction request
     */
    async populateTransactionTransferFrom(
        sender: string,
        recipient: string,
        amount: ethers.BigNumberish
    ): Promise<ethers.TransactionRequest> {
        try {
            const tx = await this.contract.transferFrom.populateTransaction(sender, recipient, amount.toString());
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Builds a raw transaction for increasing the allowance of a spender
     * @param spender Spender address
     * @param addedValue Amount to add to allowance
     * @returns Transaction request
     */
    async populateTransactionIncreaseAllowance(
        spender: string,
        addedValue: ethers.BigNumberish
    ): Promise<ethers.TransactionRequest> {
        try {
            const tx = await this.contract.increaseAllowance.populateTransaction(spender, addedValue.toString());
            return tx;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Builds a raw transaction for decreasing the allowance of a spender
     * @param spender Spender address
     * @param subtractedValue Amount to subtract from allowance
     * @returns Transaction request
     */
    async populateTransactionDecreaseAllowance(
        spender: string,
        subtractedValue: ethers.BigNumberish
    ): Promise<ethers.TransactionRequest> {
        try {
            const tx = await this.contract.decreaseAllowance.populateTransaction(spender, subtractedValue.toString());
            return tx;
        } catch (error) {
            throw error;
        }
    }
}