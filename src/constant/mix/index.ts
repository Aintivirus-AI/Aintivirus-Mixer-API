const MIX_CONFIG = {
    ADDRESS: {
        /**
         * Mixer contract address
         */
        // MIXER_CONTRACT_ADDRESS: '0x4Ef7140E39BCbFe6e7EF3bF2A4eE863023Ac894d', // Mainnet
        MIXER_CONTRACT_ADDRESS: '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0', // Testnet
        // MIXER_PROGRAM_ID: '9dkriTcrFcH9NPXMFEdGuT1z1kwsDAkzLaBgDuLond3A',
        MIXER_PROGRAM_ID: '7grL6oHWcuwdBNkqCUrz7JEoHeS5NXv1FDegDr6ViMBi', // Testnet

        /**
         * Mix token address
         */
        ETH_TOKEN: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        SOL_TOKEN: 'Bq2cu6o9bhdecFxD7pLbb3VMakbo9TAQgU8jUUzjCAh3'
    },
    // ETH2SOL_CURRENCY_MAP: { // Mainnet
    //     '0x686c5961370db7f14f57f5a430e05deae64df504': 'BAezfVmia8UYLt4rst6PCU4dvL2i2qHzqn4wGhytpNJW',
    //     '0x0000000000000000000000000000000000000000': 'So11111111111111111111111111111111111111112'
    // },
    // SOL2ETH_CURRENCY_MAP: {
    //     'BAezfVmia8UYLt4rst6PCU4dvL2i2qHzqn4wGhytpNJW': '0x686c5961370db7f14f57f5a430e05deae64df504',
    //     'So11111111111111111111111111111111111111112': '0x0000000000000000000000000000000000000000'
    // },
    EXPIRES: 60 * 2, // 2 minuts
    MIX_FEE: {
        SOLANA: {
            REFUND: 0.01, // 0.01 SOL
            FEE: 100 // 100 SPL Token
        }
    }
}

export default MIX_CONFIG