import * as vscode from 'vscode';
import { StatusInfo } from '../data/types';

export class StatusBarManager {
    private item: vscode.StatusBarItem;

    constructor() {
        this.item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 50);
        this.item.command = 'antigravity.refreshAll';
        this.item.text = '$(database) AG | Offline';
        this.item.tooltip = 'Antigravity Dashboard — Click to refresh';
        this.item.show();
    }

    update(info: StatusInfo): void {
        const connIcon = info.connectionState === 'connected'
            ? '$(database)' : '$(debug-disconnect)';
        const syncText = info.lastSync
            ? this.formatTimeAgo(info.lastSync)
            : 'never';

        this.item.text = `${connIcon} AG | Tasks: ${info.activeTaskCount} | ${syncText}`;

        this.item.tooltip = new vscode.MarkdownString(
            `**Antigravity Dashboard**\n\n` +
            `- DB: ${info.connectionState}\n` +
            `- Active tasks: ${info.activeTaskCount}\n` +
            `- Last sync: ${info.lastSync?.toLocaleTimeString() ?? 'never'}`
        );

        switch (info.connectionState) {
            case 'error':
                this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
                break;
            case 'connecting':
                this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
                break;
            default:
                this.item.backgroundColor = undefined;
        }
    }

    private formatTimeAgo(date: Date): string {
        const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
        if (seconds < 60) { return `${seconds}s ago`; }
        if (seconds < 3600) { return `${Math.floor(seconds / 60)}m ago`; }
        return `${Math.floor(seconds / 3600)}h ago`;
    }

    dispose(): void {
        this.item.dispose();
    }
}
