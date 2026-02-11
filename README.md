# HR Consultant MCP Server + Widgets

An MCP (Model Context Protocol) server for HR consultant management with rich Fluent UI React widgets that render inline in ChatGPT, Claude, and other MCP-compatible clients.

## Architecture

```
trey-02-mcp/
├── db/                     # Mock data (JSON)
├── server/                 # MCP server (Node + Express)
│   └── src/
│       ├── db.ts           # Azurite Table Storage layer
│       ├── seed.ts         # Seeds Azurite from db/*.json
│       ├── mcp-server.ts   # MCP tools & resource definitions
│       └── index.ts        # Express + Streamable HTTP transport
├── widgets/                # Fluent UI React widgets
│   ├── build.mts           # Custom Vite build (single-file HTML)
│   └── src/
│       ├── dashboard/      # HR Dashboard widget
│       ├── bulk-editor/    # Bulk consultant editor
│       └── consultant-profile/  # Individual profile view
└── assets/                 # Built widget HTML files (generated)
```

## Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Azurite** (installed as a dev dependency)

## Quick Start

### 1. Install dependencies

```bash
npm install
cd server && npm install && cd ..
cd widgets && npm install && cd ..
```

### 2. Start Azurite (local Azure Table Storage)

```bash
npm run start:azurite
```

This starts the Azurite table service on `http://127.0.0.1:10002`.

### 3. Seed the database

```bash
npm run seed
```

Loads consultants, projects, and assignments from `db/` into Azurite.

### 4. Build the widgets

```bash
npm run build:widgets
```

Produces self-contained HTML files in `assets/` (dashboard.html, bulk-editor.html, consultant-profile.html).

### 5. Start the MCP server

```bash
npm run start:server
```

The server starts on `http://localhost:8000` with:
- `POST /mcp` — Streamable HTTP MCP endpoint
- `GET /health` — Health check

## Connecting to ChatGPT

In ChatGPT settings, add a new MCP connector:

- **URL**: `http://localhost:8000/mcp`
- **Transport**: Streamable HTTP

## Available MCP Tools

| Tool | Description |
|---|---|
| `show-hr-dashboard` | Displays the HR overview dashboard with KPIs, consultant list, and project summary |
| `show-consultant-profile` | Shows a detailed profile for a specific consultant with assignments |
| `search-consultants` | Searches consultants by skill or name and displays results in the dashboard |
| `show-bulk-editor` | Opens an inline editor for bulk-editing consultant records |
| `update-consultant` | Updates a single consultant's fields |
| `bulk-update-consultants` | Batch updates multiple consultants at once |
| `show-project-details` | Shows project details with assigned consultants |

## Widget Features

### Dashboard
- KPI cards (consultant count, project count, billable hours, assignments)
- Consultant table with avatars, skills badges, role badges
- Project summary table
- Click-through to profile and project details

### Bulk Editor
- Inline editable table for all consultants
- Edit name, email, phone, skills (add/remove), roles
- Row-level dirty tracking with visual highlight
- Save All / Revert with confirmation messages

### Consultant Profile
- Photo, contact info, location
- Quick stats (active projects, forecast hours, delivered hours)
- Skills, certifications, and roles with badges
- Assignments table with billable status and rate

## Tech Stack

- **Server**: Node.js, Express, `@modelcontextprotocol/sdk` (Streamable HTTP)
- **Database**: Azurite (Azure Table Storage emulator) via `@azure/data-tables`
- **Widgets**: React 18, Fluent UI React v9, Vite + vite-plugin-singlefile
- **Protocol**: MCP with OpenAI widget extensions (`text/html+skybridge`, `_meta`)

## Development

### Rebuild widgets in watch mode

Not currently supported as a single command. Build widgets manually after changes:

```bash
cd widgets && npx tsx build.mts
```

### Server development

```bash
cd server && npx tsx --watch src/index.ts
```

## Data Model

- **Consultants**: id, name, email, phone, photoUrl, location, skills[], certifications[], roles[]
- **Projects**: id, name, description, clientName, clientContact, clientEmail, location
- **Assignments**: projectId, consultantId, role, billable, rate, forecast[], delivered[]
