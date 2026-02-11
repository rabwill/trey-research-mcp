# SKILL: Cookie-Cutter Guide — MCP Server with Rich Widgets

Use this guide to build a new MCP server (any domain) with interactive Fluent UI React widgets that render inline in ChatGPT. Follow each step in order — every pattern is taken directly from this project.

---

## 1. Project Structure

Create this folder layout. ChatGPT prompt: *"Scaffold an MCP widget project with this structure."*

```
my-mcp-project/
├── db/                        # Seed data — one JSON file per entity
│   ├── EntityA.json
│   └── EntityB.json
├── server/                    # MCP server (Node.js + Express)
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── db.ts              # Azurite table clients + CRUD helpers
│       ├── seed.ts            # Reads db/*.json → inserts into Azurite
│       ├── mcp-server.ts      # Tool definitions + handlers + widget protocol
│       └── index.ts           # Express app + Streamable HTTP transport
├── widgets/                   # React widget source
│   ├── package.json
│   ├── tsconfig.json
│   ├── build.mts              # Vite build → single-file HTML per widget
│   └── src/
│       ├── types.ts           # Shared TypeScript interfaces
│       ├── hooks/
│       │   ├── useOpenAiGlobal.ts   # Reads window.openai.* props
│       │   └── useThemeColors.ts    # Light/dark theme palette
│       └── my-widget/
│           ├── index.html     # Entry HTML (with CSS reset)
│           ├── main.tsx       # React mount point
│           └── MyWidget.tsx   # Widget component
├── assets/                    # Built widget HTML (gitignored, generated)
├── .env                       # Environment variables
└── package.json               # Root scripts that orchestrate everything
```

---

## 2. Create the `db/` Folder — Seed Data

Each JSON file represents one entity type. The format is `{ "rows": [...] }` where each row has an `id` field.

### Pattern

```json
{
  "rows": [
    {
      "id": "1",
      "name": "Example Item",
      "email": "example@company.com",
      "tags": ["tag1", "tag2"],
      "details": {
        "nested": "object fields are fine"
      }
    }
  ]
}
```

### Rules

| Rule | Why |
|---|---|
| Every row needs a unique `id` string | Used as `rowKey` in Azure Table Storage |
| Arrays and objects are stored as JSON strings | Azure Table Storage only supports flat properties |
| Keep IDs short (`"1"`, `"2"`, etc.) | Easy to reference in chat prompts |
| Use descriptive field names | The LLM reads tool descriptions to map user intent |

### Copilot Prompt to Generate Seed Data

> *"Create a `db/` folder with JSON seed files for my [domain] project. I have these entities: [list them]. Each file should use the format `{ "rows": [...] }` with an `id` field per row. Include 3-5 sample records per entity with realistic data. Store arrays and nested objects as inline JSON (they'll be stringified during seeding)."*

### This Project's Example

```
db/
├── Consultant.json    # { rows: [{ id, name, email, phone, skills:[], roles:[], location:{} }] }
├── Project.json       # { rows: [{ id, name, description, clientName, location:{} }] }
└── Assignment.json    # { rows: [{ id, projectId, consultantId, role, billable, rate, forecast:[] }] }
```

---

## 3. Database Layer (`server/src/db.ts`)

Uses `@azure/data-tables` with Azurite for local development.

### Pattern

```typescript
import { TableClient } from "@azure/data-tables";

const CONNECTION_STRING =
  process.env.AZURE_STORAGE_CONNECTION_STRING ??
  "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;";

const opts = { allowInsecureConnection: true };  // REQUIRED for Azurite HTTP

export const myTable = TableClient.fromConnectionString(CONNECTION_STRING, "MyEntities", opts);

export async function ensureTables() {
  try { await myTable.createTable(); } catch { /* already exists */ }
}

// Entity interface — arrays/objects stored as JSON strings
export interface MyEntity {
  partitionKey: string;
  rowKey: string;
  name: string;
  tags: string;       // JSON-stringified array
  details: string;    // JSON-stringified object
}

// CRUD helpers
export async function getAll(): Promise<MyEntity[]> {
  const results: MyEntity[] = [];
  for await (const entity of myTable.listEntities<MyEntity>()) {
    results.push(entity);
  }
  return results;
}

export async function getById(id: string): Promise<MyEntity | null> {
  try {
    return await myTable.getEntity<MyEntity>("mypartition", id);
  } catch { return null; }
}

export async function update(id: string, updates: Record<string, unknown>): Promise<MyEntity | null> {
  const existing = await getById(id);
  if (!existing) return null;
  const merged: Record<string, unknown> = { ...existing };
  for (const [key, value] of Object.entries(updates)) {
    // Stringify arrays/objects for Table Storage
    merged[key] = Array.isArray(value) || typeof value === "object"
      ? JSON.stringify(value) : value;
  }
  await myTable.updateEntity(
    { partitionKey: "mypartition", rowKey: id, ...merged } as any, "Replace"
  );
  return getById(id);
}
```

### Critical Rules

- **Always** pass `{ allowInsecureConnection: true }` — Azurite runs HTTP, SDK rejects it otherwise
- Use `partitionKey` + `rowKey` as composite keys
- Store arrays/objects as JSON strings, parse on read in `mcp-server.ts`

---

## 4. Seed Script (`server/src/seed.ts`)

Reads each `db/*.json` file and upserts rows into Azurite.

### Pattern

```typescript
import fs from "node:fs";
import path from "node:path";
import { ensureTables, myTable } from "./db.js";

const DB_DIR = path.resolve(__dirname, "..", "..", "db");

function loadJson<T>(file: string): T[] {
  const raw = fs.readFileSync(path.join(DB_DIR, file), "utf-8");
  return JSON.parse(raw).rows;
}

async function seed() {
  await ensureTables();

  const items = loadJson<any>("MyEntity.json");
  for (const item of items) {
    await myTable.upsertEntity({
      partitionKey: "mypartition",
      rowKey: item.id,
      name: item.name,
      tags: JSON.stringify(item.tags),         // Stringify arrays
      details: JSON.stringify(item.details),   // Stringify objects
    }, "Replace");
    console.log(`  ✓ ${item.name}`);
  }
}

seed().catch(console.error);
```

---

## 5. MCP Server (`server/src/mcp-server.ts`)

### Widget Protocol — How It Works

ChatGPT renders widgets through these four pieces:

1. **Resources** — Widget HTML registered with `mimeType: "text/html+skybridge"`
2. **`_meta` on tool definitions** — `openai/outputTemplate` points to the widget resource URI
3. **`structuredContent` on tool responses** — The JSON data the widget reads
4. **`_meta` on tool responses** — Same `openai/outputTemplate` URI

### Widget Definition

```typescript
const MY_WIDGET = {
  id: "my-widget",
  title: "My Widget",
  templateUri: "ui://widget/my-widget.html",
  invoking: "Loading widget…",
  invoked: "Widget ready",
  html: readWidgetHtml("my-widget"),  // Reads from assets/ folder
};

function descriptorMeta(widget) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
  };
}
```

### Tool Types

| Type | Has `_meta`? | Has `structuredContent`? | Purpose |
|---|---|---|---|
| **Widget tool** | Yes | Yes | Renders interactive UI |
| **Data tool** | No | No | CRUD — returns text confirmation |

### Widget Tool Example

```typescript
// Tool definition (in list_tools)
{
  name: "show-my-widget",
  title: "Show My Widget",
  description: "Displays the widget. Optional filter: name.",
  inputSchema: { type: "object", properties: { name: { type: "string" } } },
  _meta: descriptorMeta(MY_WIDGET),
  annotations: { readOnlyHint: true },
}

// Tool handler (in call_tool)
case "show-my-widget": {
  const data = await db.getAll();
  return {
    content: [{ type: "text", text: `Loaded ${data.length} items.` }],
    structuredContent: { items: data.map(parseEntity) },  // Widget payload
    _meta: invocationMeta(MY_WIDGET),                      // Widget trigger
  };
}
```

### Data Tool Example

```typescript
// No _meta, no structuredContent — just text response
case "update-my-entity": {
  const updated = await db.update(id, updates);
  return {
    content: [{ type: "text", text: `Updated ${updated.name}.` }],
  };
}
```

---

## 6. Express Transport (`server/src/index.ts`)

Stateless Streamable HTTP — each request gets a fresh server + transport.

### Critical Settings

| Setting | Value | Why |
|---|---|---|
| `sessionIdGenerator` | `undefined` | Stateless — ChatGPT doesn't persist sessions |
| `enableJsonResponse` | `true` | Returns JSON instead of SSE — avoids 30s timeout |
| CORS `origin` | Allow `*` or specific origins | ChatGPT sandbox sends `null` origin |
| Handle GET + DELETE `/mcp` | Delegate to transport | ChatGPT sends probe requests; 405 breaks the connector |

---

## 7. Widget Development

### Stack

| Package | Purpose |
|---|---|
| `react` + `react-dom` | UI framework |
| `@fluentui/react-components` | Fluent UI v9 |
| `@fluentui/react-icons` | Icons |
| `vite` + `vite-plugin-singlefile` | Single-file HTML build |

### `index.html` — CSS Reset for ChatGPT

Every widget needs this to prevent double scrollbars:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Widget</title>
  <style>
    html, body { margin: 0; padding: 0; overflow: hidden; height: 100%; }
    #root { height: 100%; overflow-y: auto; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="./main.tsx"></script>
</body>
</html>
```

### Reading Data — `window.openai.toolOutput`

```typescript
const toolOutput = useOpenAiGlobal<MyData>("toolOutput");
const data = toolOutput ?? fallback;
```

The `structuredContent` from the tool response is available at `window.openai.toolOutput`.

### Calling Tools from Widgets

```typescript
await window.openai?.callTool?.("update-my-entity", { id: "1", name: "New Name" });
// Then update local state optimistically — don't use sendFollowUpMessage to refresh
setItems(prev => prev.map(i => i.id === "1" ? { ...i, name: "New Name" } : i));
```

### Theme Support

```typescript
const theme = window.openai?.theme; // "light" | "dark"
// Use inline styles for colors, makeStyles for layout only
```

### DisplayMode Toggle

Widgets start inline. Add a fullscreen toggle button:

```typescript
const [isFullscreen, setIsFullscreen] = useState(false);

const toggleFullscreen = useCallback(async () => {
  if (window.openai?.requestDisplayMode) {
    const current = window.openai.displayMode;
    await window.openai.requestDisplayMode({
      mode: current === "fullscreen" ? "inline" : "fullscreen"
    });
    return;
  }
  // Browser fallback
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch {}
  setIsFullscreen(prev => !prev);
}, []);
```

### Key Constraints

- **No `confirm()`, `alert()`, `prompt()`** — blocked in sandboxed iframe, returns `false`/`undefined`
- **`makeStyles` (Griffel) is static** — use it for layout, inline styles for runtime colors
- **Griffel `:hover` bug** — use longhand `borderTopColor` etc., not shorthand `borderColor`
- **Multi-view navigation** — use React state inside the widget, NOT `sendFollowUpMessage`
- **Mutations** — call `callTool` + optimistic local state update, NOT `sendFollowUpMessage`

---

## 8. Build System (`widgets/build.mts`)

Each widget folder → single self-contained HTML in `assets/`:

```typescript
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

for (const widget of widgetDirs) {
  await build({
    root: path.join(WIDGETS_DIR, widget),
    plugins: [react(), viteSingleFile()],
    build: { outDir: ASSETS_DIR, emptyOutDir: false },
  });
}
```

---

## 9. Root `package.json` Scripts

```json
{
  "scripts": {
    "install:all": "npm install && cd server && npm install && cd ../widgets && npm install",
    "start:azurite": "npx azurite-table --tableHost 127.0.0.1 --tablePort 10002 --location .azurite --silent",
    "seed": "cd server && npm run seed",
    "build:widgets": "cd widgets && npm run build",
    "start:server": "cd server && npm start",
    "dev:server": "cd server && npm run dev",
    "inspector": "npx @modelcontextprotocol/inspector"
  },
  "devDependencies": { "azurite": "^3.31.0" }
}
```

---

## 10. ChatGPT Prompts to Build a New Project

Use these prompts in sequence with ChatGPT to scaffold a new MCP widget project:

### Prompt 1: Seed Data

> *"I'm building an MCP server for [YOUR DOMAIN]. Create a `db/` folder with JSON seed files. My entities are: [ENTITY LIST WITH FIELDS]. Use the format `{ "rows": [{ "id": "1", ... }] }`. Include 3-5 realistic records per entity."*

### Prompt 2: Database Layer

> *"Create `server/src/db.ts` using `@azure/data-tables` with Azurite. Define table clients and entity interfaces for: [ENTITY LIST]. Include CRUD helpers: getAll, getById, update, create, delete. Arrays and objects should be stored as JSON strings. Always use `{ allowInsecureConnection: true }`."*

### Prompt 3: Seed Script

> *"Create `server/src/seed.ts` that reads each JSON file from `db/` and upserts the rows into Azurite tables using the db.ts helpers. Use the pattern from this project's seed.ts."*

### Prompt 4: MCP Server

> *"Create `server/src/mcp-server.ts` with tools for my entities. Widget tools should include `_meta` with `openai/outputTemplate`, `structuredContent` in responses, and resource registration with `text/html+skybridge`. Data tools should return text only. Follow this project's pattern."*

### Prompt 5: Widget

> *"Create a widget in `widgets/src/my-widget/` with index.html (include the CSS reset for no double scrollbar), main.tsx, and MyWidget.tsx. Read data from `useOpenAiGlobal('toolOutput')`. Use `useThemeColors` for dark/light mode. Add a fullscreen toggle icon button."*

### Prompt 6: Update Server for New Entities

> *"I added a new entity `[NAME]` to my `db/` folder. Update `db.ts` to add a table client and CRUD helpers, update `seed.ts` to seed it, and add tools in `mcp-server.ts` to display and manage it."*

---

## Checklist

- [ ] `db/` folder has JSON files with `{ "rows": [...] }` format and `id` per row
- [ ] `db.ts` uses `{ allowInsecureConnection: true }` for Azurite
- [ ] `seed.ts` reads `db/*.json` and upserts into tables
- [ ] Server uses `enableJsonResponse: true` and `sessionIdGenerator: undefined`
- [ ] GET and DELETE on `/mcp` are handled (not 405)
- [ ] CORS allows ChatGPT origins
- [ ] Resources registered with `mimeType: "text/html+skybridge"`
- [ ] Widget tool definitions include `_meta` with `openai/outputTemplate`
- [ ] Widget tool responses include `structuredContent` + `_meta`
- [ ] Data tools return text only (no `_meta`, no `structuredContent`)
- [ ] Widget `index.html` has CSS reset (`html, body { margin:0; overflow:hidden; height:100% }`)
- [ ] Widget reads data from `window.openai.toolOutput`
- [ ] Widget uses `callTool` for mutations + optimistic state updates
- [ ] Widget uses `window.openai.theme` for dark/light mode
- [ ] No `confirm()` / `alert()` / `prompt()` in widgets
- [ ] Widgets built as single-file HTML via `vite-plugin-singlefile`
