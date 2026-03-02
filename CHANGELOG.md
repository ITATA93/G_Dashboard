---
depends_on: []
impacts: []
---

# Changelog — G_Dashboard

All notable changes to this project will be documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Governance audit: docs/TODO.md created
- Gemini settings.json verified
- README.md enhanced with architecture and usage docs
- `.gemini/settings.json` expanded with full MCP server configuration (filesystem, github, fetch, gen-memory, gen-tasks, gen-workflows, gen-prompts)
- Gemini settings aligned with ecosystem standard (profile, agents, experimental, codeExecution, memory, defaults)

### Changed
- Audit C2: fixed AG_ legacy references, cleaned temp artifacts, added frontmatter
- Standards normalized: exports/, docs/library/, tests
- Governance expanded: GEMINI.md, DEVLOG.md populated, stale workspace files removed

## [1.0.0] — 2026-02-23

### Added
- Full GEN_OS mirror infrastructure migrated from AG_DASHBOARD.
- Multi-vendor dispatch: .subagents/, .claude/, .codex/, .gemini/, .agent/.
- Governance standards: docs/standards/.
- CI/CD workflows: .github/workflows/.
- All domain content preserved from AG_DASHBOARD.
