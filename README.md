# HR Consultant MCP Server

MCP server with rich Fluent UI React widgets for managing HR consultants, projects, and assignments. Renders interactive UI inline in ChatGPT via the OpenAI widget protocol.

## Prerequisites

| Requirement | Version |
|---|---|
| Node.js | ≥ 18 |
| npm | ≥ 9 |

Azurite is included as a dev dependency — no separate install needed.

## Quick Start

```bash
npm run install:all        # Install all dependencies
npm run start:azurite      # Start local Azure Table Storage (port 10002)
npm run seed               # Seed consultants, projects, assignments
npm run build:widgets      # Build widget HTML into assets/
npm run start:server       # Start MCP server on http://localhost:8000
```

## Connect to ChatGPT

**Settings → MCP → Add connector**
- URL: `http://localhost:8000/mcp`
- Transport: Streamable HTTP

## MCP Tools

| Tool | Type | Description |
|---|---|---|
| `show-hr-dashboard` | Widget | Dashboard with KPIs, consultant cards, project list |
| `show-consultant-profile` | Widget | Detailed consultant profile with assignments |
| `show-project-details` | Widget | Project detail with team table, assign/remove UI |
| `search-consultants` | Widget | Filter consultants by skill or name |
| `show-bulk-editor` | Widget | Inline editor for bulk-editing consultant records |
| `update-consultant` | Data | Update a single consultant's fields |
| `bulk-update-consultants` | Data | Batch update multiple consultants |
| `assign-consultant-to-project` | Data | Assign a consultant to a project with role/rate |
| `bulk-assign-consultants` | Data | Assign multiple consultants to a project at once |
| `remove-assignment` | Data | Remove a consultant from a project |

## Sample Prompts

| Prompt | What it does |
|---|---|
| *Show me the HR dashboard* | Opens the full dashboard widget |
| *Show profile for consultant 1* | Opens a consultant profile card |
| *Search consultants with Azure skills* | Filters by skill |
| *Show project details for project 1* | Opens project detail with team |
| *Assign consultant 3 to project 1 as Architect at $150/hr* | Creates an assignment |
| *Remove consultant 2 from project 1* | Removes an assignment |
| *Open the bulk editor* | Opens inline editing for all consultants |
| *Update consultant 1 — add skill "Kubernetes"* | Updates a single field |

## Development

```bash
npm run dev:server         # Server with hot-reload (tsx --watch)
cd widgets && npx tsx build.mts   # Rebuild widgets after changes
```
