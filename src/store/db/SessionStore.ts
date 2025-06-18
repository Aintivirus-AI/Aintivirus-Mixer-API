import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";

// Updated Session interface with `mixType`
export interface Session {
    id: string;
    expiresAt: number | string;
    mixType: 'SIMPLE' | 'BRIDGE';
    txHash: string;
    sender: string;
    amount: number;
    currency: string;
    zkSecret: string;
    secret: string;
    nullifier: string;
    commitment: string;
}

class SessionStore {
    private db: Database<sqlite3.Database, sqlite3.Statement>;
    private dbFilePath: string;

    constructor(dbFilePath: string) {
        this.dbFilePath = dbFilePath;
    }

    async initialize() {
        try {
            this.db = await open({
                filename: this.dbFilePath,
                driver: sqlite3.Database,
            });

            await this.db.exec(`
                CREATE TABLE IF NOT EXISTS session (
                    id TEXT PRIMARY KEY,
                    expiresAt TEXT NOT NULL,
                    mixType TEXT NOT NULL,
                    txHash TEXT NOT NULL,
                    sender TEXT NOT NULL,
                    amount REAL NOT NULL,
                    currency TEXT NOT NULL,
                    zkSecret TEXT NOT NULL,
                    secret TEXT NOT NULL,
                    nullifier TEXT NOT NULL,
                    commitment TEXT NOT NULL
                )
            `);
        } catch (error) {
            throw error;
        }
    }

    async create(session: Session): Promise<void> {
        try {
            const { id, expiresAt, mixType, txHash, sender, amount, currency, zkSecret, secret, nullifier, commitment } = session;
            await this.db.run(
                `INSERT INTO session (id, expiresAt, mixType, txHash, sender, amount, currency, zkSecret, secret, nullifier, commitment)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                id,
                expiresAt,
                mixType,
                txHash,
                sender,
                amount,
                currency,
                zkSecret,
                secret,
                nullifier,
                commitment
            );
        } catch (error) {
            throw error;
        }
    }

    async read(id: string): Promise<Session | undefined> {
        try {
            return await this.db.get<Session>(
                'SELECT * FROM session WHERE id = ?',
                id
            );
        } catch (error) {
            throw error;
        }
    }

    async update(id: string, session: Partial<Session>): Promise<void> {
        try {
            const existing = await this.read(id);
            if (!existing) return;

            const updated: Session = {
                ...existing,
                ...session,
            };

            const { expiresAt, mixType, txHash, sender, amount, currency, zkSecret, secret, nullifier, commitment } = updated;

            await this.db.run(
                `UPDATE session SET expiresAt = ?, mixType = ?, txHash = ?, sender = ?, amount = ?, currency = ?, zkSecret = ?, secret = ?, nullifier = ?, commitment = ? WHERE id = ?`,
                expiresAt,
                mixType,
                txHash,
                sender,
                amount,
                currency,
                zkSecret,
                secret,
                nullifier,
                commitment,
                id
            );
        } catch (error) {
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        try {
            await this.db.run('DELETE FROM session WHERE id = ?', id);
        } catch (error) {
            throw error;
        }
    }

    async readAll(): Promise<Session[]> {
        try {
            return await this.db.all<Session[]>('SELECT * FROM session');
        } catch (error) {
            throw error;
        }
    }

    async close(): Promise<void> {
        try {
            await this.db.close();
        } catch (error) {
            throw error;
        }
    }
}

export default SessionStore;
