# Memory Index — Antigravity Workspace

## Purpose
This index tracks persistent memory entries for the AI agents working on this project.
Memory enables continuity between sessions and cross-agent knowledge sharing.

---

## Memory Entries

### 2026-02-17 — Session: Security Audit & Ecosystem Remediation
- **Session**: Full security audit + remediation of AG_Plantilla + 5 AG projects
- **Key learnings**:
  - Identified 13 security findings across ecosystem (5C, 4H, 4M)
  - `dev-secret-key` pattern inherited by all template-derived projects
  - CORS wildcard `["*"]` was systemic across all AG projects
  - AG_SV_Agent had the highest risk (3 critical credential exposures)
- **Decisions made**:
  - Production validator pattern: `model_validator` rejects placeholder API keys
  - Prompt injection mitigation via `<user_task>` delimiters in dispatch scripts
  - AG_Consultas migration scripts accepted (purpose-built cleanup tools)
  - MCP filesystem server scoped to project root only
- **Files touched**: 15 files across 6 projects

### 2026-02-17 — Session: New Agent Projects
- **Session**: Session: New Agent Projects
- **Key learnings**:

### 2026-02-07 — Session: Deep Template Optimization
- **Session**: Session: Deep Template Optimization
- **Key learnings**:
- **Decisions made**:
  - **Community skills opt-in**: Moved 3,103 community skills to `_resources/`. New projects start lean.
  - **Output governance**: Created binding standard for where agents create files. No more scattered outputs.
  - **Central references**: All instruction files now reference PLATFORM/ROUTING instead of duplicating.

### 2026-02-02 — Initial Setup
- **Session**: Audit context building
- **Key learnings**:
  - Multi-vendor system with Gemini, Claude, Codex
  - 7 agents configured with automatic delegation
  - Central library with symlink activation
- **Files**: [audit-context-antigravity.md](../../docs/research/2026-02-02_audit-context-antigravity.md)

---

## Memory Format

Each memory entry should follow this format:

```markdown
### YYYY-MM-DD — Session Title
- **Session**: Brief description
- **Key learnings**:
  - Learning 1
  - Learning 2
- **Decisions made**:
  - Decision 1
- **Files touched**: [list of files]
- **Next actions**: [pending items]
```

---

## Cross-References

| Topic         | Location                                              | Last Updated |
| ------------- | ----------------------------------------------------- | ------------ |
| Audit context | docs/research/2026-02-02_audit-context-antigravity.md | 2026-02-02   |
| Architecture  | docs/architecture/ARCHITECTURE.md                     | —            |
| Decisions     | docs/decisions/                                       | —            |

---

## Retention Policy

- Keep entries for 90 days
- Archive important learnings to docs/decisions/ as ADRs
- Summarize weekly into consolidated memory
