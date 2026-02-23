import * as vscode from 'vscode';
import { PgClient } from './pgClient';
import { LocalFileReader } from './localFileReader';
import { logger } from '../utils/logger';
import { Config } from '../utils/config';
import {
    Task, Memory, Prompt, Workflow, Project, LocalProject,
    LocalWorkflow, LocalAgent, ConnectionState, StatusInfo,
} from './types';

interface TaskFilter {
    status?: string;
    projectId?: string;
}

export class DataService {
    private _onDidDataChange = new vscode.EventEmitter<void>();
    readonly onDidDataChange = this._onDidDataChange.event;

    // Cached data
    private _projects: Project[] = [];
    private _tasks: Task[] = [];
    private _memories: Memory[] = [];
    private _prompts: Prompt[] = [];
    private _workflows: Workflow[] = [];
    private _localWorkflows: LocalWorkflow[] = [];
    private _agents: LocalAgent[] = [];
    private _activeTaskCount = 0;

    constructor(
        private pg: PgClient,
        private local: LocalFileReader,
    ) {
        this.local.onDidFilesChange(() => {
            this.loadLocalData().then(() => this._onDidDataChange.fire());
        });
        this.pg.onStateChange(() => this._onDidDataChange.fire());
    }

    get connectionState(): ConnectionState {
        return this.pg.state;
    }

    async connect(): Promise<void> {
        await this.pg.connect();
    }

    async disconnect(): Promise<void> {
        await this.pg.disconnect();
    }

    async initialize(): Promise<void> {
        await this.local.initialize();
        await this.loadLocalData();
    }

    async loadLocalData(): Promise<void> {
        const [projects, workflows, agents] = await Promise.all([
            this.local.getProjects(),
            this.local.getWorkflows(),
            this.local.getAgents(),
        ]);

        this._projects = projects.map((p: LocalProject) => ({
            id: p.id,
            name: p.name,
            type: p.type,
            path: p.path_relative,
            domain: p.domain,
            status: p.status,
            phase: p.phase,
        }));

        this._localWorkflows = workflows;
        this._workflows = workflows.map((w: LocalWorkflow) => ({
            id: w.workflow_id,
            name: w.name,
            owner: w.owner,
            trigger: w.trigger,
            steps: [],
            actors: [],
            scripts: [],
            status: 'active' as const,
            created_at: w.generated_at,
        }));

        this._agents = agents;
        logger.debug(`Local data loaded: ${this._projects.length} projects, ${this._workflows.length} workflows, ${this._agents.length} agents`);
    }

    async refreshAll(): Promise<void> {
        await this.loadLocalData();
        if (this.pg.isConnected) {
            await this.refreshFromPg();
        }
        this._onDidDataChange.fire();
    }

    private async refreshFromPg(): Promise<void> {
        const limit = Config.maxResults;

        const [tasks, memories, prompts, workflows, activeCount] = await Promise.all([
            this.pg.query<Task>(
                `SELECT id, project_id, title, description, status, priority, assigned_to, blocked_by, tags, created_at, completed_at
                 FROM tasks ORDER BY
                   CASE priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
                   created_at DESC
                 LIMIT $1`,
                [limit]
            ),
            this.pg.query<Memory>(
                `SELECT id, project_id, agent_id, LEFT(content, 500) as content, memory_type, tags, trust_level, confidence, created_at
                 FROM memories ORDER BY created_at DESC LIMIT $1`,
                [limit]
            ),
            this.pg.query<Prompt>(
                `WITH Ranked AS (
                    SELECT id, version, label, type, vendor, LEFT(content, 200) as content, changelog, created_at,
                           ROW_NUMBER() OVER (PARTITION BY id ORDER BY version DESC) as rn
                    FROM prompts
                 )
                 SELECT id, version, label, type, vendor, content, changelog, created_at
                 FROM Ranked WHERE rn = 1 ORDER BY created_at DESC LIMIT $1`,
                [limit]
            ),
            this.pg.query<Workflow>(
                `SELECT id, name, owner, trigger, steps, actors, scripts, status, created_at
                 FROM workflows WHERE status != 'deprecated' ORDER BY name`,
            ),
            this.pg.query<{ count: string }>(
                `SELECT COUNT(*)::text as count FROM tasks WHERE status = 'in_progress'`,
            ),
        ]);

        this._tasks = tasks;
        this._memories = memories;
        this._prompts = prompts;
        if (workflows.length > 0) {
            this._workflows = workflows;
        }
        this._activeTaskCount = parseInt(activeCount[0]?.count ?? '0', 10);

        // Merge PG projects with local
        const pgProjects = await this.pg.query<Project>(
            `SELECT id, name, type, path, domain, status, phase::text FROM projects ORDER BY name`
        );
        if (pgProjects.length > 0) {
            const localMap = new Map(this._projects.map(p => [p.id, p]));
            for (const pgp of pgProjects) {
                const local = localMap.get(pgp.id);
                if (local) {
                    // Merge: keep local path, use PG status
                    localMap.set(pgp.id, { ...pgp, path: local.path });
                } else {
                    localMap.set(pgp.id, pgp);
                }
            }
            this._projects = Array.from(localMap.values());
        }

        logger.debug(`PG data loaded: ${tasks.length} tasks, ${memories.length} memories, ${prompts.length} prompts`);
    }

    // --- Accessors ---

    getProjects(): Project[] { return this._projects; }
    getAgents(): LocalAgent[] { return this._agents; }
    getLocalWorkflows(): LocalWorkflow[] { return this._localWorkflows; }

    getTasks(filter?: TaskFilter): Task[] {
        let result = this._tasks;
        if (filter?.status) {
            result = result.filter(t => t.status === filter.status);
        }
        if (filter?.projectId) {
            result = result.filter(t => t.project_id === filter.projectId);
        }
        return result;
    }

    getMemories(searchTerm?: string): Memory[] {
        if (!searchTerm) { return this._memories; }
        const lower = searchTerm.toLowerCase();
        return this._memories.filter(m =>
            m.content.toLowerCase().includes(lower) ||
            m.tags.some(t => t.toLowerCase().includes(lower))
        );
    }

    getPrompts(): Prompt[] { return this._prompts; }
    getWorkflows(): Workflow[] { return this._workflows; }
    getActiveTaskCount(): number { return this._activeTaskCount; }

    async searchMemoriesPg(term: string): Promise<Memory[]> {
        if (!this.pg.isConnected) { return this.getMemories(term); }
        return this.pg.query<Memory>(
            `SELECT id, project_id, agent_id, LEFT(content, 500) as content, memory_type, tags, trust_level, confidence, created_at
             FROM memories WHERE content ILIKE $1
             ORDER BY created_at DESC LIMIT $2`,
            [`%${term}%`, Config.maxResults]
        );
    }

    async getMemoryById(id: number): Promise<Memory | null> {
        if (!this.pg.isConnected) {
            return this._memories.find(m => m.id === id) ?? null;
        }
        const rows = await this.pg.query<Memory>(
            `SELECT id, project_id, agent_id, content, memory_type, tags, trust_level, confidence, created_at
             FROM memories WHERE id = $1`,
            [id]
        );
        return rows[0] ?? null;
    }

    async getPromptVersions(promptId: string): Promise<Prompt[]> {
        if (!this.pg.isConnected) {
            return this._prompts.filter(p => p.id === promptId);
        }
        return this.pg.query<Prompt>(
            `SELECT id, version, label, type, vendor, content, changelog, created_at
             FROM prompts WHERE id = $1 ORDER BY version DESC`,
            [promptId]
        );
    }

    getGenOsRoot(): string | null {
        return this.local.getGenOsRoot();
    }

    resolveGenOsPath(rel: string): string | null {
        return this.local.resolveGenOsPath(rel);
    }

    getStatusInfo(): StatusInfo {
        return {
            connectionState: this.pg.state,
            activeTaskCount: this._activeTaskCount,
            lastSync: null,
        };
    }

    dispose(): void {
        this.pg.dispose();
        this.local.dispose();
        this._onDidDataChange.dispose();
    }
}
