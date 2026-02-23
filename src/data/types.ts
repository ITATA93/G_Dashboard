// ---------------------------------------------------------------------------
// Database row types (match PostgreSQL schema from infrastructure/init.sql)
// ---------------------------------------------------------------------------

export type TaskStatus = 'backlog' | 'in_progress' | 'blocked' | 'completed';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export interface Task {
    id: number;
    project_id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    assigned_to: string | null;
    blocked_by: number[];
    tags: string[];
    created_at: string;
    completed_at: string | null;
}

export type MemoryType = 'episodic' | 'semantic' | 'decision';
export type TrustLevel = 'verified' | 'unverified' | 'derived';

export interface Memory {
    id: number;
    project_id: string;
    agent_id: string;
    content: string;
    memory_type: MemoryType;
    tags: string[];
    trust_level: TrustLevel;
    confidence: number | null;
    created_at: string;
}

export type PromptLabel = 'dev' | 'staging' | 'production';
export type PromptType = 'system' | 'skill' | 'template' | 'command';
export type PromptVendor = 'claude' | 'gemini' | 'codex' | 'all';

export interface Prompt {
    id: string;
    version: number;
    label: PromptLabel;
    type: PromptType;
    vendor: PromptVendor;
    content: string;
    changelog: string;
    created_at: string;
}

export type WorkflowStatus = 'active' | 'deprecated' | 'draft';

export interface Workflow {
    id: string;
    name: string;
    owner: string;
    trigger: string;
    steps: WorkflowStep[];
    actors: string[];
    scripts: string[];
    status: WorkflowStatus;
    created_at: string;
}

export interface WorkflowStep {
    step: number;
    name: string;
    actor: string;
    action: string;
    inputs?: string[];
    outputs?: string[];
}

export interface Project {
    id: string;
    name: string;
    type: string;
    path: string;
    domain: string;
    status: string;
    phase: string;
}

export interface Skill {
    id: string;
    name: string;
    description: string;
    supported_agents: string[];
    vendor: string;
    version: string;
    status: string;
    skill_path: string;
}

// ---------------------------------------------------------------------------
// Local file types (match GEN_OS JSON registries)
// ---------------------------------------------------------------------------

export interface LocalProject {
    id: string;
    name: string;
    type: string;
    path_relative: string;
    domain: string;
    status: string;
    phase: string;
}

export interface ProjectRegistry {
    version: string;
    projects: LocalProject[];
}

export interface LocalWorkflow {
    workflow_id: string;
    name: string;
    version: string;
    owner: string;
    trigger: string;
    steps_count: number;
    spec_path: string;
    design_path: string;
    generated_at: string;
}

export interface WorkflowRegistry {
    version: string;
    generated_at: string;
    workflows: LocalWorkflow[];
}

export interface LocalAgent {
    id: string;
    name: string;
    vendor_preference: string;
    supported_vendors: string[];
    instructions: string;
    capabilities: string[];
    risk_tier: string;
    needs_approval: boolean;
}

export interface AgentManifest {
    version: string;
    name: string;
    description: string;
    agents: LocalAgent[];
    teams: Record<string, {
        agents: string[];
        mode: string;
        effort: string;
        use_case: string;
    }>;
}

// ---------------------------------------------------------------------------
// Connection state
// ---------------------------------------------------------------------------

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface StatusInfo {
    connectionState: ConnectionState;
    activeTaskCount: number;
    lastSync: Date | null;
}
