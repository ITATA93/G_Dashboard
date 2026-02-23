import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises';
import { Config } from '../utils/config';
import { logger } from '../utils/logger';
import { PATHS } from '../utils/constants';
import {
    ProjectRegistry, LocalProject,
    WorkflowRegistry, LocalWorkflow,
    AgentManifest, LocalAgent,
} from './types';

export class LocalFileReader {
    private genOsRoot: string | null = null;
    private watchers: vscode.FileSystemWatcher[] = [];
    private _onDidFilesChange = new vscode.EventEmitter<void>();
    readonly onDidFilesChange = this._onDidFilesChange.event;

    async initialize(): Promise<void> {
        this.genOsRoot = await this.detectGenOsPath();
        if (this.genOsRoot) {
            logger.info(`GEN_OS detected at: ${this.genOsRoot}`);
            this.setupWatchers();
        } else {
            logger.warn('GEN_OS path not found. Local file reading disabled.');
        }
    }

    private async detectGenOsPath(): Promise<string | null> {
        // 1. Check explicit config
        const configured = Config.genOsPath;
        if (configured && await this.isValidGenOs(configured)) {
            return configured;
        }

        // 2. Scan workspace folders
        const folders = vscode.workspace.workspaceFolders ?? [];
        for (const folder of folders) {
            const folderPath = folder.uri.fsPath;
            // Check if folder itself is GEN_OS
            if (await this.isValidGenOs(folderPath)) {
                return folderPath;
            }
            // Check sibling: ../GEN_OS
            const sibling = path.resolve(folderPath, '..', 'GEN_OS');
            if (await this.isValidGenOs(sibling)) {
                return sibling;
            }
        }

        return null;
    }

    private async isValidGenOs(dir: string): Promise<boolean> {
        try {
            const registryPath = path.join(dir, PATHS.PROJECT_REGISTRY);
            await fs.access(registryPath);
            return true;
        } catch {
            return false;
        }
    }

    private setupWatchers(): void {
        if (!this.genOsRoot) { return; }

        const patterns = [
            PATHS.PROJECT_REGISTRY,
            PATHS.WORKFLOW_REGISTRY,
            PATHS.AGENT_MANIFEST,
        ];

        for (const relPath of patterns) {
            const fullPattern = new vscode.RelativePattern(this.genOsRoot, relPath);
            const watcher = vscode.workspace.createFileSystemWatcher(fullPattern);
            watcher.onDidChange(() => this._onDidFilesChange.fire());
            watcher.onDidCreate(() => this._onDidFilesChange.fire());
            watcher.onDidDelete(() => this._onDidFilesChange.fire());
            this.watchers.push(watcher);
        }
    }

    private async readJSON<T>(relativePath: string): Promise<T | null> {
        if (!this.genOsRoot) { return null; }
        const fullPath = path.join(this.genOsRoot, relativePath);
        try {
            const raw = await fs.readFile(fullPath, 'utf-8');
            return JSON.parse(raw) as T;
        } catch (err) {
            logger.debug(`Failed to read ${relativePath}: ${err}`);
            return null;
        }
    }

    async getProjects(): Promise<LocalProject[]> {
        const registry = await this.readJSON<ProjectRegistry>(PATHS.PROJECT_REGISTRY);
        return registry?.projects ?? [];
    }

    async getWorkflows(): Promise<LocalWorkflow[]> {
        const registry = await this.readJSON<WorkflowRegistry>(PATHS.WORKFLOW_REGISTRY);
        return registry?.workflows ?? [];
    }

    async getAgents(): Promise<LocalAgent[]> {
        const manifest = await this.readJSON<AgentManifest>(PATHS.AGENT_MANIFEST);
        return manifest?.agents ?? [];
    }

    async getAgentManifest(): Promise<AgentManifest | null> {
        return this.readJSON<AgentManifest>(PATHS.AGENT_MANIFEST);
    }

    getGenOsRoot(): string | null {
        return this.genOsRoot;
    }

    resolveGenOsPath(relativePath: string): string | null {
        if (!this.genOsRoot) { return null; }
        return path.join(this.genOsRoot, relativePath);
    }

    dispose(): void {
        for (const w of this.watchers) { w.dispose(); }
        this.watchers = [];
        this._onDidFilesChange.dispose();
    }
}
