const ENV = {
    ETH_POOL_PRIVKEY: process.env.ETH_POOL_PRIVKEY as string,
    SOL_POOL_PRIVKEY: process.env.SOL_POOL_PRIVKEY as string,
    CMC_API_KEY: process.env.CMC_API_KEY as string,
    ETHEREUM_RPC_URL: process.env.ETHEREUM_RPC_URL as string,
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL as string,
}

export default ENV