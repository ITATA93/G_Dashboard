import * as vscode from 'vscode';
import { DataService } from '../data/dataService';
import { Project } from '../data/types';

class ProjectItem extends vscode.TreeItem {
    constructor(public readonly project: Project) {
        super(project.name, vscode.TreeItemCollapsibleState.None);
        this.description = `${project.domain} | ${project.type}`;
        this.tooltip = new vscode.MarkdownString(
            `**${project.name}**\n\n` +
            `- ID: \`${project.id}\`\n` +
            `- Type: ${project.type}\n` +
            `- Domain: ${project.domain}\n` +
            `- Status: ${project.status}\n` +
            `- Phase: ${project.phase}\n` +
            `- Path: \`${project.path}\``
        );
        this.contextValue = 'project';
        this.iconPath = this.getIcon();
    }

    private getIcon(): vscode.ThemeIcon {
        if (this.project.type === 'orchestrator') {
            return new vscode.ThemeIcon('server', new vscode.ThemeColor('charts.purple'));
        }
        switch (this.project.status) {
            case 'active':
                return new vscode.ThemeIcon('check-all', new vscode.ThemeColor('charts.green'));
            case 'planned':
                return new vscode.ThemeIcon('circle-outline', new vscode.ThemeColor('charts.yellow'));
            default:
                return new vscode.ThemeIcon('archive', new vscode.ThemeColor('charts.gray'));
        }
    }
}

export class ProjectsTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private dataService: DataService) {
        dataService.onDidDataChange(() => this.refresh());
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(): vscode.TreeItem[] {
        const projects = this.dataService.getProjects();
        if (projects.length === 0) {
            return [new vscode.TreeItem('No projects found')];
        }
        return projects.map(p => new ProjectItem(p));
    }
}
