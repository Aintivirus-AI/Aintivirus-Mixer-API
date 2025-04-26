import sqlite3 from "sqlite3";
import { Database, open } from "sqlite";

// Updated Mix interface
interface Mix {
    commitment: number;
    nullifierHash: boolean;
}

class SolanaLedger {
    private db: Database<sqlite3.Database, sqlite3.Statement>;
    private dbFilePath: string;

    constructor(dbFilePath: string) {
        this.dbFilePath = dbFilePath;
    }

    async initialize() {
        this.db = await open({
            filename: this.dbFilePath,
            driver: sqlite3.Database,
        });

        // Create table with new `nullifierHash` column
        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS mix (
                id TEXT PRIMARY KEY,
                commitment INTEGER NOT NULL,
                nullifierHash BOOLEAN NOT NULL DEFAULT 0
            )
        `);
    }

    async create(id: string, mix: Mix): Promise<void> {
        const { commitment, nullifierHash } = mix;
        await this.db.run(
            `INSERT INTO mix (id, commitment, nullifierHash) VALUES (?, ?, ?)`,
            id,
            commitment,
            nullifierHash ? 1 : 0
        );
    }

    async read(id: string): Promise<Mix | undefined> {
        const row = await this.db.get<{ commitment: number, nullifierHash: number }>(
            'SELECT commitment, nullifierHash FROM mix WHERE id = ?',
            id
        );
        return row ? {
            commitment: row.commitment,
            nullifierHash: Boolean(row.nullifierHash),
        } : undefined;
    }

    async update(id: string, mix: Partial<Mix>): Promise<void> {
        const updates: string[] = [];
        const values: any[] = [];

        if (mix.commitment !== undefined) {
            updates.push('commitment = ?');
            values.push(mix.commitment);
        }
        if (mix.nullifierHash !== undefined) {
            updates.push('nullifierHash = ?');
            values.push(mix.nullifierHash ? 1 : 0);
        }

        if (updates.length === 0) return;

        values.push(id);
        await this.db.run(
            `UPDATE mix SET ${updates.join(', ')} WHERE id = ?`,
            ...values
        );
    }

    async delete(id: string): Promise<void> {
        await this.db.run('DELETE FROM mix WHERE id = ?', id);
    }

    async readAll(): Promise<Mix[]> {
        const rows = await this.db.all<{ commitment: number, nullifierHash: number }[]>(
            'SELECT commitment, nullifierHash FROM mix'
        );
        return rows.map(row => ({
            commitment: row.commitment,
            nullifierHash: Boolean(row.nullifierHash),
        }));
    }

    async close(): Promise<void> {
        await this.db.close();
    }
}

export default SolanaLedger;
