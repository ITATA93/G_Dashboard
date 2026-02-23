import * as vscode from 'vscode';
import { DataService } from '../data/dataService';
import { Task, TaskStatus } from '../data/types';

class TaskItem extends vscode.TreeItem {
    constructor(public readonly task: Task) {
        super(task.title, vscode.TreeItemCollapsibleState.None);
        this.description = `${task.priority} | ${task.assigned_to ?? 'unassigned'}`;
        this.tooltip = new vscode.MarkdownString(
            `**${task.title}**\n\n` +
            `- Status: ${task.status}\n` +
            `- Priority: ${task.priority}\n` +
            `- Project: ${task.project_id}\n` +
            (task.assigned_to ? `- Assigned: ${task.assigned_to}\n` : '') +
            (task.tags?.length ? `- Tags: ${task.tags.join(', ')}\n` : '') +
            (task.description ? `\n---\n${task.description.slice(0, 300)}` : '')
        );
        this.contextValue = 'task';
        this.iconPath = this.getIcon(task.status);
    }

    private getIcon(status: TaskStatus): vscode.ThemeIcon {
        switch (status) {
            case 'completed':
                return new vscode.ThemeIcon('pass-filled', new vscode.ThemeColor('charts.green'));
            case 'in_progress':
                return new vscode.ThemeIcon('sync~spin', new vscode.ThemeColor('charts.blue'));
            case 'blocked':
                return new vscode.ThemeIcon('error', new vscode.ThemeColor('charts.red'));
            case 'backlog':
            default:
                return new vscode.ThemeIcon('circle-outline');
        }
    }
}

class GroupItem extends vscode.TreeItem {
    constructor(label: string, public readonly groupKey: string, count: number) {
        super(label, vscode.TreeItemCollapsibleState.Expanded);
        this.description = `(${count})`;
        this.contextValue = 'taskGroup';
        this.iconPath = new vscode.ThemeIcon('folder');
    }
}

export class TasksTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private statusFilter: TaskStatus | null = null;
    private projectFilter: string | null = null;

    constructor(private dataService: DataService) {
        dataService.onDidDataChange(() => this._onDidChangeTreeData.fire());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    setStatusFilter(status: TaskStatus | null): void {
        this.statusFilter = status;
        this._onDidChangeTreeData.fire();
    }

    setProjectFilter(projectId: string | null): void {
        this.projectFilter = projectId;
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
        const tasks = this.dataService.getTasks({
            status: this.statusFilter ?? undefined,
            projectId: this.projectFilter ?? undefined,
        });

        if (!element) {
            if (tasks.length === 0) {
                return [new vscode.TreeItem('No tasks found')];
            }
            // Group by project
            const groups = new Map<string, Task[]>();
            for (const task of tasks) {
                const key = task.project_id;
                if (!groups.has(key)) { groups.set(key, []); }
                groups.get(key)!.push(task);
            }
            return Array.from(groups.entries()).map(
                ([key, items]) => new GroupItem(key, key, items.length)
            );
        }

        if (element instanceof GroupItem) {
            return tasks
                .filter(t => t.project_id === element.groupKey)
                .map(t => new TaskItem(t));
        }

        return [];
    }
}
