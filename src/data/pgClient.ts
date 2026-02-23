import { Pool, PoolConfig, QueryResult } from 'pg';
import { Config } from '../utils/config';
import { logger } from '../utils/logger';
import {
    PG_POOL_MAX, PG_IDLE_TIMEOUT, PG_CONNECT_TIMEOUT, RECONNECT_DELAYS,
} from '../utils/constants';
import { ConnectionState } from './types';

export class PgClient {
    private pool: Pool | null = null;
    private _state: ConnectionState = 'disconnected';
    private reconnectAttempt = 0;
    private reconnectTimer: NodeJS.Timeout | undefined;

    private _onStateChange: ((state: ConnectionState) => void) | null = null;
    onStateChange(cb: (state: ConnectionState) => void): void { this._onStateChange = cb; }

    get state(): ConnectionState { return this._state; }

    private setState(s: ConnectionState): void {
        this._state = s;
        this._onStateChange?.(s);
    }

    private buildConfig(): PoolConfig {
        const url = Config.databaseUrl;
        if (url) {
            return {
                connectionString: url,
                max: PG_POOL_MAX,
                idleTimeoutMillis: PG_IDLE_TIMEOUT,
                connectionTimeoutMillis: PG_CONNECT_TIMEOUT,
            };
        }
        return {
            host: Config.databaseHost,
            port: Config.databasePort,
            database: Config.databaseName,
            user: Config.databaseUser,
            password: Config.databasePassword,
            max: PG_POOL_MAX,
            idleTimeoutMillis: PG_IDLE_TIMEOUT,
            connectionTimeoutMillis: PG_CONNECT_TIMEOUT,
        };
    }

    async connect(): Promise<void> {
        if (this._state === 'connected') { return; }
        this.setState('connecting');
        try {
            const cfg = this.buildConfig();
            if (!cfg.connectionString && !cfg.user) {
                throw new Error('No database credentials configured. Set antigravity.databaseUrl or individual fields.');
            }
            this.pool = new Pool(cfg);
            this.pool.on('error', (err) => {
                logger.error(`PG pool error: ${err.message}`);
                this.setState('error');
                this.scheduleReconnect();
            });
            // Test connection
            const client = await this.pool.connect();
            client.release();
            this.setState('connected');
            this.reconnectAttempt = 0;
            logger.info('PostgreSQL connected');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`PostgreSQL connection failed: ${msg}`);
            this.setState('error');
            this.pool = null;
            throw err;
        }
    }

    async disconnect(): Promise<void> {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = undefined;
        }
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
        this.setState('disconnected');
        this.reconnectAttempt = 0;
        logger.info('PostgreSQL disconnected');
    }

    private scheduleReconnect(): void {
        if (this.reconnectTimer) { return; }
        const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)];
        this.reconnectAttempt++;
        logger.info(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempt})`);
        this.reconnectTimer = setTimeout(async () => {
            this.reconnectTimer = undefined;
            try {
                if (this.pool) { await this.pool.end().catch(() => {}); }
                this.pool = null;
                await this.connect();
            } catch {
                this.scheduleReconnect();
            }
        }, delay);
    }

    async query<T extends Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
        if (!this.pool || this._state !== 'connected') {
            return [];
        }
        try {
            const result: QueryResult<T> = await this.pool.query<T>(sql, params);
            return result.rows;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            logger.error(`Query error: ${msg}`);
            if (msg.includes('Connection terminated') || msg.includes('connection refused')) {
                this.setState('error');
                this.scheduleReconnect();
            }
            return [];
        }
    }

    get isConnected(): boolean {
        return this._state === 'connected';
    }

    dispose(): void {
        if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); }
        if (this.pool) { this.pool.end().catch(() => {}); }
    }
}
