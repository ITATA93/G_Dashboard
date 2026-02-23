export const EXTENSION_ID = 'antigravity-dashboard';
export const CONFIG_SECTION = 'antigravity';
export const OUTPUT_CHANNEL_NAME = 'Antigravity Dashboard';

export const DEFAULT_REFRESH_INTERVAL = 30_000;
export const DEFAULT_MAX_RESULTS = 200;
export const PG_POOL_MAX = 5;
export const PG_IDLE_TIMEOUT = 30_000;
export const PG_CONNECT_TIMEOUT = 10_000;

export const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000, 30000];

// GEN_OS relative paths for local file reading
export const PATHS = {
    PROJECT_REGISTRY: 'config/project_registry.json',
    WORKFLOW_REGISTRY: 'docs/workflows/registry/workflow_registry.json',
    AGENT_MANIFEST: '.subagents/manifest.json',
} as const;
