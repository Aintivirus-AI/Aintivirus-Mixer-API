// ** import custom type
import { ResponsePayload, RequestPayload } from "../../types"

class DataController {
    /**
     * 
     * @param {RequestPayload} payload 
     * @returns {ResponsePayload}
     */
    static checkResponse = (payload: RequestPayload): ResponsePayload => {
        try {
            return { data: payload }
        }
        catch(error) {
            throw error
        }
    }
}

export default DataController