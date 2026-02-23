import * as vscode from 'vscode';
import { DataService } from './data/dataService';
import { PgClient } from './data/pgClient';
import { LocalFileReader } from './data/localFileReader';
import { Config } from './utils/config';
import { logger } from './utils/logger';
import { StatusBarManager } from './statusBar/statusBarManager';
import { TasksTreeProvider } from './providers/tasksTreeProvider';
import { ProjectsTreeProvider } from './providers/projectsTreeProvider';
import { MemoriesTreeProvider } from './providers/memoriesTreeProvider';
import { PromptsTreeProvider } from './providers/promptsTreeProvider';
import { WorkflowsTreeProvider } from './providers/workflowsTreeProvider';
import { AgentsTreeProvider } from './providers/agentsTreeProvider';
import { registerCommands } from './commands/index';

let dataService: DataService;
let statusBar: StatusBarManager;
let refreshTimer: ReturnType<typeof setInterval> | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
    logger.info('Activating Antigravity Dashboard...');

    // Initialize data layer
    const pgClient = new PgClient();
    const localReader = new LocalFileReader();
    dataService = new DataService(pgClient, localReader);

    // Initialize status bar
    statusBar = new StatusBarManager();

    // Initialize tree providers
    const tasksProvider = new TasksTreeProvider(dataService);
    const projectsProvider = new ProjectsTreeProvider(dataService);
    const memoriesProvider = new MemoriesTreeProvider(dataService);
    const promptsProvider = new PromptsTreeProvider(dataService);
    const workflowsProvider = new WorkflowsTreeProvider(dataService);
    const agentsProvider = new AgentsTreeProvider(dataService);

    // Register tree views
    const views = [
        vscode.window.createTreeView('antigravity-tasks', {
            treeDataProvider: tasksProvider, showCollapseAll: true,
        }),
        vscode.window.createTreeView('antigravity-projects', {
            treeDataProvider: projectsProvider,
        }),
        vscode.window.createTreeView('antigravity-memories', {
            treeDataProvider: memoriesProvider, showCollapseAll: true,
        }),
        vscode.window.createTreeView('antigravity-prompts', {
            treeDataProvider: promptsProvider, showCollapseAll: true,
        }),
        vscode.window.createTreeView('antigravity-workflows', {
            treeDataProvider: workflowsProvider,
        }),
        vscode.window.createTreeView('antigravity-agents', {
            treeDataProvider: agentsProvider, showCollapseAll: true,
        }),
    ];

    // Refresh function
    const refreshAll = async (): Promise<void> => {
        await dataService.refreshAll();
        statusBar.update({
            connectionState: dataService.connectionState,
            activeTaskCount: dataService.getActiveTaskCount(),
            lastSync: new Date(),
        });
    };

    // Register commands
    const commands = registerCommands({
        dataService,
        statusBar,
        providers: {
            tasks: tasksProvider,
            projects: projectsProvider,
            memories: memoriesProvider,
            prompts: promptsProvider,
            workflows: workflowsProvider,
            agents: agentsProvider,
        },
        refreshAll,
    });

    // Config change listener
    const configListener = Config.onDidChange((e) => {
        if (Config.didChange(e, 'refreshInterval')) {
            setupAutoRefresh();
        }
    });

    // Push all disposables
    context.subscriptions.push(
        statusBar,
        configListener,
        ...views,
        ...commands,
        { dispose: () => { if (refreshTimer) { clearInterval(refreshTimer); } } },
        { dispose: () => dataService.dispose() },
    );

    // Initialize local data (always available)
    await dataService.initialize();

    // Auto-connect if configured
    if (Config.autoConnect) {
        logger.info('Auto-connecting to database...');
        try {
            await dataService.connect();
        } catch {
            logger.warn('Auto-connect failed, operating in local-only mode');
        }
    }

    // Initial refresh
    await refreshAll();

    // Setup auto-refresh timer
    setupAutoRefresh();

    logger.info('Antigravity Dashboard activated');
}

function setupAutoRefresh(): void {
    if (refreshTimer) { clearInterval(refreshTimer); }
    const interval = Config.refreshInterval;
    if (interval > 0) {
        refreshTimer = setInterval(async () => {
            await dataService.refreshAll();
            statusBar.update({
                connectionState: dataService.connectionState,
                activeTaskCount: dataService.getActiveTaskCount(),
                lastSync: new Date(),
            });
        }, interval);
    }
}

export function deactivate(): void {
    logger.info('Deactivating Antigravity Dashboard...');
    if (refreshTimer) { clearInterval(refreshTimer); }
}
