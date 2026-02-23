import * as vscode from 'vscode';
import { DataService } from '../data/dataService';
import { Workflow, LocalWorkflow } from '../data/types';

class WorkflowItem extends vscode.TreeItem {
    public specPath?: string;
    public designPath?: string;

    constructor(workflow: Workflow, local?: LocalWorkflow) {
        super(workflow.name, vscode.TreeItemCollapsibleState.None);
        const stepsCount = local?.steps_count ?? workflow.steps.length;
        this.description = `${workflow.trigger} | ${stepsCount} steps`;
        this.tooltip = new vscode.MarkdownString(
            `**${workflow.name}** (\`${workflow.id}\`)\n\n` +
            `- Owner: ${workflow.owner}\n` +
            `- Trigger: \`${workflow.trigger}\`\n` +
            `- Steps: ${stepsCount}\n` +
            `- Status: ${workflow.status}\n` +
            (local?.spec_path ? `- Spec: \`${local.spec_path}\`\n` : '') +
            (local?.design_path ? `- Design: \`${local.design_path}\`\n` : '')
        );
        this.contextValue = 'workflow';
        this.specPath = local?.spec_path;
        this.designPath = local?.design_path;
        this.iconPath = this.getIcon(workflow.status);
    }

    private getIcon(status: string): vscode.ThemeIcon {
        switch (status) {
            case 'active':
                return new vscode.ThemeIcon('play-circle', new vscode.ThemeColor('charts.green'));
            case 'draft':
                return new vscode.ThemeIcon('edit', new vscode.ThemeColor('charts.yellow'));
            case 'deprecated':
                return new vscode.ThemeIcon('archive', new vscode.ThemeColor('charts.gray'));
            default:
                return new vscode.ThemeIcon('symbol-event');
        }
    }
}

export class WorkflowsTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
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
        const workflows = this.dataService.getWorkflows();
        const localWorkflows = this.dataService.getLocalWorkflows();
        const localMap = new Map(localWorkflows.map(w => [w.workflow_id, w]));

        if (workflows.length === 0) {
            return [new vscode.TreeItem('No workflows found')];
        }

        return workflows.map(w => new WorkflowItem(w, localMap.get(w.id)));
    }
}
