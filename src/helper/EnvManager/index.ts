import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

export type EnvKey = "ETH_POOL_PRIVKEY" | "SOL_POOL_PRIVKEY" | "CMC_API_KEY" | "INFURA_API_KEY" | "ETHEREUM_RPC_URL" | "SOLANA_RPC_URL" | "HOST" | "PORT"

export default class EnvManager {
    static readEnvValues = async (key: EnvKey): Promise<string> => {
        const environment = process.env.NODE_ENV as string

        if(environment === "production") {
            return (await EnvManager.readSecretEnvValues(key))
        }
        else {
            return process.env[key] as string
        }
    }

    static readSecretEnvValues = async (key: EnvKey): Promise<string> => {
        try {
            const secret_name = "mixer-api";

            const client = new SecretsManagerClient({
                region: "us-east-2",
            });

            const response = await client.send(
                new GetSecretValueCommand({
                    SecretId: secret_name,
                    VersionStage: "AWSCURRENT", // VersionStage defaults to AWSCURRENT if unspecified
                })
            );

            const resource =  JSON.parse(response.SecretString);

            return resource[key]
        }
        catch (error) {
            throw error
        }
    }
}