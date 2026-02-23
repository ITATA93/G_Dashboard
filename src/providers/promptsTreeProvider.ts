import * as vscode from 'vscode';
import { DataService } from '../data/dataService';
import { Prompt, PromptType } from '../data/types';

class PromptItem extends vscode.TreeItem {
    constructor(public readonly prompt: Prompt) {
        super(prompt.id, vscode.TreeItemCollapsibleState.None);
        this.description = `v${prompt.version} [${prompt.label}] ${prompt.vendor}`;
        this.tooltip = new vscode.MarkdownString(
            `**${prompt.id}** v${prompt.version}\n\n` +
            `- Type: ${prompt.type}\n` +
            `- Label: ${prompt.label}\n` +
            `- Vendor: ${prompt.vendor}\n` +
            (prompt.changelog ? `- Changelog: ${prompt.changelog}\n` : '') +
            `\n---\n${prompt.content.slice(0, 400)}`
        );
        this.contextValue = 'prompt';
        this.iconPath = this.getIcon(prompt.label);
        this.command = {
            command: 'antigravity.viewPromptVersions',
            title: 'View Versions',
            arguments: [prompt],
        };
    }

    private getIcon(label: string): vscode.ThemeIcon {
        switch (label) {
            case 'production':
                return new vscode.ThemeIcon('star-full', new vscode.ThemeColor('charts.green'));
            case 'staging':
                return new vscode.ThemeIcon('star-half', new vscode.ThemeColor('charts.blue'));
            case 'dev':
            default:
                return new vscode.ThemeIcon('star-empty', new vscode.ThemeColor('charts.yellow'));
        }
    }
}

class TypeGroupItem extends vscode.TreeItem {
    constructor(public readonly promptType: PromptType, count: number) {
        super(promptType, vscode.TreeItemCollapsibleState.Expanded);
        this.description = `(${count})`;
        this.contextValue = 'promptGroup';
        const icons: Record<string, string> = {
            system: 'settings-gear',
            skill: 'wand',
            template: 'file-text',
            command: 'terminal',
        };
        this.iconPath = new vscode.ThemeIcon(icons[promptType] ?? 'file');
    }
}

export class PromptsTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private dataService: DataService) {
        dataService.onDidDataChange(() => this._onDidChangeTreeData.fire());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
        const prompts = this.dataService.getPrompts();

        if (!element) {
            if (prompts.length === 0) {
                return [new vscode.TreeItem('No prompts loaded')];
            }
            const groups = new Map<PromptType, Prompt[]>();
            for (const p of prompts) {
                if (!groups.has(p.type)) { groups.set(p.type, []); }
                groups.get(p.type)!.push(p);
            }
            return Array.from(groups.entries()).map(
                ([type, items]) => new TypeGroupItem(type, items.length)
            );
        }

        if (element instanceof TypeGroupItem) {
            return prompts
                .filter(p => p.type === element.promptType)
                .map(p => new PromptItem(p));
        }

        return [];
    }
}
