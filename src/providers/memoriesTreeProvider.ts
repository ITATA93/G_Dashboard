import * as vscode from 'vscode';
import { DataService } from '../data/dataService';
import { Memory, MemoryType } from '../data/types';

class MemoryItem extends vscode.TreeItem {
    constructor(public readonly memory: Memory) {
        const preview = memory.content.slice(0, 60).replace(/\n/g, ' ');
        super(preview, vscode.TreeItemCollapsibleState.None);
        this.description = `${memory.trust_level}${memory.confidence != null ? ` (${(memory.confidence * 100).toFixed(0)}%)` : ''}`;
        this.tooltip = new vscode.MarkdownString(
            `**Memory #${memory.id}**\n\n` +
            `- Type: ${memory.memory_type}\n` +
            `- Project: ${memory.project_id}\n` +
            `- Agent: ${memory.agent_id}\n` +
            `- Trust: ${memory.trust_level}\n` +
            (memory.confidence != null ? `- Confidence: ${(memory.confidence * 100).toFixed(1)}%\n` : '') +
            (memory.tags?.length ? `- Tags: ${memory.tags.join(', ')}\n` : '') +
            `\n---\n${memory.content.slice(0, 500)}`
        );
        this.contextValue = 'memory';
        this.iconPath = this.getIcon(memory.trust_level);
        this.command = {
            command: 'antigravity.viewMemoryDetail',
            title: 'View Detail',
            arguments: [memory],
        };
    }

    private getIcon(trust: string): vscode.ThemeIcon {
        switch (trust) {
            case 'verified':
                return new vscode.ThemeIcon('verified', new vscode.ThemeColor('charts.green'));
            case 'derived':
                return new vscode.ThemeIcon('link', new vscode.ThemeColor('charts.blue'));
            case 'unverified':
            default:
                return new vscode.ThemeIcon('question', new vscode.ThemeColor('charts.yellow'));
        }
    }
}

class TypeGroupItem extends vscode.TreeItem {
    constructor(public readonly memoryType: MemoryType, count: number) {
        super(memoryType, vscode.TreeItemCollapsibleState.Expanded);
        this.description = `(${count})`;
        this.contextValue = 'memoryGroup';
        const icons: Record<string, string> = {
            episodic: 'history',
            semantic: 'book',
            decision: 'law',
        };
        this.iconPath = new vscode.ThemeIcon(icons[memoryType] ?? 'database');
    }
}

export class MemoriesTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private searchTerm: string | null = null;

    constructor(private dataService: DataService) {
        dataService.onDidDataChange(() => this._onDidChangeTreeData.fire());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setSearchTerm(term: string | null): void {
        this.searchTerm = term;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
        const memories = this.dataService.getMemories(this.searchTerm ?? undefined);

        if (!element) {
            if (memories.length === 0) {
                return [new vscode.TreeItem(this.searchTerm ? 'No matches found' : 'No memories loaded')];
            }
            const groups = new Map<MemoryType, Memory[]>();
            for (const m of memories) {
                if (!groups.has(m.memory_type)) { groups.set(m.memory_type, []); }
                groups.get(m.memory_type)!.push(m);
            }
            return Array.from(groups.entries()).map(
                ([type, items]) => new TypeGroupItem(type, items.length)
            );
        }

        if (element instanceof TypeGroupItem) {
            return memories
                .filter(m => m.memory_type === element.memoryType)
                .map(m => new MemoryItem(m));
        }

        return [];
    }
}
