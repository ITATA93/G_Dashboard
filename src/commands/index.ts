import * as vscode from 'vscode';
import { DataService } from '../data/dataService';
import { StatusBarManager } from '../statusBar/statusBarManager';
import { TasksTreeProvider } from '../providers/tasksTreeProvider';
import { MemoriesTreeProvider } from '../providers/memoriesTreeProvider';
import { PromptsTreeProvider } from '../providers/promptsTreeProvider';
import { WorkflowsTreeProvider } from '../providers/workflowsTreeProvider';
import { ProjectsTreeProvider } from '../providers/projectsTreeProvider';
import { AgentsTreeProvider } from '../providers/agentsTreeProvider';
import { TaskStatus, Memory, Prompt } from '../data/types';
import { logger } from '../utils/logger';

interface CommandContext {
    dataService: DataService;
    statusBar: StatusBarManager;
    providers: {
        tasks: TasksTreeProvider;
        projects: ProjectsTreeProvider;
        memories: MemoriesTreeProvider;
        prompts: PromptsTreeProvider;
        workflows: WorkflowsTreeProvider;
        agents: AgentsTreeProvider;
    };
    refreshAll: () => Promise<void>;
}

export function registerCommands(ctx: CommandContext): vscode.Disposable[] {
    const { dataService, providers, refreshAll } = ctx;

    return [
        // --- Refresh commands ---
        vscode.commands.registerCommand('antigravity.refreshAll', async () => {
            await refreshAll();
            vscode.window.showInformationMessage('Antigravity Dashboard refreshed');
        }),
        vscode.commands.registerCommand('antigravity.refreshTasks', () => providers.tasks.refresh()),
        vscode.commands.registerCommand('antigravity.refreshMemories', () => providers.memories.refresh()),
        vscode.commands.registerCommand('antigravity.refreshPrompts', () => providers.prompts.refresh()),
        vscode.commands.registerCommand('antigravity.refreshWorkflows', () => providers.workflows.refresh()),

        // --- Database commands ---
        vscode.commands.registerCommand('antigravity.connectDatabase', async () => {
            try {
                await dataService.connect();
                await refreshAll();
                vscode.window.showInformationMessage('Connected to Antigravity database');
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                vscode.window.showErrorMessage(`Connection failed: ${msg}`);
            }
        }),
        vscode.commands.registerCommand('antigravity.disconnectDatabase', async () => {
            await dataService.disconnect();
            vscode.window.showInformationMessage('Disconnected from database');
        }),

        // --- Filter commands ---
        vscode.commands.registerCommand('antigravity.filterTasksByStatus', async () => {
            const options: (TaskStatus | 'all')[] = ['all', 'backlog', 'in_progress', 'blocked', 'completed'];
            const pick = await vscode.window.showQuickPick(
                options.map(o => ({ label: o === 'all' ? 'Show All' : o, value: o })),
                { placeHolder: 'Filter tasks by status' }
            );
            if (pick) {
                providers.tasks.setStatusFilter(pick.value === 'all' ? null : pick.value as TaskStatus);
            }
        }),

        vscode.commands.registerCommand('antigravity.filterTasksByProject', async () => {
            const projects = dataService.getProjects();
            const options = [
                { label: 'Show All', value: null as string | null },
                ...projects.map(p => ({ label: p.name, description: p.id, value: p.id })),
            ];
            const pick = await vscode.window.showQuickPick(options, {
                placeHolder: 'Filter tasks by project',
            });
            if (pick) {
                providers.tasks.setProjectFilter(pick.value);
            }
        }),

        // --- Search commands ---
        vscode.commands.registerCommand('antigravity.searchMemories', async () => {
            const term = await vscode.window.showInputBox({
                placeHolder: 'Search memories...',
                prompt: 'Enter a search term to filter memories by content or tags',
            });
            if (term !== undefined) {
                if (dataService.connectionState === 'connected' && term) {
                    const results = await dataService.searchMemoriesPg(term);
                    // Update the in-memory cache and refresh
                    logger.info(`Memory search: ${results.length} results for "${term}"`);
                }
                providers.memories.setSearchTerm(term || null);
            }
        }),

        // --- Navigation commands ---
        vscode.commands.registerCommand('antigravity.navigateToProject', async (item?: { project?: { path: string } }) => {
            const projectPath = item?.project?.path;
            if (!projectPath) { return; }

            const genOs = dataService.getGenOsRoot();
            if (!genOs) {
                vscode.window.showWarningMessage('GEN_OS root not detected');
                return;
            }
            const fullPath = vscode.Uri.file(
                require('path').resolve(genOs, projectPath)
            );
            try {
                await vscode.commands.executeCommand('vscode.openFolder', fullPath, { forceNewWindow: false });
            } catch {
                vscode.window.showErrorMessage(`Cannot open: ${fullPath.fsPath}`);
            }
        }),

        vscode.commands.registerCommand('antigravity.openWorkflowSpec', async (item?: { specPath?: string }) => {
            const specPath = item?.specPath;
            if (!specPath) { return; }

            const resolved = dataService.resolveGenOsPath(specPath);
            if (resolved) {
                const doc = await vscode.workspace.openTextDocument(resolved);
                await vscode.window.showTextDocument(doc);
            } else {
                vscode.window.showWarningMessage(`Cannot resolve: ${specPath}`);
            }
        }),

        // --- Detail view commands (webview placeholders for Phase 3) ---
        vscode.commands.registerCommand('antigravity.viewMemoryDetail', async (memory?: Memory) => {
            if (!memory) { return; }
            const full = await dataService.getMemoryById(memory.id);
            if (!full) { return; }

            const panel = vscode.window.createWebviewPanel(
                'antigravity.memoryDetail',
                `Memory #${full.id}`,
                vscode.ViewColumn.One,
                { enableScripts: false },
            );
            panel.webview.html = renderMemoryHtml(full);
        }),

        vscode.commands.registerCommand('antigravity.viewPromptVersions', async (prompt?: Prompt) => {
            if (!prompt) { return; }
            const versions = await dataService.getPromptVersions(prompt.id);
            if (versions.length === 0) { return; }

            const panel = vscode.window.createWebviewPanel(
                'antigravity.promptVersions',
                `Prompt: ${prompt.id}`,
                vscode.ViewColumn.One,
                { enableScripts: false },
            );
            panel.webview.html = renderPromptHtml(prompt.id, versions);
        }),

        vscode.commands.registerCommand('antigravity.viewWorkflowDiagram', async () => {
            vscode.window.showInformationMessage('Workflow diagram view coming in v1.0');
        }),
    ];
}

// --- Simple HTML renderers ---

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderMemoryHtml(memory: Memory): string {
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
body { font-family: var(--vscode-font-family); padding: 16px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
td, th { padding: 6px 12px; text-align: left; border: 1px solid var(--vscode-panel-border); }
th { background: var(--vscode-editor-lineHighlightBackground); }
pre { background: var(--vscode-textCodeBlock-background); padding: 12px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
.verified { background: #2ea04366; color: #2ea043; }
.unverified { background: #d29922aa; color: #d29922; }
.derived { background: #388bfd66; color: #388bfd; }
</style></head><body>
<h2>Memory #${memory.id}</h2>
<table>
<tr><th>Project</th><td>${escapeHtml(memory.project_id)}</td></tr>
<tr><th>Agent</th><td>${escapeHtml(memory.agent_id)}</td></tr>
<tr><th>Type</th><td>${escapeHtml(memory.memory_type)}</td></tr>
<tr><th>Trust</th><td><span class="badge ${memory.trust_level}">${escapeHtml(memory.trust_level)}</span></td></tr>
${memory.confidence != null ? `<tr><th>Confidence</th><td>${(memory.confidence * 100).toFixed(1)}%</td></tr>` : ''}
<tr><th>Tags</th><td>${memory.tags?.map(t => `<code>${escapeHtml(t)}</code>`).join(' ') || 'none'}</td></tr>
<tr><th>Created</th><td>${escapeHtml(memory.created_at)}</td></tr>
</table>
<h3>Content</h3>
<pre>${escapeHtml(memory.content)}</pre>
</body></html>`;
}

function renderPromptHtml(promptId: string, versions: Prompt[]): string {
    const rows = versions.map(v => `
<tr>
<td>v${v.version}</td>
<td><span class="badge ${v.label}">${escapeHtml(v.label)}</span></td>
<td>${escapeHtml(v.vendor)}</td>
<td>${escapeHtml(v.changelog || '-')}</td>
<td>${escapeHtml(v.created_at)}</td>
</tr>`).join('');

    const latest = versions[0];
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
body { font-family: var(--vscode-font-family); padding: 16px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
table { border-collapse: collapse; width: 100%; margin-bottom: 16px; }
td, th { padding: 6px 12px; text-align: left; border: 1px solid var(--vscode-panel-border); }
th { background: var(--vscode-editor-lineHighlightBackground); }
pre { background: var(--vscode-textCodeBlock-background); padding: 12px; border-radius: 4px; white-space: pre-wrap; word-wrap: break-word; }
.badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
.production { background: #2ea04366; color: #2ea043; }
.staging { background: #388bfd66; color: #388bfd; }
.dev { background: #d29922aa; color: #d29922; }
</style></head><body>
<h2>Prompt: ${escapeHtml(promptId)}</h2>
<h3>Versions</h3>
<table>
<tr><th>Version</th><th>Label</th><th>Vendor</th><th>Changelog</th><th>Created</th></tr>
${rows}
</table>
<h3>Latest Content (v${latest.version})</h3>
<pre>${escapeHtml(latest.content)}</pre>
</body></html>`;
}
