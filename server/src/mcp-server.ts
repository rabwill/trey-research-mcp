/**
 * HR Consultant MCP Server factory.
 *
 * Creates a low-level MCP Server with full _meta control for the
 * OpenAI Apps SDK widget protocol (text/html+skybridge resources,
 * openai/outputTemplate, structured content).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListResourceTemplatesRequestSchema,
  type CallToolRequest,
  type ListToolsRequest,
  type ListResourcesRequest,
  type ReadResourceRequest,
  type ListResourceTemplatesRequest,
  type Resource,
  type ResourceTemplate,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import * as db from "./db.js";

// ─── Widget HTML loader ────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.resolve(__dirname, "..", "..", "assets");
const MIME_TYPE = "text/html+skybridge";

function readWidgetHtml(componentName: string): string {
  if (!fs.existsSync(ASSETS_DIR)) {
    throw new Error(
      `Widget assets not found at ${ASSETS_DIR}. Run "npm run build:widgets" first.`
    );
  }
  const directPath = path.join(ASSETS_DIR, `${componentName}.html`);
  if (fs.existsSync(directPath)) {
    return fs.readFileSync(directPath, "utf8");
  }
  // Try hashed fallback
  const candidates = fs
    .readdirSync(ASSETS_DIR)
    .filter((f) => f.startsWith(`${componentName}-`) && f.endsWith(".html"))
    .sort();
  const fallback = candidates[candidates.length - 1];
  if (fallback) {
    return fs.readFileSync(path.join(ASSETS_DIR, fallback), "utf8");
  }
  throw new Error(`Widget HTML for "${componentName}" not found in ${ASSETS_DIR}.`);
}

// ─── Widget definitions ────────────────────────────────────────────
interface HRWidget {
  id: string;
  title: string;
  templateUri: string;
  invoking: string;
  invoked: string;
  html: string;
}

let DASHBOARD_WIDGET: HRWidget;
let PROFILE_WIDGET: HRWidget;
let BULK_EDITOR_WIDGET: HRWidget;

function loadWidgets() {
  DASHBOARD_WIDGET = {
    id: "hr-dashboard",
    title: "HR Dashboard",
    templateUri: "ui://widget/hr-dashboard.html",
    invoking: "Loading HR dashboard…",
    invoked: "Dashboard ready",
    html: readWidgetHtml("hr-dashboard"),
  };
  PROFILE_WIDGET = {
    id: "consultant-profile",
    title: "Consultant Profile",
    templateUri: "ui://widget/consultant-profile.html",
    invoking: "Loading consultant profile…",
    invoked: "Profile ready",
    html: readWidgetHtml("consultant-profile"),
  };
  BULK_EDITOR_WIDGET = {
    id: "bulk-editor",
    title: "Bulk Editor",
    templateUri: "ui://widget/bulk-editor.html",
    invoking: "Opening bulk editor…",
    invoked: "Editor ready",
    html: readWidgetHtml("bulk-editor"),
  };
}

function getWidgets(): HRWidget[] {
  return [DASHBOARD_WIDGET, PROFILE_WIDGET, BULK_EDITOR_WIDGET];
}

// ─── Metadata helpers ──────────────────────────────────────────────

/** Meta attached to tool descriptors (list_tools, list_resources) */
function descriptorMeta(widget: HRWidget): Record<string, unknown> {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
  };
}

/** Meta attached to call_tool responses */
function invocationMeta(widget: HRWidget): Record<string, unknown> {
  return {
    "openai/outputTemplate": widget.templateUri,
    "openai/toolInvocation/invoking": widget.invoking,
    "openai/toolInvocation/invoked": widget.invoked,
    "openai/widgetAccessible": true,
  };
}

// ─── Entity → plain object helpers ─────────────────────────────────

function parseConsultant(c: db.ConsultantEntity) {
  return {
    id: c.rowKey,
    name: c.name,
    email: c.email,
    phone: c.phone,
    photoUrl: c.consultantPhotoUrl,
    location: JSON.parse(c.location || "{}"),
    skills: JSON.parse(c.skills || "[]"),
    certifications: JSON.parse(c.certifications || "[]"),
    roles: JSON.parse(c.roles || "[]"),
  };
}

function parseProject(p: db.ProjectEntity) {
  return {
    id: p.rowKey,
    name: p.name,
    description: p.description,
    clientName: p.clientName,
    clientContact: p.clientContact,
    clientEmail: p.clientEmail,
    location: JSON.parse(p.location || "{}"),
  };
}

function parseAssignment(a: db.AssignmentEntity) {
  return {
    id: a.rowKey,
    projectId: a.projectId,
    consultantId: a.consultantId,
    role: a.role,
    billable: a.billable,
    rate: a.rate,
    forecast: JSON.parse(a.forecast || "[]"),
    delivered: JSON.parse(a.delivered || "[]"),
  };
}

// ─── Tool input schemas ────────────────────────────────────────────

const dashboardInputSchema = {
  type: "object" as const,
  properties: {},
  additionalProperties: false,
};

const profileInputSchema = {
  type: "object" as const,
  properties: {
    consultantId: {
      type: "string" as const,
      description: "The ID of the consultant to view.",
    },
  },
  required: ["consultantId"],
  additionalProperties: false,
};

const searchInputSchema = {
  type: "object" as const,
  properties: {
    skill: {
      type: "string" as const,
      description: "Skill to search for (partial match).",
    },
    name: {
      type: "string" as const,
      description: "Name to search for (partial match).",
    },
  },
  additionalProperties: false,
};

const bulkEditorInputSchema = {
  type: "object" as const,
  properties: {},
  additionalProperties: false,
};

const updateConsultantInputSchema = {
  type: "object" as const,
  properties: {
    consultantId: {
      type: "string" as const,
      description: "The ID of the consultant to update.",
    },
    name: { type: "string" as const, description: "Updated name." },
    email: { type: "string" as const, description: "Updated email." },
    phone: { type: "string" as const, description: "Updated phone." },
    skills: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "Updated skills list.",
    },
    roles: {
      type: "array" as const,
      items: { type: "string" as const },
      description: "Updated roles list.",
    },
  },
  required: ["consultantId"],
  additionalProperties: false,
};

const bulkUpdateInputSchema = {
  type: "object" as const,
  properties: {
    updates: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          consultantId: { type: "string" as const },
          name: { type: "string" as const },
          email: { type: "string" as const },
          phone: { type: "string" as const },
          skills: { type: "array" as const, items: { type: "string" as const } },
          roles: { type: "array" as const, items: { type: "string" as const } },
        },
        required: ["consultantId"],
      },
      description: "Array of consultant updates.",
    },
  },
  required: ["updates"],
  additionalProperties: false,
};

const projectDetailInputSchema = {
  type: "object" as const,
  properties: {
    projectId: {
      type: "string" as const,
      description: "The project ID.",
    },
  },
  required: ["projectId"],
  additionalProperties: false,
};

// ─── Zod parsers (for runtime validation) ──────────────────────────

const profileParser = z.object({ consultantId: z.string() });
const searchParser = z.object({ skill: z.string().optional(), name: z.string().optional() });
const updateParser = z.object({
  consultantId: z.string(),
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  skills: z.array(z.string()).optional(),
  roles: z.array(z.string()).optional(),
});
const bulkUpdateParser = z.object({
  updates: z.array(
    z.object({
      consultantId: z.string(),
      name: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      skills: z.array(z.string()).optional(),
      roles: z.array(z.string()).optional(),
    })
  ),
});
const projectDetailParser = z.object({ projectId: z.string() });

// ─── Server factory ────────────────────────────────────────────────

export function createHRServer(): Server {
  // Load widget HTML on first call
  if (!DASHBOARD_WIDGET) loadWidgets();

  const server = new Server(
    { name: "trey-hr-consultant", version: "1.0.0" },
    { capabilities: { resources: {}, tools: {} } }
  );

  // ────── List Resources ──────
  const widgetList = getWidgets();
  const widgetsByUri = new Map(widgetList.map((w) => [w.templateUri, w]));

  const resources: Resource[] = widgetList.map((w) => ({
    uri: w.templateUri,
    name: w.title,
    description: `${w.title} widget markup`,
    mimeType: MIME_TYPE,
    _meta: descriptorMeta(w),
  }));

  const resourceTemplates: ResourceTemplate[] = widgetList.map((w) => ({
    uriTemplate: w.templateUri,
    name: w.title,
    description: `${w.title} widget markup`,
    mimeType: MIME_TYPE,
    _meta: descriptorMeta(w),
  }));

  server.setRequestHandler(
    ListResourcesRequestSchema,
    async (_req: ListResourcesRequest) => ({ resources })
  );

  server.setRequestHandler(
    ListResourceTemplatesRequestSchema,
    async (_req: ListResourceTemplatesRequest) => ({ resourceTemplates })
  );

  server.setRequestHandler(
    ReadResourceRequestSchema,
    async (req: ReadResourceRequest) => {
      const widget = widgetsByUri.get(req.params.uri);
      if (!widget) {
        return {
          contents: [],
          _meta: { error: `Unknown resource: ${req.params.uri}` },
        };
      }
      return {
        contents: [
          {
            uri: widget.templateUri,
            mimeType: MIME_TYPE,
            text: widget.html,
            _meta: descriptorMeta(widget),
          },
        ],
      };
    }
  );

  // ────── List Tools ──────
  const tools: Tool[] = [
    {
      name: "show-hr-dashboard",
      title: "Show HR Dashboard",
      description:
        "Display the HR consultant dashboard with KPIs: consultant count, project count, total billable hours, and utilization data.",
      inputSchema: dashboardInputSchema,
      _meta: descriptorMeta(DASHBOARD_WIDGET),
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: true,
      },
    },
    {
      name: "show-consultant-profile",
      title: "Show Consultant Profile",
      description:
        "Display a detailed profile card for a specific consultant, including contact info, skills, certifications, roles, and current assignments.",
      inputSchema: profileInputSchema,
      _meta: descriptorMeta(PROFILE_WIDGET),
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: true,
      },
    },
    {
      name: "search-consultants",
      title: "Search Consultants",
      description:
        "Search consultants by skill or name. Returns matching consultants shown in the dashboard widget.",
      inputSchema: searchInputSchema,
      _meta: descriptorMeta(DASHBOARD_WIDGET),
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: true,
      },
    },
    {
      name: "show-bulk-editor",
      title: "Show Bulk Editor",
      description:
        "Open the bulk editor widget to view and edit multiple consultant records at once, including skills, roles, contact details.",
      inputSchema: bulkEditorInputSchema,
      _meta: descriptorMeta(BULK_EDITOR_WIDGET),
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: false,
      },
    },
    {
      name: "update-consultant",
      title: "Update Consultant",
      description:
        "Update a single consultant's information (name, email, phone, skills, roles).",
      inputSchema: updateConsultantInputSchema,
      annotations: {
        destructiveHint: true,
        openWorldHint: false,
        readOnlyHint: false,
      },
    },
    {
      name: "bulk-update-consultants",
      title: "Bulk Update Consultants",
      description:
        "Batch-update multiple consultant records at once.",
      inputSchema: bulkUpdateInputSchema,
      annotations: {
        destructiveHint: true,
        openWorldHint: false,
        readOnlyHint: false,
      },
    },
    {
      name: "show-project-details",
      title: "Show Project Details",
      description:
        "Display detailed information about a specific project including its assigned consultants and forecasted hours.",
      inputSchema: projectDetailInputSchema,
      _meta: descriptorMeta(DASHBOARD_WIDGET),
      annotations: {
        destructiveHint: false,
        openWorldHint: false,
        readOnlyHint: true,
      },
    },
  ];

  server.setRequestHandler(
    ListToolsRequestSchema,
    async (_req: ListToolsRequest) => ({ tools })
  );

  // ────── Call Tool ──────
  server.setRequestHandler(
    CallToolRequestSchema,
    async (req: CallToolRequest) => {
      const { name, arguments: rawArgs } = req.params;
      const args = rawArgs ?? {};

      switch (name) {
        // ──── Dashboard ────
        case "show-hr-dashboard": {
          const [consultants, projects, assignments] = await Promise.all([
            db.getAllConsultants(),
            db.getAllProjects(),
            db.getAllAssignments(),
          ]);

          const totalBillableHours = assignments.reduce((sum, a) => {
            if (!a.billable) return sum;
            const forecast: Array<{ hours: number }> = JSON.parse(a.forecast || "[]");
            return sum + forecast.reduce((s, f) => s + f.hours, 0);
          }, 0);

          const dashboardData = {
            consultants: consultants.map(parseConsultant),
            projects: projects.map(parseProject),
            assignments: assignments.map((a) => {
              const parsed = parseAssignment(a);
              const proj = projects.find((p) => p.rowKey === a.projectId);
              const cons = consultants.find((c) => c.rowKey === a.consultantId);
              return {
                ...parsed,
                projectName: proj?.name ?? "Unknown",
                clientName: proj?.clientName ?? "Unknown",
                consultantName: cons?.name ?? "Unknown",
              };
            }),
            summary: {
              totalConsultants: consultants.length,
              totalProjects: projects.length,
              totalAssignments: assignments.length,
              totalBillableHours,
            },
          };

          return {
            content: [
              {
                type: "text" as const,
                text: `HR Dashboard: ${consultants.length} consultants, ${projects.length} projects, ${totalBillableHours} billable hours forecasted.`,
              },
            ],
            structuredContent: dashboardData,
            _meta: invocationMeta(DASHBOARD_WIDGET),
          };
        }

        // ──── Consultant Profile ────
        case "show-consultant-profile": {
          const { consultantId } = profileParser.parse(args);
          const consultant = await db.getConsultantById(consultantId);
          if (!consultant) {
            return {
              content: [{ type: "text" as const, text: `Consultant ${consultantId} not found.` }],
              isError: true,
            };
          }
          const assignments = await db.getAssignmentsByConsultant(consultantId);
          const allProjects = await db.getAllProjects();
          const projectMap = new Map(allProjects.map((p) => [p.rowKey, parseProject(p)]));

          const enrichedAssignments = assignments.map((a) => ({
            ...parseAssignment(a),
            projectName: projectMap.get(a.projectId)?.name ?? "Unknown",
            clientName: projectMap.get(a.projectId)?.clientName ?? "Unknown",
          }));

          const profileData = {
            consultant: parseConsultant(consultant),
            assignments: enrichedAssignments,
          };

          return {
            content: [
              {
                type: "text" as const,
                text: `Profile for ${consultant.name}: ${JSON.parse(consultant.skills || "[]").join(", ")} | ${enrichedAssignments.length} active assignment(s).`,
              },
            ],
            structuredContent: profileData,
            _meta: invocationMeta(PROFILE_WIDGET),
          };
        }

        // ──── Search Consultants ────
        case "search-consultants": {
          const { skill, name: nameFilter } = searchParser.parse(args);
          let results = await db.getAllConsultants();

          if (skill) {
            results = results.filter((c) => {
              const skills: string[] = JSON.parse(c.skills || "[]");
              return skills.some((s) => s.toLowerCase().includes(skill.toLowerCase()));
            });
          }
          if (nameFilter) {
            results = results.filter((c) =>
              c.name.toLowerCase().includes(nameFilter.toLowerCase())
            );
          }

          const dashboardData = {
            consultants: results.map(parseConsultant),
            projects: [],
            summary: {
              totalConsultants: results.length,
              totalProjects: 0,
              totalAssignments: 0,
              totalBillableHours: 0,
              searchApplied: true,
              searchCriteria: { skill, name: nameFilter },
            },
          };

          return {
            content: [
              {
                type: "text" as const,
                text: `Found ${results.length} consultant(s) matching criteria.`,
              },
            ],
            structuredContent: dashboardData,
            _meta: invocationMeta(DASHBOARD_WIDGET),
          };
        }

        // ──── Bulk Editor ────
        case "show-bulk-editor": {
          const consultants = await db.getAllConsultants();
          return {
            content: [
              {
                type: "text" as const,
                text: `Bulk editor loaded with ${consultants.length} consultant records.`,
              },
            ],
            structuredContent: {
              consultants: consultants.map(parseConsultant),
            },
            _meta: invocationMeta(BULK_EDITOR_WIDGET),
          };
        }

        // ──── Update Single Consultant ────
        case "update-consultant": {
          const parsed = updateParser.parse(args);
          const { consultantId, ...updates } = parsed;
          const updated = await db.updateConsultant(consultantId, updates);
          if (!updated) {
            return {
              content: [{ type: "text" as const, text: `Consultant ${consultantId} not found.` }],
              isError: true,
            };
          }
          return {
            content: [
              {
                type: "text" as const,
                text: `Updated consultant ${updated.name} (ID: ${consultantId}).`,
              },
            ],
          };
        }

        // ──── Bulk Update ────
        case "bulk-update-consultants": {
          const { updates } = bulkUpdateParser.parse(args);
          const results: string[] = [];
          for (const upd of updates) {
            const { consultantId, ...changes } = upd;
            const updated = await db.updateConsultant(consultantId, changes);
            results.push(
              updated
                ? `✓ Updated ${updated.name}`
                : `✗ Consultant ${consultantId} not found`
            );
          }
          return {
            content: [
              {
                type: "text" as const,
                text: `Bulk update complete:\n${results.join("\n")}`,
              },
            ],
          };
        }

        // ──── Project Details ────
        case "show-project-details": {
          const { projectId } = projectDetailParser.parse(args);
          const project = await db.getProjectById(projectId);
          if (!project) {
            return {
              content: [{ type: "text" as const, text: `Project ${projectId} not found.` }],
              isError: true,
            };
          }
          const assignments = await db.getAssignmentsByProject(projectId);
          const allConsultants = await db.getAllConsultants();
          const consultantMap = new Map(allConsultants.map((c) => [c.rowKey, parseConsultant(c)]));

          const enrichedAssignments = assignments.map((a) => ({
            ...parseAssignment(a),
            consultantName: consultantMap.get(a.consultantId)?.name ?? "Unknown",
          }));

          return {
            content: [
              {
                type: "text" as const,
                text: `Project "${project.name}" for ${project.clientName}: ${enrichedAssignments.length} assignment(s).`,
              },
            ],
            structuredContent: {
              project: parseProject(project),
              assignments: enrichedAssignments,
              consultants: enrichedAssignments.map((a) => consultantMap.get(a.consultantId)).filter(Boolean),
              summary: {
                totalConsultants: enrichedAssignments.length,
                totalProjects: 1,
                totalAssignments: enrichedAssignments.length,
                totalBillableHours: enrichedAssignments.reduce((sum, a) => {
                  return sum + a.forecast.reduce((s: number, f: any) => s + f.hours, 0);
                }, 0),
              },
            },
            _meta: invocationMeta(DASHBOARD_WIDGET),
          };
        }

        default:
          return {
            content: [{ type: "text" as const, text: `Unknown tool: ${name}` }],
            isError: true,
          };
      }
    }
  );

  return server;
}
