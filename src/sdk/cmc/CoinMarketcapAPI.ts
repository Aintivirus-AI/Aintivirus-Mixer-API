// ** import external libraries
import axios from "axios";
// ** import local constants
import ENV from "../../constant/env";

export default class CoinMarketcapAPI {
    static getQuoteBySymbol = async (from: string, to: string, amount: number | string = 1): Promise<number> => {
        try {
            const res = await axios.get('https://pro-api.coinmarketcap.com/v2/tools/price-conversion', {
                params: {
                    amount,
                    symbol: from,
                    convert: to
                },
                headers: {
                    'X-CMC_PRO_API_KEY': ENV.CMC_API_KEY
                }
            })

            const price = res.data.data[0].quote[to.toUpperCase()].price
            return price
        }
        catch(error) {
            throw error
        }
    }
}