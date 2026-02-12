# SKILL: Building MCP Servers with Rich Widgets

Step-by-step guide to build an MCP server (any domain) that renders interactive Fluent UI React widgets inline in ChatGPT, using exactly the same architecture and patterns as this project.

---

## Architecture Overview

```
your-mcp-project/
├── db/                     # Seed data (JSON files)
├── server/                 # MCP server
│   └── src/
│       ├── db.ts           # Database layer (Azurite / Azure Table Storage)
│       ├── seed.ts         # Seeds DB from db/*.json
│       ├── mcp-server.ts   # MCP server factory (tools, resources, handlers)
│       └── index.ts        # Express + Streamable HTTP transport
├── widgets/                # React widget source
│   ├── build.mts           # Vite build script (produces single-file HTML)
│   └── src/
│       ├── <widget-name>/  # One folder per widget
│       └── hooks/          # Shared hooks (useOpenAiGlobal, useThemeColors)
├── assets/                 # Built widget HTML (generated, gitignored)
└── package.json            # Root orchestration scripts
```

---

## Step 1: Server Setup

### Transport: Streamable HTTP (stateless)

Use Express + `@modelcontextprotocol/sdk`. Each POST creates a fresh server + transport.

```typescript
import express from "express";
import cors from "cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMyServer } from "./mcp-server.js";

const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Accept", "Mcp-Session-Id", "mcp-session-id",
    "Last-Event-ID", "Mcp-Protocol-Version", "mcp-protocol-version"],
  exposedHeaders: ["Mcp-Session-Id"], credentials: false }));
app.use(express.json());

app.post("/mcp", async (req, res) => {
  const server = createMyServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,   // stateless — no session tracking
    enableJsonResponse: true,        // CRITICAL: avoids SSE 30s timeout in ChatGPT
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Delegate GET/DELETE to transport (ChatGPT sends these)
app.get("/mcp", async (req, res) => { /* create transport, handleRequest */ });
app.delete("/mcp", async (req, res) => { /* create transport, handleRequest */ });

app.listen(8000);
```

**Critical settings:**
| Setting | Value | Why |
|---|---|---|
| `sessionIdGenerator` | `undefined` | Stateless mode — ChatGPT doesn't persist session IDs |
| `enableJsonResponse` | `true` | Returns JSON instead of SSE — avoids ChatGPT 30s timeout |
| CORS `origin` | `"*"` | ChatGPT connector needs open CORS |
| GET/DELETE `/mcp` | Delegate to transport | ChatGPT sends GET/DELETE probes; returning 405 breaks the connector |

---

## Step 2: Database Layer (Azurite)

Use `@azure/data-tables` with Azurite for local development.

```typescript
import { TableClient, TableServiceClient } from "@azure/data-tables";

const CONN_STRING = "UseDevelopmentStorage=true";
const serviceClient = TableServiceClient.fromConnectionString(CONN_STRING, {
  allowInsecureConnection: true,  // REQUIRED for Azurite HTTP
});

const myTable = TableClient.fromConnectionString(CONN_STRING, "MyTable", {
  allowInsecureConnection: true,
});

export async function ensureTables() {
  await serviceClient.createTable("MyTable").catch(() => {});
}
```

**Key points:**
- Always pass `{ allowInsecureConnection: true }` — Azurite runs over HTTP, and `@azure/data-tables` rejects it otherwise
- Use `partitionKey` + `rowKey` as composite keys
- Store arrays/objects as JSON strings, parse on read

---

## Step 3: MCP Server Factory

Return a `Server` instance from a factory function. Register tool definitions AND handlers.

### Widget Protocol — The Key Mechanism

ChatGPT renders widgets through this protocol:

1. **Resources** — Register each widget as a resource with `mimeType: "text/html+skybridge"`
2. **`_meta` on tool definitions** — Points to the widget's resource URI via `openai/outputTemplate`
3. **`structuredContent` on tool responses** — The data payload the widget reads
4. **`_meta` on tool responses** — Same `openai/outputTemplate` URI

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";

// Widget definition
const DASHBOARD_WIDGET = {
  id: "my-dashboard",
  title: "My Dashboard",
  templateUri: "ui://widget/my-dashboard.html",
  invoking: "Loading dashboard…",
  invoked: "Dashboard ready",
  html: fs.readFileSync("assets/my-dashboard.html", "utf8"),
};

// Metadata for tool DESCRIPTORS (list_tools response)
function descriptorMeta(widget) {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
  };
}

// Same metadata for tool RESPONSES (call_tool response)
function invocationMeta(widget) {
  return { ...descriptorMeta(widget) };
}

export function createMyServer() {
  const server = new Server(
    { name: "my-server", version: "1.0.0" },
    { capabilities: { tools: {}, resources: {} } }
  );

  // ── List Resources ──
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [DASHBOARD_WIDGET].map(w => ({
      name: w.title,
      uri: w.templateUri,
      mimeType: "text/html+skybridge",
    })),
  }));

  // ── Read Resource (serves the HTML) ──
  server.setRequestHandler(ReadResourceRequestSchema, async (req) => {
    const widget = [DASHBOARD_WIDGET].find(w => w.templateUri === req.params.uri);
    return {
      contents: [{
        uri: req.params.uri,
        mimeType: "text/html+skybridge",
        text: widget.html,
      }],
    };
  });

  // ── List Tools ──
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [{
      name: "show-dashboard",
      title: "Show Dashboard",
      description: "Display the dashboard with data...",
      inputSchema: { type: "object", properties: {}, required: [] },
      _meta: descriptorMeta(DASHBOARD_WIDGET),  // ← Links tool to widget
      annotations: { readOnlyHint: true },
    }],
  }));

  // ── Call Tool ──
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const data = await fetchMyData();
    return {
      content: [{ type: "text", text: "Dashboard loaded." }],
      structuredContent: data,                    // ← Widget reads this
      _meta: invocationMeta(DASHBOARD_WIDGET),    // ← Widget rendering trigger
    };
  });

  return server;
}
```

### Tool Categories

| Category | Has `_meta`? | Has `structuredContent`? | Purpose |
|---|---|---|---|
| **Widget tools** | Yes | Yes | Renders interactive UI |
| **Data tools** | No | No | CRUD — returns text confirmation |

---

## Step 4: Widget Development

### Stack

| Package | Purpose |
|---|---|
| `react` + `react-dom` | UI framework |
| `@fluentui/react-components` | Fluent UI v9 component library |
| `@fluentui/react-icons` | Icon set |
| `vite` + `vite-plugin-singlefile` | Builds to a single self-contained HTML file |

### Reading Data — `window.openai.toolOutput`

The widget reads the `structuredContent` from the tool response:

```typescript
// hooks/useOpenAiGlobal.ts
import { useState, useEffect } from "react";

declare global {
  interface Window {
    openai?: {
      toolOutput?: unknown;
      theme?: string;
      callTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
      sendFollowUpMessage?: (msg: string) => void;
    };
  }
}

export function useOpenAiGlobal<T>(key: "toolOutput" | "theme"): T | undefined {
  const [value, setValue] = useState<T | undefined>(
    () => window.openai?.[key] as T | undefined
  );
  useEffect(() => {
    const interval = setInterval(() => {
      const v = window.openai?.[key] as T | undefined;
      if (v !== undefined) { setValue(v); clearInterval(interval); }
    }, 200);
    return () => clearInterval(interval);
  }, [key]);
  return value;
}
```

### Calling Tools from Widgets

Widgets can call MCP tools directly:

```typescript
await window.openai?.callTool?.("update-my-entity", {
  id: "123",
  name: "New Name",
});
```

**Important:** `callTool` calls the MCP server. Use it for data mutations.  
**Important:** `sendFollowUpMessage` sends a chat message that creates a *new* widget. Do NOT use it for refreshing current widget data. Use optimistic local state updates instead.

### Theme Support

```typescript
// hooks/useThemeColors.ts
export function useThemeColors() {
  const theme = window.openai?.theme; // "light" | "dark"
  return theme === "dark" ? {
    surface: "#1e1e1e", cardBg: "#2d2d2d", textPrimary: "#e0e0e0",
    brand: "#4dabf7", divider: "#404040", // ... etc
  } : {
    surface: "#f5f5f5", cardBg: "#ffffff", textPrimary: "#1a1a1a",
    brand: "#0a66c2", divider: "#e5e5e5", // ... etc
  };
}
```

**Key rule:** Fluent UI v9 `makeStyles` (Griffel) is static — it cannot accept runtime theme values. Use `makeStyles` for layout/structure, and inline styles for all colors via the theme object.

### Griffel Gotcha

`makeStyles` does NOT support shorthand `borderColor` inside `:hover` pseudo-selectors. Use longhand:

```typescript
// ❌ FAILS
":hover": { borderColor: "#0a66c2" }

// ✅ WORKS
":hover": {
  borderTopColor: "#0a66c2",
  borderRightColor: "#0a66c2",
  borderBottomColor: "#0a66c2",
  borderLeftColor: "#0a66c2",
}
```

### Multi-View Navigation (In-Widget)

Do NOT use `sendFollowUpMessage` for navigation between views. Instead, manage views with React state inside a single widget:

```typescript
type ViewState =
  | { view: "list" }
  | { view: "detail"; id: string };

const [viewState, setViewState] = useState<ViewState>({ view: "list" });

if (viewState.view === "detail") return <DetailView id={viewState.id} />;
return <ListView onSelect={(id) => setViewState({ view: "detail", id })} />;
```

### Optimistic Updates

After calling `callTool` for mutations, update local state immediately — don't rely on `sendFollowUpMessage` to refresh:

```typescript
const [localItems, setLocalItems] = useState(items);

const handleDelete = async (id: string) => {
  await window.openai?.callTool?.("delete-item", { id });
  setLocalItems(prev => prev.filter(i => i.id !== id));  // Instant UI update
};
```

### Sandboxed iframe Constraints

ChatGPT renders widgets in a sandboxed iframe. `confirm()`, `alert()`, and `prompt()` are **blocked** — they silently return `false` / `undefined`. Use in-widget UI patterns instead (e.g., two-click confirmation buttons).

---

## Step 5: Build System

### Vite Build Script (`widgets/build.mts`)

Each widget folder → single self-contained HTML file via `vite-plugin-singlefile`:

```typescript
import { build } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";
import path from "path";
import fs from "fs";

const WIDGETS_DIR = path.resolve("src");
const OUT_DIR = path.resolve("..", "assets");

const widgetDirs = fs.readdirSync(WIDGETS_DIR)
  .filter(d => fs.statSync(path.join(WIDGETS_DIR, d)).isDirectory())
  .filter(d => d !== "hooks" && d !== "types");

for (const widget of widgetDirs) {
  console.log(`Building widget: ${widget}…`);
  await build({
    root: path.join(WIDGETS_DIR, widget),
    plugins: [react(), viteSingleFile()],
    build: {
      outDir: OUT_DIR,
      emptyOutDir: false,
      rollupOptions: { output: { entryFileNames: `${widget}.js` } },
    },
  });
}
```

Each widget folder needs an `index.html` entry point that mounts the React app.

---

## Step 6: Root Package Scripts

```json
{
  "scripts": {
    "install:all": "npm install && cd server && npm install && cd ../widgets && npm install",
    "start:azurite": "npx azurite-table --tableHost 127.0.0.1 --tablePort 10002 --location .azurite --silent",
    "seed": "cd server && npm run seed",
    "build:widgets": "cd widgets && npm run build",
    "start:server": "cd server && npm start",
    "dev:server": "cd server && npm run dev"
  },
  "devDependencies": {
    "azurite": "^3.31.0"
  }
}
```

---

## Checklist for New MCP Widget Servers

- [ ] Server uses `enableJsonResponse: true` (prevents SSE timeout)
- [ ] Server uses `sessionIdGenerator: undefined` (stateless mode)
- [ ] GET and DELETE on `/mcp` are handled (not 405)
- [ ] CORS allows `*` origin with MCP headers
- [ ] Azurite clients use `allowInsecureConnection: true`
- [ ] Resources registered with `mimeType: "text/html+skybridge"`
- [ ] Tool definitions include `_meta` with `openai/outputTemplate` pointing to resource URI
- [ ] Tool responses include both `structuredContent` (data) and `_meta` (widget pointer)
- [ ] Widgets read data from `window.openai.toolOutput`
- [ ] Widgets use `window.openai.callTool()` for mutations
- [ ] Widgets use `window.openai.theme` for dark/light mode
- [ ] Layout styles in `makeStyles`, color styles inline via theme object
- [ ] No `confirm()` / `alert()` / `prompt()` — use in-widget UI
- [ ] Multi-view navigation via React state, not `sendFollowUpMessage`
- [ ] Mutations use optimistic local state updates
- [ ] Widgets built as single-file HTML via `vite-plugin-singlefile`
