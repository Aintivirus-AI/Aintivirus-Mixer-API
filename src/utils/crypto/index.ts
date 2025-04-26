import { randomBytes } from "crypto";

export default class CryptoUtil {
    static generate32BytesRandomHash = () => {
        const randomBytesString = randomBytes(32)
        const hashString = randomBytesString.toString('hex')

        return hashString
    }
}