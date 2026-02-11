/**
 * HR Consultant MCP Server – Express + Streamable HTTP transport.
 *
 * Stateless mode: each POST /mcp creates a fresh MCP server + transport.
 * Compatible with ChatGPT, Claude, and other MCP clients.
 */
import express, { type Request, type Response } from "express";
import cors from "cors";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createHRServer } from "./mcp-server.js";
import { ensureTables } from "./db.js";

const PORT = parseInt(process.env.PORT ?? "8000", 10);

const app = express();

// CORS – allow all origins so ChatGPT / MCP Inspector can reach us
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Accept",
      "Mcp-Session-Id",
      "mcp-session-id",
      "Last-Event-ID",
      "Mcp-Protocol-Version",
      "mcp-protocol-version",
    ],
    exposedHeaders: ["Mcp-Session-Id"],
    credentials: false,
  })
);

app.use(express.json());

// ─── Health check ────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", server: "trey-hr-consultant", transport: "streamable-http" });
});

// ─── MCP Streamable HTTP – POST ──────────────────────────────────────
app.post("/mcp", async (req: Request, res: Response) => {
  try {
    // Stateless: fresh server + transport per request
    const server = createHRServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless mode
      enableJsonResponse: true,      // return JSON instead of SSE so responses complete immediately
    });

    res.on("close", () => {
      transport.close().catch(console.error);
      server.close().catch(console.error);
    });

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("Error handling MCP request:", error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: "2.0",
        error: { code: -32603, message: "Internal server error" },
        id: null,
      });
    }
  }
});

// ─── MCP Streamable HTTP – GET ───────────────────────────────────────
// Clients (e.g. ChatGPT) may send GET to open a server→client SSE stream
// or to probe the endpoint. Delegate to the transport so it responds with
// the correct protocol-level answer instead of a hard 405.
app.get("/mcp", async (req: Request, res: Response) => {
  try {
    const server = createHRServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      transport.close().catch(console.error);
      server.close().catch(console.error);
    });

    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("Error handling MCP GET:", error);
    if (!res.headersSent) {
      res.status(405).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      });
    }
  }
});

// ─── MCP Streamable HTTP – DELETE ────────────────────────────────────
app.delete("/mcp", async (req: Request, res: Response) => {
  try {
    const server = createHRServer();
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });

    res.on("close", () => {
      transport.close().catch(console.error);
      server.close().catch(console.error);
    });

    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("Error handling MCP DELETE:", error);
    if (!res.headersSent) {
      res.status(405).json({
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      });
    }
  }
});

// ─── Start ───────────────────────────────────────────────────────────
async function main() {
  // Ensure Azurite tables exist
  try {
    await ensureTables();
    console.log("Azurite tables ready.");
  } catch (err) {
    console.warn("Could not ensure Azurite tables (is Azurite running?):", err);
  }

  app.listen(PORT, () => {
    console.log(`\n  HR Consultant MCP Server`);
    console.log(`  Transport: Streamable HTTP (stateless)`);
    console.log(`  Endpoint:  http://localhost:${PORT}/mcp`);
    console.log(`  Health:    http://localhost:${PORT}/health\n`);
  });
}

main().catch(console.error);
