import * as vscode from 'vscode';
import { OUTPUT_CHANNEL_NAME, CONFIG_SECTION } from './constants';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';
const LOG_PRIORITY: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

class Logger {
    private channel: vscode.OutputChannel;

    constructor() {
        this.channel = vscode.window.createOutputChannel(OUTPUT_CHANNEL_NAME);
    }

    private get level(): LogLevel {
        return vscode.workspace.getConfiguration(CONFIG_SECTION).get<LogLevel>('logLevel', 'info');
    }

    private log(level: LogLevel, message: string): void {
        if (LOG_PRIORITY[level] < LOG_PRIORITY[this.level]) {
            return;
        }
        const ts = new Date().toISOString().slice(11, 23);
        this.channel.appendLine(`[${ts}] [${level.toUpperCase()}] ${message}`);
    }

    debug(msg: string): void { this.log('debug', msg); }
    info(msg: string): void { this.log('info', msg); }
    warn(msg: string): void { this.log('warn', msg); }
    error(msg: string): void { this.log('error', msg); }

    show(): void { this.channel.show(); }

    dispose(): void { this.channel.dispose(); }
}

export const logger = new Logger();
