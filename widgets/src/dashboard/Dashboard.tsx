import React, { useState } from "react";
import {
  Card,
  Text,
  Badge,
  Button,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  TableCellLayout,
  tokens,
  makeStyles,
  mergeClasses,
  Divider,
  Subtitle1,
  Subtitle2,
  Body1,
  Body2,
  Caption1,
  Title3,
  Title2,
} from "@fluentui/react-components";
import {
  People20Regular,
  People24Regular,
  Briefcase20Regular,
  Briefcase24Regular,
  Clock20Regular,
  Clock24Regular,
  ArrowRight16Regular,
  ArrowLeft16Regular,
  ArrowLeft20Regular,
  Mail20Regular,
  Phone20Regular,
  Location20Regular,
  Certificate20Regular,
  PersonBoard20Regular,
  ChevronRight16Regular,
  Building20Regular,
  MoneyHand20Regular,
} from "@fluentui/react-icons";
import { useOpenAiGlobal } from "../hooks/useOpenAiGlobal";
import type { DashboardData, Consultant, Project, Assignment } from "../types";

/* ── Colour palette (LinkedIn-inspired cool blues + enterprise neutral) ── */
const BRAND = "#0a66c2";
const BRAND_LIGHT = "#e8f1fb";
const BRAND_DARK = "#004182";
const SURFACE = "#f3f6f8";
const CARD_BG = "#ffffff";
const TEXT_PRIMARY = "#191919";
const TEXT_SECONDARY = "#666666";
const TEXT_TERTIARY = "#999999";
const DIVIDER = "#e8e8e8";
const GREEN = "#057642";
const GREEN_BG = "#e6f4ea";
const AMBER = "#b24020";
const AMBER_BG = "#fff3e0";
const AVATAR_COLORS = ["#0a66c2", "#7c3aed", "#0e7490", "#b45309", "#059669", "#dc2626", "#6d28d9", "#0284c7"];

/** Get initials from a name (max 2 chars) */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name[0] ?? "?").toUpperCase();
}
/** Deterministic colour based on name */
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/* ══════════════════════════════════════════════════════════════════════════
   LinkedIn-style avatar component with real photo + initials fallback
   ══════════════════════════════════════════════════════════════════════════ */
function Avatar({
  src,
  name,
  size = 40,
  ring = false,
}: {
  src?: string;
  name: string;
  size?: number;
  ring?: boolean;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const bg = avatarColor(name);
  const initials = getInitials(name);
  const borderW = ring ? 3 : 0;
  const outer = size + borderW * 2;

  const wrapperStyle: React.CSSProperties = {
    width: outer,
    height: outer,
    borderRadius: "50%",
    border: ring ? `${borderW}px solid ${BRAND}` : "none",
    flexShrink: 0,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: CARD_BG,
  };
  const innerStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  if (src && !imgFailed) {
    return (
      <span style={wrapperStyle}>
        <span style={innerStyle}>
          <img
            src={src}
            alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={() => setImgFailed(true)}
          />
        </span>
      </span>
    );
  }

  return (
    <span style={wrapperStyle}>
      <span
        style={{
          ...innerStyle,
          background: bg,
          color: "#fff",
          fontSize: size * 0.4,
          fontWeight: 700,
          letterSpacing: "0.5px",
          userSelect: "none",
        }}
      >
        {initials}
      </span>
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Styles
   ══════════════════════════════════════════════════════════════════════════ */
const useStyles = makeStyles({
  /* ── Layout ── */
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    padding: "24px",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    boxSizing: "border-box",
    width: "100%",
    overflowX: "hidden" as const,
    background: SURFACE,
    color: TEXT_PRIMARY,
    minHeight: "100%",
  },
  rootWhite: {
    background: CARD_BG,
  },

  /* ── Header ── */
  headerBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap" as const,
    gap: "8px",
  },
  headerTitle: {
    fontSize: "22px",
    fontWeight: 700,
    color: TEXT_PRIMARY,
    letterSpacing: "-0.3px",
  },
  headerSubtitle: {
    fontSize: "13px",
    color: TEXT_SECONDARY,
    fontWeight: 400,
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "13px",
    color: TEXT_SECONDARY,
  },
  breadcrumbLink: {
    color: BRAND,
    cursor: "pointer",
    fontWeight: 500,
    textDecoration: "none",
    ":hover": { textDecoration: "underline" },
  },

  /* ── KPI Cards ── */
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))",
    gap: "16px",
  },
  kpiCard: {
    background: CARD_BG,
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    border: `1px solid ${DIVIDER}`,
    transitionProperty: "box-shadow, transform",
    transitionDuration: "0.15s",
    transitionTimingFunction: "ease",
    ":hover": {
      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      transform: "translateY(-1px)",
    },
  },
  kpiIconBox: {
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  kpiValue: {
    fontSize: "30px",
    fontWeight: 700,
    lineHeight: "1.1",
    color: TEXT_PRIMARY,
    letterSpacing: "-0.5px",
  },
  kpiLabel: {
    fontSize: "12px",
    fontWeight: 500,
    color: TEXT_SECONDARY,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },

  /* ── Section header ── */
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: TEXT_PRIMARY,
  },
  sectionCount: {
    fontSize: "12px",
    fontWeight: 500,
    color: TEXT_TERTIARY,
    background: SURFACE,
    padding: "2px 10px",
    borderRadius: "12px",
  },

  /* ── Card-based consultant rows ── */
  consultantCards: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  consultantCard: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    background: CARD_BG,
    borderRadius: "12px",
    padding: "16px 20px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    border: `1px solid ${DIVIDER}`,
    cursor: "pointer",
    transitionProperty: "box-shadow, border-color",
    transitionDuration: "0.15s",
    transitionTimingFunction: "ease",
    ":hover": {
      boxShadow: "0 3px 10px rgba(0,0,0,0.07)",
      borderTopColor: BRAND,
      borderRightColor: BRAND,
      borderBottomColor: BRAND,
      borderLeftColor: BRAND,
    },
  },
  consultantInfo: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  consultantName: {
    fontSize: "15px",
    fontWeight: 600,
    color: TEXT_PRIMARY,
    whiteSpace: "nowrap" as const,
    overflow: "hidden" as const,
    textOverflow: "ellipsis" as const,
  },
  consultantMeta: {
    fontSize: "13px",
    color: TEXT_SECONDARY,
  },
  consultantBadges: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "4px",
    marginTop: "4px",
  },
  consultantChevron: {
    color: TEXT_TERTIARY,
    flexShrink: 0,
  },

  /* ── Project cards ── */
  projectCards: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  projectCard: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    background: CARD_BG,
    borderRadius: "12px",
    padding: "16px 20px",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    border: `1px solid ${DIVIDER}`,
    cursor: "pointer",
    transitionProperty: "box-shadow, border-color",
    transitionDuration: "0.15s",
    transitionTimingFunction: "ease",
    ":hover": {
      boxShadow: "0 3px 10px rgba(0,0,0,0.07)",
      borderTopColor: BRAND,
      borderRightColor: BRAND,
      borderBottomColor: BRAND,
      borderLeftColor: BRAND,
    },
  },
  projectIconBox: {
    width: "44px",
    height: "44px",
    borderRadius: "10px",
    background: BRAND_LIGHT,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    color: BRAND,
  },
  projectInfo: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  projectName: {
    fontSize: "15px",
    fontWeight: 600,
    color: TEXT_PRIMARY,
  },
  projectMeta: {
    fontSize: "13px",
    color: TEXT_SECONDARY,
  },

  /* ── Table (used in detail views) ── */
  tableWrapper: {
    overflowX: "auto" as const,
    width: "100%",
    WebkitOverflowScrolling: "touch" as const,
    borderRadius: "8px",
    border: `1px solid ${DIVIDER}`,
    background: CARD_BG,
  },
  table: {
    minWidth: "560px",
    width: "100%",
  },
  tableHeader: {
    background: SURFACE,
  },

  /* ── Profile detail view ── */
  profileBanner: {
    background: `linear-gradient(135deg, ${BRAND} 0%, ${BRAND_DARK} 100%)`,
    borderRadius: "12px",
    padding: "32px 24px 24px",
    display: "flex",
    gap: "20px",
    alignItems: "center",
    flexWrap: "wrap" as const,
    color: "#ffffff",
  },
  profileInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    fontSize: "24px",
    fontWeight: 700,
    color: "#ffffff",
    letterSpacing: "-0.3px",
  },
  profileContact: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: "rgba(255,255,255,0.85)",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
    gap: "12px",
  },
  statCard: {
    background: CARD_BG,
    borderRadius: "12px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    border: `1px solid ${DIVIDER}`,
  },
  statValue: {
    fontSize: "28px",
    fontWeight: 700,
    color: TEXT_PRIMARY,
    letterSpacing: "-0.5px",
  },
  statLabel: {
    fontSize: "12px",
    fontWeight: 500,
    color: TEXT_SECONDARY,
    textTransform: "uppercase" as const,
    letterSpacing: "0.3px",
  },

  /* ── Tags / badges section ── */
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    background: CARD_BG,
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    border: `1px solid ${DIVIDER}`,
  },
  sectionLabel: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "14px",
    fontWeight: 600,
    color: TEXT_PRIMARY,
  },
  tagRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "8px",
  },
  skillTag: {
    padding: "4px 12px",
    borderRadius: "16px",
    fontSize: "12px",
    fontWeight: 500,
    background: BRAND_LIGHT,
    color: BRAND_DARK,
    border: `1px solid rgba(10,102,194,0.15)`,
  },
  certTag: {
    padding: "4px 12px",
    borderRadius: "16px",
    fontSize: "12px",
    fontWeight: 500,
    background: GREEN_BG,
    color: GREEN,
    border: `1px solid rgba(5,118,66,0.15)`,
  },
  roleTag: {
    padding: "4px 12px",
    borderRadius: "16px",
    fontSize: "12px",
    fontWeight: 500,
    background: "#f3e8ff",
    color: "#6d28d9",
    border: `1px solid rgba(109,40,217,0.15)`,
  },

  /* ── Project detail header ── */
  projectBanner: {
    background: CARD_BG,
    borderRadius: "12px",
    padding: "24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    border: `1px solid ${DIVIDER}`,
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  projectDetailTitle: {
    fontSize: "22px",
    fontWeight: 700,
    color: TEXT_PRIMARY,
    letterSpacing: "-0.3px",
  },
  clientRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "13px",
    color: TEXT_SECONDARY,
  },

  /* ── No data ── */
  noData: {
    padding: "48px 24px",
    textAlign: "center" as const,
    color: TEXT_TERTIARY,
    background: CARD_BG,
    borderRadius: "12px",
    border: `1px solid ${DIVIDER}`,
  },
});

type ViewState =
  | { view: "dashboard" }
  | { view: "consultant"; id: string }
  | { view: "project"; id: string };

const fallback: DashboardData = {
  consultants: [],
  projects: [],
  assignments: [],
  summary: {
    totalConsultants: 0,
    totalProjects: 0,
    totalAssignments: 0,
    totalBillableHours: 0,
  },
};

export function Dashboard() {
  const styles = useStyles();
  const toolOutput = useOpenAiGlobal<DashboardData>("toolOutput");
  const data = toolOutput ?? fallback;
  const [viewState, setViewState] = useState<ViewState>({ view: "dashboard" });

  const allAssignments = data.assignments ?? [];

  /* ═══════════════════════════════════════════════════════════════════════
     CONSULTANT PROFILE VIEW
     ═══════════════════════════════════════════════════════════════════════ */
  if (viewState.view === "consultant") {
    const consultant = data.consultants.find((c) => c.id === viewState.id);
    if (!consultant) {
      return (
        <div className={styles.root}>
          <div className={styles.breadcrumb}>
            <span className={styles.breadcrumbLink} onClick={() => setViewState({ view: "dashboard" })}>Dashboard</span>
            <ChevronRight16Regular />
            <span>Not found</span>
          </div>
          <Body1>Consultant not found.</Body1>
        </div>
      );
    }
    const myAssignments = allAssignments.filter((a) => a.consultantId === consultant.id);
    const forecastHrs = myAssignments
      .filter((a) => a.billable)
      .reduce((sum, a) => sum + (a.forecast ?? []).reduce((s, f) => s + f.hours, 0), 0);
    const deliveredHrs = myAssignments.reduce(
      (sum, a) => sum + (a.delivered ?? []).reduce((s, d) => s + d.hours, 0),
      0
    );

    return (
      <div className={styles.root}>
        {/* Breadcrumb */}
        <div className={styles.breadcrumb}>
          <span className={styles.breadcrumbLink} onClick={() => setViewState({ view: "dashboard" })}>
            <ArrowLeft16Regular style={{ verticalAlign: "middle", marginRight: 2 }} />
            Dashboard
          </span>
          <ChevronRight16Regular />
          <span style={{ color: TEXT_PRIMARY, fontWeight: 500 }}>{consultant.name}</span>
        </div>

        {/* Profile banner */}
        <div className={styles.profileBanner}>
          <Avatar src={consultant.photoUrl} name={consultant.name} size={80} ring />
          <div className={styles.profileInfo}>
            <div className={styles.profileName}>{consultant.name}</div>
            {consultant.roles?.length > 0 && (
              <div style={{ fontSize: "14px", color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>
                {consultant.roles.join(" · ")}
              </div>
            )}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "4px" }}>
              <span className={styles.profileContact}><Mail20Regular style={{ fontSize: 16 }} />{consultant.email}</span>
              <span className={styles.profileContact}><Phone20Regular style={{ fontSize: 16 }} />{consultant.phone}</span>
              {consultant.location && (
                <span className={styles.profileContact}>
                  <Location20Regular style={{ fontSize: 16 }} />
                  {consultant.location.city}, {consultant.location.state}, {consultant.location.country}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{myAssignments.length}</span>
            <span className={styles.statLabel}>Active Projects</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{forecastHrs.toLocaleString()}</span>
            <span className={styles.statLabel}>Forecast Hours</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{deliveredHrs.toLocaleString()}</span>
            <span className={styles.statLabel}>Delivered Hours</span>
          </div>
        </div>

        {/* Skills */}
        {consultant.skills?.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}><PersonBoard20Regular />Skills</div>
            <div className={styles.tagRow}>
              {consultant.skills.map((s) => (
                <span key={s} className={styles.skillTag}>{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {consultant.certifications?.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}><Certificate20Regular />Certifications</div>
            <div className={styles.tagRow}>
              {consultant.certifications.map((c) => (
                <span key={c} className={styles.certTag}>{c}</span>
              ))}
            </div>
          </div>
        )}

        {/* Roles */}
        {consultant.roles?.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionLabel}><Briefcase20Regular />Roles</div>
            <div className={styles.tagRow}>
              {consultant.roles.map((r) => (
                <span key={r} className={styles.roleTag}>{r}</span>
              ))}
            </div>
          </div>
        )}

        {/* Assignments table */}
        {myAssignments.length > 0 && (
          <>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Assignments</span>
              <span className={styles.sectionCount}>{myAssignments.length}</span>
            </div>
            <div className={styles.tableWrapper}>
              <Table className={styles.table} size="small">
                <TableHeader className={styles.tableHeader}>
                  <TableRow>
                    <TableHeaderCell>Project</TableHeaderCell>
                    <TableHeaderCell>Role</TableHeaderCell>
                    <TableHeaderCell>Billable</TableHeaderCell>
                    <TableHeaderCell>Rate</TableHeaderCell>
                    <TableHeaderCell>Forecast Hrs</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myAssignments.map((asn, i) => {
                    const fh = (asn.forecast ?? []).reduce((s, f) => s + f.hours, 0);
                    return (
                      <TableRow key={i}>
                        <TableCell>
                          <span
                            style={{ color: BRAND, fontWeight: 500, cursor: "pointer" }}
                            onClick={() => setViewState({ view: "project", id: asn.projectId })}
                          >
                            {asn.projectName ?? `Project ${asn.projectId}`}
                          </span>
                        </TableCell>
                        <TableCell><span className={styles.roleTag}>{asn.role}</span></TableCell>
                        <TableCell>
                          <span
                            style={{
                              padding: "2px 10px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: 500,
                              background: asn.billable ? GREEN_BG : AMBER_BG,
                              color: asn.billable ? GREEN : AMBER,
                            }}
                          >
                            {asn.billable ? "Billable" : "Non-billable"}
                          </span>
                        </TableCell>
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
     PROJECT DETAIL VIEW
     ═══════════════════════════════════════════════════════════════════════ */
  if (viewState.view === "project") {
    const project = data.projects.find((p) => p.id === viewState.id);
    if (!project) {
      return (
        <div className={styles.root}>
          <div className={styles.breadcrumb}>
            <span className={styles.breadcrumbLink} onClick={() => setViewState({ view: "dashboard" })}>Dashboard</span>
            <ChevronRight16Regular />
            <span>Not found</span>
          </div>
          <Body1>Project not found.</Body1>
        </div>
      );
    }
    const projAssignments = allAssignments.filter((a) => a.projectId === project.id);
    const totalHrs = projAssignments.reduce(
      (sum, a) => sum + (a.forecast ?? []).reduce((s, f) => s + f.hours, 0),
      0
    );

    return (
      <div className={styles.root}>
        {/* Breadcrumb */}
        <div className={styles.breadcrumb}>
          <span className={styles.breadcrumbLink} onClick={() => setViewState({ view: "dashboard" })}>
            <ArrowLeft16Regular style={{ verticalAlign: "middle", marginRight: 2 }} />
            Dashboard
          </span>
          <ChevronRight16Regular />
          <span style={{ color: TEXT_PRIMARY, fontWeight: 500 }}>{project.name}</span>
        </div>

        {/* Project header card */}
        <div className={styles.projectBanner}>
          <div className={styles.projectDetailTitle}>{project.name}</div>
          <Body1 style={{ color: TEXT_SECONDARY, lineHeight: "1.5" }}>{project.description}</Body1>
          <Divider style={{ margin: "4px 0" }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
            <span className={styles.clientRow}><Building20Regular /><strong>Client:</strong> {project.clientName}</span>
            <span className={styles.clientRow}><People20Regular /><strong>Contact:</strong> {project.clientContact}</span>
            <span className={styles.clientRow}><Mail20Regular />{project.clientEmail}</span>
          </div>
        </div>

        {/* Stats */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{projAssignments.length}</span>
            <span className={styles.statLabel}>Team Members</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{totalHrs.toLocaleString()}</span>
            <span className={styles.statLabel}>Total Forecast Hours</span>
          </div>
        </div>

        {/* Team table */}
        {projAssignments.length > 0 && (
          <>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>Team</span>
              <span className={styles.sectionCount}>{projAssignments.length} members</span>
            </div>
            <div className={styles.tableWrapper}>
              <Table className={styles.table} size="small">
                <TableHeader className={styles.tableHeader}>
                  <TableRow>
                    <TableHeaderCell>Consultant</TableHeaderCell>
                    <TableHeaderCell>Role</TableHeaderCell>
                    <TableHeaderCell>Billable</TableHeaderCell>
                    <TableHeaderCell>Rate</TableHeaderCell>
                    <TableHeaderCell>Forecast Hrs</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projAssignments.map((asn, i) => {
                    const c = data.consultants.find((x) => x.id === asn.consultantId);
                    const fh = (asn.forecast ?? []).reduce((s, f) => s + f.hours, 0);
                    return (
                      <TableRow key={i}>
                        <TableCell>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => setViewState({ view: "consultant", id: asn.consultantId })}>
                            <Avatar src={c?.photoUrl} name={asn.consultantName ?? "?"} size={32} />
                            <span style={{ color: BRAND, fontWeight: 500 }}>{asn.consultantName ?? `Consultant ${asn.consultantId}`}</span>
                          </div>
                        </TableCell>
                        <TableCell><span className={styles.roleTag}>{asn.role}</span></TableCell>
                        <TableCell>
                          <span
                            style={{
                              padding: "2px 10px",
                              borderRadius: "12px",
                              fontSize: "12px",
                              fontWeight: 500,
                              background: asn.billable ? GREEN_BG : AMBER_BG,
                              color: asn.billable ? GREEN : AMBER,
                            }}
                          >
                            {asn.billable ? "Billable" : "Non-billable"}
                          </span>
                        </TableCell>
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
     MAIN DASHBOARD VIEW
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className={styles.root}>
      {/* Header */}
      <div className={styles.headerBar}>
        <div>
          <div className={styles.headerTitle}>HR Consultant Dashboard</div>
          {data.summary?.searchApplied && (
            <div className={styles.headerSubtitle}>
              Filtered by:{" "}
              {data.summary.searchCriteria?.skill && `skill = "${data.summary.searchCriteria.skill}"`}
              {data.summary.searchCriteria?.name && ` name = "${data.summary.searchCriteria.name}"`}
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconBox} style={{ background: BRAND_LIGHT, color: BRAND }}>
            <People24Regular />
          </div>
          <span className={styles.kpiValue}>{data.summary.totalConsultants}</span>
          <span className={styles.kpiLabel}>Consultants</span>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconBox} style={{ background: "#f3e8ff", color: "#7c3aed" }}>
            <Briefcase24Regular />
          </div>
          <span className={styles.kpiValue}>{data.summary.totalProjects}</span>
          <span className={styles.kpiLabel}>Projects</span>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconBox} style={{ background: GREEN_BG, color: GREEN }}>
            <Clock24Regular />
          </div>
          <span className={styles.kpiValue}>{data.summary.totalBillableHours.toLocaleString()}</span>
          <span className={styles.kpiLabel}>Billable Hours</span>
        </div>
        <div className={styles.kpiCard}>
          <div className={styles.kpiIconBox} style={{ background: AMBER_BG, color: AMBER }}>
            <MoneyHand20Regular />
          </div>
          <span className={styles.kpiValue}>{data.summary.totalAssignments}</span>
          <span className={styles.kpiLabel}>Assignments</span>
        </div>
      </div>

      {/* Consultants */}
      {data.consultants.length > 0 && (
        <>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}>Consultants</span>
            <span className={styles.sectionCount}>{data.consultants.length}</span>
          </div>
          <div className={styles.consultantCards}>
            {data.consultants.map((c: Consultant) => (
              <div
                key={c.id}
                className={styles.consultantCard}
                onClick={() => setViewState({ view: "consultant", id: c.id })}
              >
                <Avatar src={c.photoUrl} name={c.name} size={48} />
                <div className={styles.consultantInfo}>
                  <div className={styles.consultantName}>{c.name}</div>
                  <div className={styles.consultantMeta}>
                    {c.location.city}, {c.location.country} &middot; {c.email}
                  </div>
                  <div className={styles.consultantBadges}>
                    {c.skills.slice(0, 4).map((s) => (
                      <span key={s} className={styles.skillTag}>{s}</span>
                    ))}
                    {c.skills.length > 4 && (
                      <span className={styles.skillTag} style={{ background: "transparent", color: TEXT_TERTIARY, border: `1px dashed ${DIVIDER}` }}>
                        +{c.skills.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight16Regular className={styles.consultantChevron} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Projects */}
      {data.projects.length > 0 && (
        <>
          <div className={styles.sectionHeader} style={{ marginTop: "4px" }}>
            <span className={styles.sectionTitle}>Projects</span>
            <span className={styles.sectionCount}>{data.projects.length}</span>
          </div>
          <div className={styles.projectCards}>
            {data.projects.map((p: Project) => (
              <div
                key={p.id}
                className={styles.projectCard}
                onClick={() => setViewState({ view: "project", id: p.id })}
              >
                <div className={styles.projectIconBox}>
                  <Briefcase20Regular />
                </div>
                <div className={styles.projectInfo}>
                  <div className={styles.projectName}>{p.name}</div>
                  <div className={styles.projectMeta}>{p.clientName} &middot; {p.description}</div>
                </div>
                <ChevronRight16Regular className={styles.consultantChevron} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Empty state */}
      {data.consultants.length === 0 && data.projects.length === 0 && (
        <div className={styles.noData}>
          <People24Regular style={{ fontSize: 40, color: TEXT_TERTIARY, display: "block", margin: "0 auto 12px" }} />
          <Body1>No data loaded yet.</Body1>
          <Caption1 style={{ marginTop: 4, color: TEXT_TERTIARY }}>
            Use the MCP tool to hydrate this dashboard with HR data.
          </Caption1>
        </div>
      )}
    </div>
  );
}
