import * as vscode from 'vscode';
import { DataService } from '../data/dataService';
import { LocalAgent } from '../data/types';

class AgentItem extends vscode.TreeItem {
    constructor(agent: LocalAgent) {
        super(agent.name, vscode.TreeItemCollapsibleState.Collapsed);
        this.description = `${agent.vendor_preference} | ${agent.risk_tier}`;
        this.tooltip = new vscode.MarkdownString(
            `**${agent.name}** (\`${agent.id}\`)\n\n` +
            `- Vendor: ${agent.vendor_preference}\n` +
            `- Supported: ${agent.supported_vendors.join(', ')}\n` +
            `- Risk Tier: ${agent.risk_tier}\n` +
            `- Needs Approval: ${agent.needs_approval ? 'Yes' : 'No'}\n` +
            `- Capabilities: ${agent.capabilities.join(', ')}`
        );
        this.contextValue = 'agent';
        this.iconPath = this.getIcon(agent.risk_tier);
    }

    private getIcon(riskTier: string): vscode.ThemeIcon {
        switch (riskTier) {
            case 'low':
                return new vscode.ThemeIcon('robot', new vscode.ThemeColor('charts.green'));
            case 'medium':
                return new vscode.ThemeIcon('robot', new vscode.ThemeColor('charts.yellow'));
            case 'high':
                return new vscode.ThemeIcon('robot', new vscode.ThemeColor('charts.red'));
            default:
                return new vscode.ThemeIcon('robot');
        }
    }
}

class CapabilityItem extends vscode.TreeItem {
    constructor(capability: string) {
        super(capability, vscode.TreeItemCollapsibleState.None);
        this.iconPath = new vscode.ThemeIcon('symbol-method');
    }
}

export class AgentsTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    private agents: LocalAgent[] = [];

    constructor(private dataService: DataService) {
        dataService.onDidDataChange(() => this.refresh());
    }

    refresh(): void {
        this.agents = this.dataService.getAgents();
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: vscode.TreeItem): vscode.TreeItem[] {
        if (!element) {
            this.agents = this.dataService.getAgents();
            if (this.agents.length === 0) {
                return [new vscode.TreeItem('No agents found')];
            }
            return this.agents.map(a => new AgentItem(a));
        }

        if (element instanceof AgentItem) {
            const agent = this.agents.find(a => a.name === element.label);
            if (agent) {
                return agent.capabilities.map(c => new CapabilityItem(c));
            }
        }

        return [];
    }
}
