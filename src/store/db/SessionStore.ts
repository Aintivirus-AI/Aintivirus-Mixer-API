import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";

// Define the structure for a Session record
export interface Session {
    id: string;
    expiresAt: number | string;
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

    /**
     * Constructor to initialize the file path of the database
     * @param dbFilePath - Path to the SQLite lesquels

database file
     */
    constructor(dbFilePath: string) {
        this.dbFilePath = dbFilePath;
    }

    /**
     * Initialize the database connection and create the `session` table if it doesn't exist
     */
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

    /**
     * Create a new session entry in the database
     * @param session - The session data
     */
    async create(session: Session): Promise<void> {
        try {
            const { id, expiresAt, txHash, sender, amount, currency, zkSecret, secret, nullifier, commitment } = session;
            await this.db.run(
                `INSERT INTO session (id, expiresAt, txHash, sender, amount, currency, zkSecret, secret, nullifier, commitment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                id,
                expiresAt,
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

    /**
     * Retrieve a session entry by ID
     * @param id - Unique identifier of the session
     * @returns The corresponding Session object or undefined if not found
     */
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

    /**
     * Update a session entry by ID
     * @param id - Unique identifier of the session to update
     * @param session - Partial session object containing fields to update
     */
    async update(id: string, session: Partial<Session>): Promise<void> {
        try {
            const existing = await this.read(id);
            if (!existing) return;
    
            const updated: Session = {
                ...existing,
                ...session,
            };
    
            const { expiresAt, txHash, sender, amount, currency, zkSecret, secret, nullifier, commitment } = updated;
    
            await this.db.run(
                `UPDATE session SET expiresAt = ?, txHash = ?, sender = ?, amount = ?, currency = ?, zkSecret = ?, secret = ?, nullifier = ?, commitment = ? WHERE id = ?`,
                expiresAt,
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

    /**
     * Delete a session entry by ID
     * @param id - Unique identifier of the session to delete
     */
    async delete(id: string): Promise<void> {
        try {
            await this.db.run('DELETE FROM session WHERE id = ?', id);
        } catch (error) {
            throw error;
        }
    }

    /**
     * Retrieve all session entries from the database
     * @returns An array of all Session objects
     */
    async readAll(): Promise<Session[]> {
        try {
            return await this.db.all<Session[]>('SELECT * FROM session');
        } catch (error) {
            throw error;
        }
    }

    /**
     * Close the database connection
     */
    async close(): Promise<void> {
        try {
            await this.db.close();
        } catch (error) {
            throw error;
        }
    }
}

export default SessionStore;