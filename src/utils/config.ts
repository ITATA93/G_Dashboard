import * as vscode from 'vscode';
import { CONFIG_SECTION, DEFAULT_REFRESH_INTERVAL, DEFAULT_MAX_RESULTS } from './constants';

function cfg(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(CONFIG_SECTION);
}

export const Config = {
    get databaseUrl(): string {
        return cfg().get<string>('databaseUrl', '');
    },

    get databaseHost(): string {
        return cfg().get<string>('databaseHost', '10.10.10.101');
    },

    get databasePort(): number {
        return cfg().get<number>('databasePort', 5432);
    },

    get databaseName(): string {
        return cfg().get<string>('databaseName', 'antigravity');
    },

    get databaseUser(): string {
        return cfg().get<string>('databaseUser', '');
    },

    get databasePassword(): string {
        return cfg().get<string>('databasePassword', '');
    },

    get genOsPath(): string {
        return cfg().get<string>('genOsPath', '');
    },

    get autoConnect(): boolean {
        return cfg().get<boolean>('autoConnect', false);
    },

    get refreshInterval(): number {
        return cfg().get<number>('refreshInterval', DEFAULT_REFRESH_INTERVAL);
    },

    get maxResults(): number {
        return cfg().get<number>('maxResults', DEFAULT_MAX_RESULTS);
    },

    onDidChange(listener: (e: vscode.ConfigurationChangeEvent) => void): vscode.Disposable {
        return vscode.workspace.onDidChangeConfiguration((e) => {
            if (e.affectsConfiguration(CONFIG_SECTION)) {
                listener(e);
            }
        });
    },

    didChange(e: vscode.ConfigurationChangeEvent, key: string): boolean {
        return e.affectsConfiguration(`${CONFIG_SECTION}.${key}`);
    },
};
