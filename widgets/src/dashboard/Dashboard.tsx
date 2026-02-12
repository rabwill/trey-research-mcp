import React, { useState, useCallback } from "react";
import {
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  makeStyles,
  Divider,
  Body1,
  Caption1,
} from "@fluentui/react-components";
import {
  People24Regular,
  Briefcase20Regular,
  Briefcase24Regular,
  Clock24Regular,
  ArrowLeft16Regular,
  Mail20Regular,
  Phone20Regular,
  Location20Regular,
  Certificate20Regular,
  PersonBoard20Regular,
  ChevronRight16Regular,
  Building20Regular,
  MoneyHand20Regular,
  PersonAdd20Regular,
  Dismiss16Regular,
  Add16Regular,
  Checkmark16Regular,
} from "@fluentui/react-icons";
import { useOpenAiGlobal } from "../hooks/useOpenAiGlobal";
import { useThemeColors, type ThemeColors } from "../hooks/useThemeColors";
import type { DashboardData, Consultant, Project, Assignment } from "../types";

/* ── Helpers ── */
const AVATAR_COLORS = ["#0a66c2", "#7c3aed", "#0e7490", "#b45309", "#059669", "#dc2626", "#6d28d9", "#0284c7"];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] ?? "?").toUpperCase();
}
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ── Avatar ── */
function Avatar({ src, name, size = 40, ring = false, ringColor }: { src?: string; name: string; size?: number; ring?: boolean; ringColor?: string }) {
  const [imgFailed, setImgFailed] = useState(false);
  const bg = avatarColor(name);
  const bw = ring ? 3 : 0;
  const outer = size + bw * 2;
  const wrap: React.CSSProperties = { width: outer, height: outer, borderRadius: "50%", border: ring ? `${bw}px solid ${ringColor ?? bg}` : "none", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" };
  const inner: React.CSSProperties = { width: size, height: size, borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" };
  if (src && !imgFailed) {
    return <span style={wrap}><span style={inner}><img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={() => setImgFailed(true)} /></span></span>;
  }
  return <span style={wrap}><span style={{ ...inner, background: bg, color: "#fff", fontSize: size * 0.4, fontWeight: 700, letterSpacing: "0.5px", userSelect: "none" }}>{getInitials(name)}</span></span>;
}

/* ── Structural styles (no colours) ── */
const useStyles = makeStyles({
  root: { display: "flex", flexDirection: "column", gap: "20px", padding: "24px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', boxSizing: "border-box", width: "100%", overflowX: "hidden" as const, minHeight: "100%" },
  headerBar: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: "8px" },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: "16px" },
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0" },
  cards: { display: "flex", flexDirection: "column", gap: "8px" },
  tableWrapper: { overflowX: "auto" as const, width: "100%", WebkitOverflowScrolling: "touch" as const, borderRadius: "8px" },
  table: { minWidth: "560px", width: "100%" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "12px" },
  tagRow: { display: "flex", flexWrap: "wrap" as const, gap: "8px" },
  breadcrumb: { display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" },
  profileBanner: { borderRadius: "12px", padding: "32px 24px 24px", display: "flex", gap: "20px", alignItems: "center", flexWrap: "wrap" as const },
  profileInfo: { display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: 0 },
  profileContact: { display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" },
});

/* ── Pill helper ── */
function Pill({ children, bg, color, border }: { children: React.ReactNode; bg: string; color: string; border?: string }) {
  return <span style={{ padding: "4px 12px", borderRadius: "16px", fontSize: "12px", fontWeight: 500, background: bg, color, border: border ?? "none", whiteSpace: "nowrap" }}>{children}</span>;
}

/* ── Billable pill ── */
function BillablePill({ billable, t }: { billable: boolean; t: ThemeColors }) {
  return <Pill bg={billable ? t.greenBg : t.amberBg} color={billable ? t.green : t.amber}>{billable ? "Billable" : "Non-billable"}</Pill>;
}

type ViewState = { view: "dashboard" } | { view: "consultant"; id: string } | { view: "project"; id: string };

const fallback: DashboardData = { consultants: [], projects: [], assignments: [], summary: { totalConsultants: 0, totalProjects: 0, totalAssignments: 0, totalBillableHours: 0 } };

/** Shared input style factory */
function inputStyle(t: ThemeColors): React.CSSProperties {
  return {
    padding: "8px 12px",
    borderRadius: 8,
    border: `1px solid ${t.divider}`,
    background: t.cardBg,
    color: t.textPrimary,
    fontSize: 13,
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 0.15s ease",
    width: "100%",
    boxSizing: "border-box",
  };
}

/** Shared button style factory */
function btnStyle(t: ThemeColors, variant: "primary" | "danger" | "ghost" = "primary"): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "7px 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    transition: "opacity 0.15s ease",
    border: "none",
    whiteSpace: "nowrap",
  };
  if (variant === "primary") return { ...base, background: t.brand, color: "#fff" };
  if (variant === "danger") return { ...base, background: "transparent", color: t.amber, border: `1px solid ${t.amber}44`, padding: "5px 10px", fontSize: 12 };
  return { ...base, background: "transparent", color: t.textSecondary, padding: "5px 10px", fontSize: 12 };
}

export function Dashboard() {
  const s = useStyles();
  const t = useThemeColors();
  const toolOutput = useOpenAiGlobal<DashboardData>("toolOutput");
  const data = toolOutput ?? fallback;
  // Auto-detect single-project payloads (from show-project-details tool)
  const autoProjectId = data.projects.length === 1 && (data.summary?.totalProjects ?? 0) <= 1
    ? data.projects[0].id
    : undefined;
  const [viewState, setViewState] = useState<ViewState>({ view: "dashboard" });
  // Navigate to project detail when a single-project payload arrives
  React.useEffect(() => {
    if (autoProjectId) setViewState({ view: "project", id: autoProjectId });
  }, [autoProjectId]);
  const allAssignments = data.assignments ?? [];

  /* Shared inline-style factories */
  const cardStyle: React.CSSProperties = { background: t.cardBg, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: `1px solid ${t.divider}` };
  const hoverCard = (e: React.MouseEvent, enter: boolean) => {
    const el = e.currentTarget as HTMLElement;
    el.style.boxShadow = enter ? "0 3px 10px rgba(0,0,0,0.07)" : "0 1px 2px rgba(0,0,0,0.04)";
    el.style.borderColor = enter ? t.brand : t.divider;
  };

  /* ═══════════════════════════════════════════════════════════════════════
     CONSULTANT PROFILE
     ═══════════════════════════════════════════════════════════════════════ */
  if (viewState.view === "consultant") {
    const consultant = data.consultants.find((c) => c.id === viewState.id);
    if (!consultant) {
      return (
        <div className={s.root} style={{ background: t.surface, color: t.textPrimary }}>
          <div className={s.breadcrumb} style={{ color: t.textSecondary }}>
            <span style={{ color: t.brand, cursor: "pointer", fontWeight: 500 }} onClick={() => setViewState({ view: "dashboard" })}>Dashboard</span>
            <ChevronRight16Regular /><span>Not found</span>
          </div>
          <Body1>Consultant not found.</Body1>
        </div>
      );
    }
    const myAsn = allAssignments.filter((a) => a.consultantId === consultant.id);
    const forecastHrs = myAsn.filter((a) => a.billable).reduce((sum, a) => sum + (a.forecast ?? []).reduce((x, f) => x + f.hours, 0), 0);
    const deliveredHrs = myAsn.reduce((sum, a) => sum + (a.delivered ?? []).reduce((x, d) => x + d.hours, 0), 0);

    return (
      <div className={s.root} style={{ background: t.surface, color: t.textPrimary }}>
        {/* Breadcrumb */}
        <div className={s.breadcrumb} style={{ color: t.textSecondary }}>
          <span style={{ color: t.brand, cursor: "pointer", fontWeight: 500 }} onClick={() => setViewState({ view: "dashboard" })}>
            <ArrowLeft16Regular style={{ verticalAlign: "middle", marginRight: 2 }} />Dashboard
          </span>
          <ChevronRight16Regular />
          <span style={{ color: t.textPrimary, fontWeight: 500 }}>{consultant.name}</span>
        </div>

        {/* Banner */}
        <div className={s.profileBanner} style={{ background: t.bannerGradient, color: t.bannerText }}>
          <Avatar src={consultant.photoUrl} name={consultant.name} size={80} ring ringColor={t.bannerText} />
          <div className={s.profileInfo}>
            <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.3px", color: t.bannerText }}>{consultant.name}</div>
            {consultant.roles?.length > 0 && (
              <div style={{ fontSize: 14, color: `${t.bannerText}e6`, fontWeight: 500 }}>{consultant.roles.join(" · ")}</div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 4 }}>
              <span className={s.profileContact} style={{ color: `${t.bannerText}d9` }}><Mail20Regular style={{ fontSize: 16 }} />{consultant.email}</span>
              <span className={s.profileContact} style={{ color: `${t.bannerText}d9` }}><Phone20Regular style={{ fontSize: 16 }} />{consultant.phone}</span>
              {consultant.location && (
                <span className={s.profileContact} style={{ color: `${t.bannerText}d9` }}><Location20Regular style={{ fontSize: 16 }} />{consultant.location.city}, {consultant.location.state}, {consultant.location.country}</span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className={s.statsGrid}>
          {[{ v: myAsn.length, l: "Active Projects" }, { v: forecastHrs.toLocaleString(), l: "Forecast Hours" }, { v: deliveredHrs.toLocaleString(), l: "Delivered Hours" }].map(({ v, l }) => (
            <div key={l} style={{ ...cardStyle, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 700, color: t.textPrimary, letterSpacing: "-0.5px" }}>{v}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.3px" }}>{l}</span>
            </div>
          ))}
        </div>

        {/* Skills */}
        {consultant.skills?.length > 0 && (
          <div style={{ ...cardStyle, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: t.textPrimary }}><PersonBoard20Regular />Skills</div>
            <div className={s.tagRow}>{consultant.skills.map((sk) => <Pill key={sk} bg={t.brandLight} color={t.brandDark} border={`1px solid ${t.brand}26`}>{sk}</Pill>)}</div>
          </div>
        )}
        {consultant.certifications?.length > 0 && (
          <div style={{ ...cardStyle, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: t.textPrimary }}><Certificate20Regular />Certifications</div>
            <div className={s.tagRow}>{consultant.certifications.map((c) => <Pill key={c} bg={t.greenBg} color={t.green} border={`1px solid ${t.green}26`}>{c}</Pill>)}</div>
          </div>
        )}
        {consultant.roles?.length > 0 && (
          <div style={{ ...cardStyle, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 600, color: t.textPrimary }}><Briefcase20Regular />Roles</div>
            <div className={s.tagRow}>{consultant.roles.map((r) => <Pill key={r} bg={t.purpleBg} color={t.purple} border={`1px solid ${t.purple}26`}>{r}</Pill>)}</div>
          </div>
        )}

        {/* Assignments table */}
        {myAsn.length > 0 && (
          <>
            <div className={s.sectionHeader}>
              <span style={{ fontSize: 16, fontWeight: 600, color: t.textPrimary }}>Assignments</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: t.textTertiary, background: t.surface, padding: "2px 10px", borderRadius: 12 }}>{myAsn.length}</span>
            </div>
            <div className={s.tableWrapper} style={{ border: `1px solid ${t.divider}`, background: t.cardBg }}>
              <Table className={s.table} size="small">
                <TableHeader style={{ background: t.surface }}><TableRow>
                  <TableHeaderCell>Project</TableHeaderCell><TableHeaderCell>Role</TableHeaderCell><TableHeaderCell>Billable</TableHeaderCell><TableHeaderCell>Rate</TableHeaderCell><TableHeaderCell>Forecast Hrs</TableHeaderCell>
                </TableRow></TableHeader>
                <TableBody>
                  {myAsn.map((asn, i) => {
                    const fh = (asn.forecast ?? []).reduce((x, f) => x + f.hours, 0);
                    return (
                      <TableRow key={i}>
                        <TableCell><span style={{ color: t.brand, fontWeight: 500, cursor: "pointer" }} onClick={() => setViewState({ view: "project", id: asn.projectId })}>{asn.projectName ?? `Project ${asn.projectId}`}</span></TableCell>
                        <TableCell><Pill bg={t.purpleBg} color={t.purple}>{asn.role}</Pill></TableCell>
                        <TableCell><BillablePill billable={asn.billable} t={t} /></TableCell>
                        <TableCell><Body1>${asn.rate}/hr</Body1></TableCell>
                        <TableCell><Body1 style={{ fontWeight: 600 }}>{fh.toLocaleString()}</Body1></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════
     PROJECT DETAIL
     ═══════════════════════════════════════════════════════════════════════ */
  if (viewState.view === "project") {
    const project = data.projects.find((p) => p.id === viewState.id);
    if (!project) {
      return (
        <div className={s.root} style={{ background: t.surface, color: t.textPrimary }}>
          <div className={s.breadcrumb} style={{ color: t.textSecondary }}>
            <span style={{ color: t.brand, cursor: "pointer", fontWeight: 500 }} onClick={() => setViewState({ view: "dashboard" })}>Dashboard</span>
            <ChevronRight16Regular /><span>Not found</span>
          </div>
          <Body1>Project not found.</Body1>
        </div>
      );
    }
    return <ProjectDetailView project={project} data={data} allAssignments={allAssignments} s={s} t={t} cardStyle={cardStyle} setViewState={setViewState} />;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     MAIN DASHBOARD
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className={s.root} style={{ background: t.surface, color: t.textPrimary }}>
      {/* Header */}
      <div className={s.headerBar}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: t.textPrimary, letterSpacing: "-0.3px" }}>HR Consultant Dashboard</div>
          {data.summary?.searchApplied && (
            <div style={{ fontSize: 13, color: t.textSecondary, fontWeight: 400 }}>
              Filtered by:{" "}
              {data.summary.searchCriteria?.skill && `skill = "${data.summary.searchCriteria.skill}"`}
              {data.summary.searchCriteria?.name && ` name = "${data.summary.searchCriteria.name}"`}
            </div>
          )}
        </div>
      </div>

      {/* KPI */}
      <div className={s.kpiGrid}>
        {[
          { icon: <People24Regular />, val: data.summary.totalConsultants, label: "Consultants", ibg: t.brandLight, ic: t.brand },
          { icon: <Briefcase24Regular />, val: data.summary.totalProjects, label: "Projects", ibg: t.purpleBg, ic: t.purple },
          { icon: <Clock24Regular />, val: data.summary.totalBillableHours.toLocaleString(), label: "Billable Hours", ibg: t.greenBg, ic: t.green },
          { icon: <MoneyHand20Regular />, val: data.summary.totalAssignments, label: "Assignments", ibg: t.amberBg, ic: t.amber },
        ].map(({ icon, val, label, ibg, ic }) => (
          <div key={label} style={{ ...cardStyle, padding: 20, display: "flex", flexDirection: "column", gap: 8, transition: "box-shadow 0.15s ease, transform 0.15s ease", cursor: "default" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: ibg, color: ic }}>{icon}</div>
            <span style={{ fontSize: 30, fontWeight: 700, lineHeight: "1.1", color: t.textPrimary, letterSpacing: "-0.5px" }}>{val}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Consultants */}
      {data.consultants.length > 0 && (
        <>
          <div className={s.sectionHeader}>
            <span style={{ fontSize: 16, fontWeight: 600, color: t.textPrimary }}>Consultants</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: t.textTertiary, background: t.surface, padding: "2px 10px", borderRadius: 12 }}>{data.consultants.length}</span>
          </div>
          <div className={s.cards}>
            {data.consultants.map((c: Consultant) => (
              <div key={c.id}
                style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", cursor: "pointer", transition: "box-shadow 0.15s ease, border-color 0.15s ease" }}
                onMouseEnter={(e) => hoverCard(e, true)} onMouseLeave={(e) => hoverCard(e, false)}
                onClick={() => setViewState({ view: "consultant", id: c.id })}
              >
                <Avatar src={c.photoUrl} name={c.name} size={48} />
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: t.textPrimary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                  <div style={{ fontSize: 13, color: t.textSecondary }}>{c.location.city}, {c.location.country} &middot; {c.email}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                    {c.skills.slice(0, 4).map((sk) => <Pill key={sk} bg={t.brandLight} color={t.brandDark} border={`1px solid ${t.brand}26`}>{sk}</Pill>)}
                    {c.skills.length > 4 && <Pill bg="transparent" color={t.textTertiary} border={`1px dashed ${t.divider}`}>+{c.skills.length - 4} more</Pill>}
                  </div>
                </div>
                <ChevronRight16Regular style={{ color: t.textTertiary, flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Projects */}
      {data.projects.length > 0 && (
        <>
          <div className={s.sectionHeader} style={{ marginTop: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 600, color: t.textPrimary }}>Projects</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: t.textTertiary, background: t.surface, padding: "2px 10px", borderRadius: 12 }}>{data.projects.length}</span>
          </div>
          <div className={s.cards}>
            {data.projects.map((p: Project) => (
              <div key={p.id}
                style={{ ...cardStyle, display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", cursor: "pointer", transition: "box-shadow 0.15s ease, border-color 0.15s ease" }}
                onMouseEnter={(e) => hoverCard(e, true)} onMouseLeave={(e) => hoverCard(e, false)}
                onClick={() => setViewState({ view: "project", id: p.id })}
              >
                <div style={{ width: 44, height: 44, borderRadius: 10, background: t.brandLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: t.brand }}>
                  <Briefcase20Regular />
                </div>
                <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: t.textPrimary }}>{p.name}</div>
                  <div style={{ fontSize: 13, color: t.textSecondary }}>{p.clientName} &middot; {p.description}</div>
                </div>
                <ChevronRight16Regular style={{ color: t.textTertiary, flexShrink: 0 }} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty */}
      {data.consultants.length === 0 && data.projects.length === 0 && (
        <div style={{ ...cardStyle, padding: "48px 24px", textAlign: "center", color: t.textTertiary }}>
          <People24Regular style={{ fontSize: 40, color: t.textTertiary, display: "block", margin: "0 auto 12px" }} />
          <Body1>No data loaded yet.</Body1>
          <Caption1 style={{ marginTop: 4, color: t.textTertiary }}>Use the MCP tool to hydrate this dashboard with HR data.</Caption1>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROJECT DETAIL VIEW (with assign / remove functionality)
   ═══════════════════════════════════════════════════════════════════════════ */
function ProjectDetailView({
  project, data, allAssignments, s, t, cardStyle, setViewState,
}: {
  project: Project;
  data: DashboardData;
  allAssignments: Assignment[];
  s: ReturnType<typeof useStyles>;
  t: ThemeColors;
  cardStyle: React.CSSProperties;
  setViewState: (v: ViewState) => void;
}) {
  // Optimistic local copy of assignments so the UI updates immediately after mutations
  const [localAssignments, setLocalAssignments] = useState(allAssignments);
  // Keep in sync if parent data changes (e.g. full refresh)
  React.useEffect(() => setLocalAssignments(allAssignments), [allAssignments]);

  const projAsn = localAssignments.filter((a) => a.projectId === project.id);
  const totalHrs = projAsn.reduce((sum, a) => sum + (a.forecast ?? []).reduce((x, f) => x + f.hours, 0), 0);

  // Assign form state
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [assignConsultantId, setAssignConsultantId] = useState("");
  const [assignRole, setAssignRole] = useState("");
  const [assignRate, setAssignRate] = useState("");
  const [assignBillable, setAssignBillable] = useState(true);
  const [assignBusy, setAssignBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Bulk assign state
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkSelections, setBulkSelections] = useState<Set<string>>(new Set());
  const [bulkRole, setBulkRole] = useState("");
  const [bulkRate, setBulkRate] = useState("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [pendingRemove, setPendingRemove] = useState<string | null>(null);

  // Unassigned consultants for this project
  const assignedIds = new Set(projAsn.map((a) => a.consultantId));
  const unassigned = data.consultants.filter((c) => !assignedIds.has(c.id));

  const clearFeedback = () => setTimeout(() => setFeedback(null), 4000);

  const handleAssign = useCallback(async () => {
    if (!assignConsultantId || !assignRole) return;
    setAssignBusy(true);
    setFeedback(null);
    try {
      const result = await window.openai?.callTool?.("assign-consultant-to-project", {
        projectId: project.id,
        consultantId: assignConsultantId,
        role: assignRole,
        billable: assignBillable,
        rate: assignRate ? Number(assignRate) : undefined,
      });
      const consultant = data.consultants.find((c) => c.id === assignConsultantId);
      // Optimistically add to local state so table updates immediately
      setLocalAssignments((prev) => [
        ...prev,
        {
          id: `${project.id},${assignConsultantId}`,
          projectId: project.id,
          consultantId: assignConsultantId,
          role: assignRole,
          billable: assignBillable,
          rate: assignRate ? Number(assignRate) : 0,
          forecast: [],
          delivered: [],
          consultantName: consultant?.name ?? assignConsultantId,
          projectName: project.name,
          clientName: project.clientName,
        },
      ]);
      setFeedback({ type: "success", msg: `Assigned ${consultant?.name ?? assignConsultantId} as ${assignRole}` });
      setAssignConsultantId("");
      setAssignRole("");
      setAssignRate("");
      setShowAssignForm(false);
      clearFeedback();
    } catch (err: any) {
      setFeedback({ type: "error", msg: err?.message ?? "Assignment failed" });
      clearFeedback();
    } finally {
      setAssignBusy(false);
    }
  }, [assignConsultantId, assignRole, assignBillable, assignRate, project.id, data.consultants]);

  const handleBulkAssign = useCallback(async () => {
    if (bulkSelections.size === 0 || !bulkRole) return;
    setBulkBusy(true);
    setFeedback(null);
    try {
      const assignments = Array.from(bulkSelections).map((consultantId) => ({
        consultantId,
        role: bulkRole,
        billable: true,
        rate: bulkRate ? Number(bulkRate) : undefined,
      }));
      await window.openai?.callTool?.("bulk-assign-consultants", {
        projectId: project.id,
        assignments,
      });
      // Optimistically add all bulk-assigned consultants to local state
      const newAssignments = Array.from(bulkSelections).map((cId) => {
        const c = data.consultants.find((x) => x.id === cId);
        return {
          id: `${project.id},${cId}`,
          projectId: project.id,
          consultantId: cId,
          role: bulkRole,
          billable: true,
          rate: bulkRate ? Number(bulkRate) : 0,
          forecast: [],
          delivered: [],
          consultantName: c?.name ?? cId,
          projectName: project.name,
          clientName: project.clientName,
        };
      });
      setLocalAssignments((prev) => [...prev, ...newAssignments]);
      setFeedback({ type: "success", msg: `Assigned ${bulkSelections.size} consultant(s) to project` });
      setBulkSelections(new Set());
      setBulkRole("");
      setBulkRate("");
      setShowBulkAssign(false);
      clearFeedback();
    } catch (err: any) {
      setFeedback({ type: "error", msg: err?.message ?? "Bulk assignment failed" });
      clearFeedback();
    } finally {
      setBulkBusy(false);
    }
  }, [bulkSelections, bulkRole, bulkRate, project.id]);

  const handleRemove = useCallback(async (consultantId: string, consultantName: string) => {
    // Two-click confirmation: first click sets pending, second click confirms
    if (pendingRemove !== consultantId) {
      setPendingRemove(consultantId);
      // Auto-cancel after 3 seconds
      setTimeout(() => setPendingRemove((cur) => cur === consultantId ? null : cur), 3000);
      return;
    }
    setPendingRemove(null);
    setFeedback(null);
    try {
      await window.openai?.callTool?.("remove-assignment", {
        projectId: project.id,
        consultantId,
      });
      // Optimistically remove from local state
      setLocalAssignments((prev) => prev.filter(
        (a) => !(a.projectId === project.id && a.consultantId === consultantId)
      ));
      setFeedback({ type: "success", msg: `Removed ${consultantName} from project` });
      clearFeedback();
    } catch (err: any) {
      setFeedback({ type: "error", msg: err?.message ?? "Remove failed" });
      clearFeedback();
    }
  }, [project.id, pendingRemove]);

  const toggleBulkSelection = (id: string) => {
    setBulkSelections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <div className={s.root} style={{ background: t.surface, color: t.textPrimary }}>
      {/* Breadcrumb */}
      <div className={s.breadcrumb} style={{ color: t.textSecondary }}>
        <span style={{ color: t.brand, cursor: "pointer", fontWeight: 500 }} onClick={() => setViewState({ view: "dashboard" })}>
          <ArrowLeft16Regular style={{ verticalAlign: "middle", marginRight: 2 }} />Dashboard
        </span>
        <ChevronRight16Regular />
        <span style={{ color: t.textPrimary, fontWeight: 500 }}>{project.name}</span>
      </div>

      {/* Project Header */}
      <div style={{ ...cardStyle, padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: t.textPrimary, letterSpacing: "-0.3px" }}>{project.name}</div>
        <Body1 style={{ color: t.textSecondary, lineHeight: "1.5" }}>{project.description}</Body1>
        <Divider style={{ margin: "4px 0" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: t.textSecondary }}><Building20Regular /><strong>Client:</strong> {project.clientName}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: t.textSecondary }}><People24Regular /><strong>Contact:</strong> {project.clientContact}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: t.textSecondary }}><Mail20Regular />{project.clientEmail}</span>
        </div>
      </div>

      {/* Stats */}
      <div className={s.statsGrid}>
        {[{ v: projAsn.length, l: "Team Members" }, { v: totalHrs.toLocaleString(), l: "Total Forecast Hours" }].map(({ v, l }) => (
          <div key={l} style={{ ...cardStyle, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 700, color: t.textPrimary, letterSpacing: "-0.5px" }}>{v}</span>
            <span style={{ fontSize: 12, fontWeight: 500, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.3px" }}>{l}</span>
          </div>
        ))}
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div style={{
          padding: "10px 16px",
          borderRadius: 8,
          fontSize: 13,
          fontWeight: 500,
          background: feedback.type === "success" ? t.greenBg : t.amberBg,
          color: feedback.type === "success" ? t.green : t.amber,
          border: `1px solid ${feedback.type === "success" ? t.green : t.amber}33`,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}>
          {feedback.type === "success" ? <Checkmark16Regular /> : <Dismiss16Regular />}
          {feedback.msg}
        </div>
      )}

      {/* Team section header with actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: t.textPrimary }}>Team</span>
          <span style={{ fontSize: 12, fontWeight: 500, color: t.textTertiary, background: t.surface, padding: "2px 10px", borderRadius: 12 }}>{projAsn.length} members</span>
        </div>
        {unassigned.length > 0 && (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              style={{ ...btnStyle(t, "primary"), opacity: showAssignForm ? 0.7 : 1 }}
              onClick={() => { setShowAssignForm(!showAssignForm); setShowBulkAssign(false); }}
            >
              <PersonAdd20Regular style={{ fontSize: 16 }} />Assign
            </button>
            {unassigned.length > 1 && (
              <button
                style={{ ...btnStyle(t, "ghost"), border: `1px solid ${t.divider}`, opacity: showBulkAssign ? 0.7 : 1 }}
                onClick={() => { setShowBulkAssign(!showBulkAssign); setShowAssignForm(false); }}
              >
                <People24Regular style={{ fontSize: 16 }} />Bulk Assign
              </button>
            )}
          </div>
        )}
      </div>

      {/* Single assign form */}
      {showAssignForm && unassigned.length > 0 && (
        <div style={{ ...cardStyle, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
            <PersonAdd20Regular />Assign Consultant
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: t.textSecondary }}>Consultant</label>
              <select
                value={assignConsultantId}
                onChange={(e) => setAssignConsultantId(e.target.value)}
                style={{ ...inputStyle(t), cursor: "pointer" }}
              >
                <option value="">Select consultant…</option>
                {unassigned.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} — {c.roles.join(", ")}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: t.textSecondary }}>Role</label>
              <input
                type="text"
                placeholder="e.g. Architect, Developer…"
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value)}
                style={inputStyle(t)}
                onFocus={(e) => { e.target.style.borderColor = t.brand; }}
                onBlur={(e) => { e.target.style.borderColor = t.divider; }}
              />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: t.textSecondary }}>Rate ($/hr)</label>
              <input
                type="number"
                placeholder="e.g. 100"
                value={assignRate}
                onChange={(e) => setAssignRate(e.target.value)}
                style={inputStyle(t)}
                onFocus={(e) => { e.target.style.borderColor = t.brand; }}
                onBlur={(e) => { e.target.style.borderColor = t.divider; }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, paddingBottom: 4 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: t.textPrimary, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={assignBillable}
                  onChange={(e) => setAssignBillable(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: t.brand }}
                />
                Billable
              </label>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button style={btnStyle(t, "ghost")} onClick={() => setShowAssignForm(false)}>Cancel</button>
            <button
              style={{ ...btnStyle(t, "primary"), opacity: (!assignConsultantId || !assignRole || assignBusy) ? 0.5 : 1 }}
              disabled={!assignConsultantId || !assignRole || assignBusy}
              onClick={handleAssign}
            >
              {assignBusy ? "Assigning…" : <><Add16Regular />Assign</>}
            </button>
          </div>
        </div>
      )}

      {/* Bulk assign form */}
      {showBulkAssign && unassigned.length > 0 && (
        <div style={{ ...cardStyle, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
            <People24Regular />Bulk Assign Consultants
          </div>
          <div style={{ fontSize: 12, color: t.textSecondary }}>Select consultants to assign, then set a role and rate for all.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 200, overflowY: "auto", border: `1px solid ${t.divider}`, borderRadius: 8, padding: 4 }}>
            {unassigned.map((c) => (
              <label
                key={c.id}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 6, cursor: "pointer",
                  background: bulkSelections.has(c.id) ? t.brandLight : "transparent",
                  transition: "background 0.1s ease",
                }}
              >
                <input
                  type="checkbox"
                  checked={bulkSelections.has(c.id)}
                  onChange={() => toggleBulkSelection(c.id)}
                  style={{ width: 16, height: 16, cursor: "pointer", accentColor: t.brand }}
                />
                <Avatar src={c.photoUrl} name={c.name} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: t.textPrimary }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: t.textSecondary }}>{c.roles.join(", ")} · {c.location.city}</div>
                </div>
              </label>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: t.textSecondary }}>Role for all</label>
              <input
                type="text"
                placeholder="e.g. Developer"
                value={bulkRole}
                onChange={(e) => setBulkRole(e.target.value)}
                style={inputStyle(t)}
                onFocus={(e) => { e.target.style.borderColor = t.brand; }}
                onBlur={(e) => { e.target.style.borderColor = t.divider; }}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: t.textSecondary }}>Rate for all ($/hr)</label>
              <input
                type="number"
                placeholder="e.g. 100"
                value={bulkRate}
                onChange={(e) => setBulkRate(e.target.value)}
                style={inputStyle(t)}
                onFocus={(e) => { e.target.style.borderColor = t.brand; }}
                onBlur={(e) => { e.target.style.borderColor = t.divider; }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: t.textTertiary, marginRight: "auto" }}>{bulkSelections.size} selected</span>
            <button style={btnStyle(t, "ghost")} onClick={() => setShowBulkAssign(false)}>Cancel</button>
            <button
              style={{ ...btnStyle(t, "primary"), opacity: (bulkSelections.size === 0 || !bulkRole || bulkBusy) ? 0.5 : 1 }}
              disabled={bulkSelections.size === 0 || !bulkRole || bulkBusy}
              onClick={handleBulkAssign}
            >
              {bulkBusy ? "Assigning…" : <><Add16Regular />Assign {bulkSelections.size}</>}
            </button>
          </div>
        </div>
      )}

      {/* Team table */}
      {projAsn.length > 0 && (
        <div className={s.tableWrapper} style={{ border: `1px solid ${t.divider}`, background: t.cardBg }}>
          <Table className={s.table} size="small">
            <TableHeader style={{ background: t.surface }}><TableRow>
              <TableHeaderCell>Consultant</TableHeaderCell>
              <TableHeaderCell>Role</TableHeaderCell>
              <TableHeaderCell>Billable</TableHeaderCell>
              <TableHeaderCell>Rate</TableHeaderCell>
              <TableHeaderCell>Forecast Hrs</TableHeaderCell>
              <TableHeaderCell style={{ width: 60 }} />
            </TableRow></TableHeader>
            <TableBody>
              {projAsn.map((asn, i) => {
                const c = data.consultants.find((x) => x.id === asn.consultantId);
                const fh = (asn.forecast ?? []).reduce((x, f) => x + f.hours, 0);
                return (
                  <TableRow key={i}>
                    <TableCell>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setViewState({ view: "consultant", id: asn.consultantId })}>
                        <Avatar src={c?.photoUrl} name={asn.consultantName ?? "?"} size={32} />
                        <span style={{ color: t.brand, fontWeight: 500 }}>{asn.consultantName ?? `Consultant ${asn.consultantId}`}</span>
                      </div>
                    </TableCell>
                    <TableCell><Pill bg={t.purpleBg} color={t.purple}>{asn.role}</Pill></TableCell>
                    <TableCell><BillablePill billable={asn.billable} t={t} /></TableCell>
                    <TableCell><Body1>${asn.rate}/hr</Body1></TableCell>
                    <TableCell><Body1 style={{ fontWeight: 600 }}>{fh.toLocaleString()}</Body1></TableCell>
                    <TableCell>
                      <button
                        style={{
                          ...btnStyle(t, pendingRemove === asn.consultantId ? "danger" : "ghost"),
                          ...(pendingRemove === asn.consultantId
                            ? { background: t.amberBg, fontWeight: 700 }
                            : {}),
                        }}
                        title={pendingRemove === asn.consultantId
                          ? `Click again to confirm removal`
                          : `Remove ${asn.consultantName ?? "consultant"}`}
                        onClick={() => handleRemove(asn.consultantId, asn.consultantName ?? asn.consultantId)}
                      >
                        {pendingRemove === asn.consultantId ? <>Remove?</> : <Dismiss16Regular />}
                      </button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {projAsn.length === 0 && unassigned.length > 0 && !showAssignForm && !showBulkAssign && (
        <div style={{ ...cardStyle, padding: "32px 24px", textAlign: "center", color: t.textTertiary }}>
          <People24Regular style={{ fontSize: 36, display: "block", margin: "0 auto 8px", color: t.textTertiary }} />
          <Body1>No consultants assigned yet.</Body1>
          <Caption1 style={{ display: "block", marginTop: 4 }}>Use the Assign button above to add team members.</Caption1>
        </div>
      )}
    </div>
  );
}
