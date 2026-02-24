# G_Dashboard

> Satellite project in the Antigravity ecosystem.

**Domain:** `00_CORE`
**Status:** Active
**Orchestrator:** GEN_OS
**Prefix:** G_

## Proposito

VSCode extension que provee un dashboard de estado en tiempo real del ecosistema
Antigravity. Muestra salud de proyectos, estado de agentes, metricas de
gobernanza y alertas de auditoria directamente en el editor.

## Arquitectura

```
G_Dashboard/
  src/
    extension.ts        # Entry point de la extension VSCode
    commands/           # Comandos registrados en la paleta
    providers/          # Data providers (TreeView, WebView)
    views/              # Paneles de visualizacion
    statusBar/          # Indicadores en barra de estado
    utils/              # Helpers compartidos
    data/               # Modelos de datos y esquemas
  config/               # Configuracion del proyecto
  docs/                 # Documentacion y estandares
  tests/                # Suite de pruebas
  scripts/              # Scripts de automatizacion
  media/                # Iconos y recursos visuales
```

## Uso con Gemini CLI

```bash
# Iniciar sesion de desarrollo
gemini

# Analizar codigo de la extension
gemini -p "Analiza la estructura de providers/ y sugiere mejoras"

# Revisar componentes
gemini -p "Review src/views/ for accessibility and performance"
```

## Scripts Disponibles

```bash
# Compilar la extension
npm run compile

# Empaquetar como .vsix
npm run package

# Ejecutar tests
npm test

# Dispatch de agente revisor
bash .subagents/dispatch.sh reviewer "Audit this project"

# Team workflow
bash .subagents/dispatch-team.sh code-and-review "Review recent changes"
```

## Configuracion

| Archivo | Proposito |
|---------|-----------|
| `GEMINI.md` | Instrucciones para Gemini CLI |
| `CLAUDE.md` | Instrucciones para Claude Code |
| `AGENTS.md` | Instrucciones para Codex CLI |
| `.gemini/settings.json` | Config de Gemini |
| `tsconfig.json` | Config de TypeScript |
| `package.json` | Dependencias y scripts npm |

## Contraparte AG

Migrado desde `AG_DASHBOARD`. Misma funcionalidad de dominio, infraestructura
de agentes actualizada al estandar G_ con soporte multi-vendor completo.

## Licencia

MIT
