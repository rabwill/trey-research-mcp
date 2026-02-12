import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  Mail20Regular,
  Phone20Regular,
  Location20Regular,
  Certificate20Regular,
  PersonBoard20Regular,
  ChevronRight16Regular,
  ChevronDown16Regular,
  Building20Regular,
  MoneyHand20Regular,
  ArrowTrendingLines24Regular,
  DataUsage24Regular,
  Filter16Regular,
  ArrowLeft16Regular,
  FullScreenMaximize24Regular,
  FullScreenMinimize24Regular,
} from "@fluentui/react-icons";
import { useOpenAiGlobal } from "../hooks/useOpenAiGlobal";
import { useThemeColors, type ThemeColors } from "../hooks/useThemeColors";
import type { DashboardData, Consultant, Project, Assignment } from "../types";

/* ── Helpers ── */
const AVATAR_COLORS = ["#0a66c2", "#7c3aed", "#0e7490", "#b45309", "#059669", "#dc2626", "#6d28d9", "#0284c7"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

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
function Avatar({ src, name, size = 40 }: { src?: string; name: string; size?: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  const bg = avatarColor(name);
  const outer: React.CSSProperties = { width: size, height: size, borderRadius: "50%", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
  if (src && !imgFailed) {
    return <span style={outer}><img src={src} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={() => setImgFailed(true)} /></span>;
  }
  return <span style={{ ...outer, background: bg, color: "#fff", fontSize: size * 0.4, fontWeight: 700, letterSpacing: "0.5px", userSelect: "none" }}>{getInitials(name)}</span>;
}

/* ── Pill ── */
function Pill({ children, bg, color, border }: { children: React.ReactNode; bg: string; color: string; border?: string }) {
  return <span style={{ padding: "4px 12px", borderRadius: "16px", fontSize: "12px", fontWeight: 500, background: bg, color, border: border ?? "none", whiteSpace: "nowrap" }}>{children}</span>;
}

/* ── BillablePill ── */
function BillablePill({ billable, t }: { billable: boolean; t: ThemeColors }) {
  return <Pill bg={billable ? t.greenBg : t.amberBg} color={billable ? t.green : t.amber}>{billable ? "Billable" : "Non-billable"}</Pill>;
}

/* ── Structural styles ── */
const useStyles = makeStyles({
  root: { display: "flex", flexDirection: "column", gap: "20px", padding: "24px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif', boxSizing: "border-box", width: "100%", overflowX: "hidden" as const, minHeight: "100%" },
  headerBar: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" as const, gap: "8px" },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" },
  sectionHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0" },
  cards: { display: "flex", flexDirection: "column", gap: "8px" },
  tableWrapper: { overflowX: "auto" as const, width: "100%", WebkitOverflowScrolling: "touch" as const, borderRadius: "8px" },
  table: { minWidth: "560px", width: "100%" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" },
  tagRow: { display: "flex", flexWrap: "wrap" as const, gap: "8px" },
  chartGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px" },
  breadcrumb: { display: "flex", alignItems: "center", gap: "4px", fontSize: "13px" },
});

/* ── Mini bar chart (pure CSS) ── */
function BarChart({ data, t, maxHeight = 120 }: { data: { label: string; value: number; color?: string }[]; t: ThemeColors; maxHeight?: number }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: maxHeight, padding: "0 4px" }}>
      {data.map((d, i) => {
        const h = Math.max((d.value / max) * (maxHeight - 24), 4);
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: t.textSecondary }}>{d.value > 0 ? d.value : ""}</span>
            <div style={{ width: "100%", maxWidth: 32, height: h, borderRadius: "4px 4px 0 0", background: d.color ?? t.brand, transition: "height 0.3s ease" }} />
            <span style={{ fontSize: 9, color: t.textTertiary, whiteSpace: "nowrap" }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Donut chart (SVG) ── */
function DonutChart({ segments, size = 120, t }: { segments: { label: string; value: number; color: string }[]; size?: number; t: ThemeColors }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", color: t.textTertiary, fontSize: 12 }}>No data</div>;
  const r = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  let cumulative = 0;
  const paths = segments.filter((s) => s.value > 0).map((seg) => {
    const start = cumulative;
    cumulative += seg.value;
    const startAngle = (start / total) * 2 * Math.PI - Math.PI / 2;
    const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    return <path key={seg.label} d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`} fill={seg.color} />;
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths}
        <circle cx={cx} cy={cy} r={r * 0.55} fill={t.cardBg} />
        <text x={cx} y={cy - 4} textAnchor="middle" fill={t.textPrimary} fontSize="18" fontWeight="700">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill={t.textSecondary} fontSize="9">TOTAL</text>
      </svg>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
        {segments.filter((s) => s.value > 0).map((seg) => (
          <span key={seg.label} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: t.textSecondary }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: seg.color }} />
            {seg.label} ({seg.value})
          </span>
        ))}
      </div>
    </div>
  );
}

/* ── Progress bar ── */
function ProgressBar({ value, max, color, t }: { value: number; max: number; color: string; t: ThemeColors }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ width: "100%", height: 8, borderRadius: 4, background: t.divider, overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 4, background: color, transition: "width 0.4s ease" }} />
    </div>
  );
}

type ViewState = { view: "overview" } | { view: "consultants" } | { view: "projects" } | { view: "assignments" };

const fallback: DashboardData = { consultants: [], projects: [], assignments: [], summary: { totalConsultants: 0, totalProjects: 0, totalAssignments: 0, totalBillableHours: 0 } };

export function Dashboard() {
  const s = useStyles();
  const t = useThemeColors();
  const toolOutput = useOpenAiGlobal<DashboardData>("toolOutput");
  const data = toolOutput ?? fallback;
  const allAssignments = data.assignments ?? [];

  // Request fullscreen display mode on mount
  useEffect(() => {
    window.openai?.requestDisplayMode?.({ mode: "fullscreen" });
  }, []);

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Track browser fullscreen changes
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    // 1. Try Apps SDK
    if (window.openai?.requestDisplayMode) {
      const current = window.openai.displayMode;
      await window.openai.requestDisplayMode({ mode: current === "fullscreen" ? "inline" : "fullscreen" });
      return;
    }
    // 2. Try browser Fullscreen API
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        return;
      } else {
        await document.exitFullscreen();
        return;
      }
    } catch { /* blocked by sandbox or not supported */ }
    // 3. CSS-based fallback (always works)
    setIsFullscreen((prev) => !prev);
  }, []);

  const [viewState, setViewState] = useState<ViewState>({ view: "overview" });
  const [searchFilter, setSearchFilter] = useState("");
  const [expandedConsultant, setExpandedConsultant] = useState<string | null>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"name" | "hours" | "rate">("name");

  const cardStyle: React.CSSProperties = { background: t.cardBg, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: `1px solid ${t.divider}` };

  /* ── Computed analytics ── */
  const analytics = useMemo(() => {
    const billableAssignments = allAssignments.filter((a) => a.billable);
    const nonBillableAssignments = allAssignments.filter((a) => !a.billable);
    const totalForecastHrs = allAssignments.reduce((sum, a) => sum + (a.forecast ?? []).reduce((x, f) => x + f.hours, 0), 0);
    const totalDeliveredHrs = allAssignments.reduce((sum, a) => sum + (a.delivered ?? []).reduce((x, d) => x + d.hours, 0), 0);
    const billableForecastHrs = billableAssignments.reduce((sum, a) => sum + (a.forecast ?? []).reduce((x, f) => x + f.hours, 0), 0);
    const avgRate = allAssignments.length > 0 ? allAssignments.reduce((sum, a) => sum + (a.rate ?? 0), 0) / allAssignments.length : 0;
    const totalRevenue = billableAssignments.reduce((sum, a) => sum + (a.rate ?? 0) * (a.forecast ?? []).reduce((x, f) => x + f.hours, 0), 0);

    // Skills frequency
    const skillMap = new Map<string, number>();
    data.consultants.forEach((c) => c.skills?.forEach((sk) => skillMap.set(sk, (skillMap.get(sk) ?? 0) + 1)));
    const topSkills = [...skillMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

    // Monthly forecast
    const monthMap = new Map<string, number>();
    allAssignments.forEach((a) => (a.forecast ?? []).forEach((f) => {
      const key = `${f.year}-${String(f.month).padStart(2, "0")}`;
      monthMap.set(key, (monthMap.get(key) ?? 0) + f.hours);
    }));
    const monthlyForecast = [...monthMap.entries()].sort().map(([key, hours]) => ({
      label: MONTH_NAMES[parseInt(key.split("-")[1]) - 1] + " " + key.split("-")[0].slice(2),
      value: hours,
    }));

    // Consultant utilization
    const consultantUtil = data.consultants.map((c) => {
      const myAsn = allAssignments.filter((a) => a.consultantId === c.id);
      const forecastHrs = myAsn.reduce((sum, a) => sum + (a.forecast ?? []).reduce((x, f) => x + f.hours, 0), 0);
      const deliveredHrs = myAsn.reduce((sum, a) => sum + (a.delivered ?? []).reduce((x, d) => x + d.hours, 0), 0);
      const revenue = myAsn.filter((a) => a.billable).reduce((sum, a) => sum + (a.rate ?? 0) * (a.forecast ?? []).reduce((x, f) => x + f.hours, 0), 0);
      return { ...c, assignments: myAsn.length, forecastHrs, deliveredHrs, revenue };
    });

    // Project breakdown
    const projectBreakdown = data.projects.map((p) => {
      const projAsn = allAssignments.filter((a) => a.projectId === p.id);
      const forecastHrs = projAsn.reduce((sum, a) => sum + (a.forecast ?? []).reduce((x, f) => x + f.hours, 0), 0);
      const revenue = projAsn.filter((a) => a.billable).reduce((sum, a) => sum + (a.rate ?? 0) * (a.forecast ?? []).reduce((x, f) => x + f.hours, 0), 0);
      return { ...p, teamSize: projAsn.length, forecastHrs, revenue, assignments: projAsn };
    });

    // Roles distribution
    const roleMap = new Map<string, number>();
    allAssignments.forEach((a) => roleMap.set(a.role, (roleMap.get(a.role) ?? 0) + 1));
    const roleDistribution = [...roleMap.entries()].sort((a, b) => b[1] - a[1]);

    return {
      billableAssignments: billableAssignments.length,
      nonBillableAssignments: nonBillableAssignments.length,
      totalForecastHrs,
      totalDeliveredHrs,
      billableForecastHrs,
      avgRate: Math.round(avgRate),
      totalRevenue,
      topSkills,
      monthlyForecast,
      consultantUtil,
      projectBreakdown,
      roleDistribution,
    };
  }, [data, allAssignments]);

  /* ── Tab navigation ── */
  const tabs: { key: ViewState["view"]; label: string; icon: React.ReactNode }[] = [
    { key: "overview", label: "Overview", icon: <DataUsage24Regular /> },
    { key: "consultants", label: "Consultants", icon: <People24Regular /> },
    { key: "projects", label: "Projects", icon: <Briefcase24Regular /> },
    { key: "assignments", label: "Assignments", icon: <Clock24Regular /> },
  ];

  const currentTab = viewState.view;

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <div className={s.root} style={{
      background: t.surface, color: t.textPrimary,
      ...(isFullscreen ? {
        position: "fixed" as const, top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999, overflowY: "auto" as const,
      } : {}),
    }}>
      {/* Header */}
      <div className={s.headerBar}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: t.textPrimary, letterSpacing: "-0.3px", display: "flex", alignItems: "center", gap: 10 }}>
            <ArrowTrendingLines24Regular style={{ color: t.brand }} />
            HR Analytics Dashboard
          </div>
          <div style={{ fontSize: 13, color: t.textSecondary, marginTop: 2 }}>
            Extended view &middot; {data.summary.totalConsultants} consultants &middot; {data.summary.totalProjects} projects
          </div>
        </div>
        <button
          onClick={toggleFullscreen}
          style={{
            padding: "8px 16px", borderRadius: 8, border: `1px solid ${t.divider}`,
            background: isFullscreen ? t.brandLight : t.cardBg, color: t.textPrimary, fontSize: 13, fontWeight: 500,
            cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 6,
            transition: "background 0.15s ease",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = t.brandLight; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = isFullscreen ? t.brandLight : t.cardBg; }}
        >
          {isFullscreen ? <FullScreenMinimize24Regular style={{ fontSize: 16 }} /> : <FullScreenMaximize24Regular style={{ fontSize: 16 }} />}
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>
      </div>

      {/* Tab bar */}
      <div style={{ display: "flex", gap: 4, background: t.cardBg, padding: 4, borderRadius: 10, border: `1px solid ${t.divider}` }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setViewState({ view: tab.key })}
            style={{
              flex: 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: currentTab === tab.key ? 600 : 400, fontFamily: "inherit",
              background: currentTab === tab.key ? t.brand : "transparent",
              color: currentTab === tab.key ? "#fff" : t.textSecondary,
              transition: "all 0.15s ease",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── OVERVIEW TAB ───────────────────────────────── */}
      {currentTab === "overview" && (
        <>
          {/* KPI Cards */}
          <div className={s.kpiGrid}>
            {[
              { icon: <People24Regular />, val: data.summary.totalConsultants, label: "Consultants", ibg: t.brandLight, ic: t.brand },
              { icon: <Briefcase24Regular />, val: data.summary.totalProjects, label: "Projects", ibg: t.purpleBg, ic: t.purple },
              { icon: <Clock24Regular />, val: data.summary.totalBillableHours.toLocaleString(), label: "Billable Hours", ibg: t.greenBg, ic: t.green },
              { icon: <MoneyHand20Regular />, val: data.summary.totalAssignments, label: "Assignments", ibg: t.amberBg, ic: t.amber },
              { icon: <ArrowTrendingLines24Regular />, val: `$${analytics.avgRate}`, label: "Avg Rate/Hr", ibg: t.brandLight, ic: t.brand },
              { icon: <DataUsage24Regular />, val: `$${(analytics.totalRevenue / 1000).toFixed(0)}k`, label: "Forecast Revenue", ibg: t.greenBg, ic: t.green },
            ].map(({ icon, val, label, ibg, ic }) => (
              <div key={label} style={{ ...cardStyle, padding: 20, display: "flex", flexDirection: "column", gap: 8, transition: "box-shadow 0.15s ease, transform 0.15s ease", cursor: "default" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)"; (e.currentTarget as HTMLElement).style.transform = "none"; }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", background: ibg, color: ic }}>{icon}</div>
                <span style={{ fontSize: 28, fontWeight: 700, lineHeight: "1.1", color: t.textPrimary, letterSpacing: "-0.5px" }}>{val}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</span>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div className={s.chartGrid}>
            {/* Monthly Forecast */}
            {analytics.monthlyForecast.length > 0 && (
              <div style={{ ...cardStyle, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
                  <ArrowTrendingLines24Regular style={{ fontSize: 18, color: t.brand }} />Monthly Forecast Hours
                </div>
                <BarChart data={analytics.monthlyForecast} t={t} maxHeight={130} />
              </div>
            )}

            {/* Billable vs Non-Billable */}
            <div style={{ ...cardStyle, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
                <DataUsage24Regular style={{ fontSize: 18, color: t.purple }} />Assignment Breakdown
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <DonutChart
                  segments={[
                    { label: "Billable", value: analytics.billableAssignments, color: t.green },
                    { label: "Non-Billable", value: analytics.nonBillableAssignments, color: t.amber },
                  ]}
                  t={t}
                />
              </div>
            </div>

            {/* Role Distribution */}
            {analytics.roleDistribution.length > 0 && (
              <div style={{ ...cardStyle, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
                  <PersonBoard20Regular style={{ fontSize: 18, color: t.purple }} />Role Distribution
                </div>
                <BarChart
                  data={analytics.roleDistribution.map(([role, count], i) => ({
                    label: role.length > 8 ? role.slice(0, 7) + "…" : role,
                    value: count,
                    color: [t.brand, t.purple, t.green, t.amber, "#0e7490", "#b45309"][i % 6],
                  }))}
                  t={t}
                />
              </div>
            )}

            {/* Top Skills */}
            {analytics.topSkills.length > 0 && (
              <div style={{ ...cardStyle, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: t.textPrimary, display: "flex", alignItems: "center", gap: 8 }}>
                  <Certificate20Regular style={{ fontSize: 18, color: t.green }} />Top Skills
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {analytics.topSkills.map(([skill, count]) => (
                    <div key={skill} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 12, color: t.textPrimary, flex: "0 0 100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{skill}</span>
                      <ProgressBar value={count} max={analytics.topSkills[0][1]} color={t.brand} t={t} />
                      <span style={{ fontSize: 11, color: t.textTertiary, flex: "0 0 20px", textAlign: "right" }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Hours summary */}
          <div className={s.statsGrid}>
            {[
              { v: analytics.totalForecastHrs.toLocaleString(), l: "Total Forecast Hrs", color: t.brand },
              { v: analytics.totalDeliveredHrs.toLocaleString(), l: "Total Delivered Hrs", color: t.green },
              { v: analytics.billableForecastHrs.toLocaleString(), l: "Billable Forecast Hrs", color: t.purple },
              { v: `${analytics.totalForecastHrs > 0 ? Math.round((analytics.totalDeliveredHrs / analytics.totalForecastHrs) * 100) : 0}%`, l: "Delivery Rate", color: t.amber },
            ].map(({ v, l, color }) => (
              <div key={l} style={{ ...cardStyle, padding: 20, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 28, fontWeight: 700, color, letterSpacing: "-0.5px" }}>{v}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: t.textSecondary, textTransform: "uppercase", letterSpacing: "0.3px", textAlign: "center" }}>{l}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ─── CONSULTANTS TAB ───────────────────────────── */}
      {currentTab === "consultants" && (
        <>
          {/* Search & Sort */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
              <Filter16Regular style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: t.textTertiary }} />
              <input
                type="text"
                placeholder="Filter by name, skill, or location…"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                style={{
                  width: "100%", padding: "10px 12px 10px 34px", borderRadius: 8,
                  border: `1px solid ${t.divider}`, background: t.cardBg, color: t.textPrimary,
                  fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                }}
              />
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {(["name", "hours", "rate"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setSortBy(key)}
                  style={{
                    padding: "8px 14px", borderRadius: 8, border: `1px solid ${sortBy === key ? t.brand : t.divider}`,
                    background: sortBy === key ? t.brandLight : "transparent", color: sortBy === key ? t.brand : t.textSecondary,
                    fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {key === "name" ? "Name" : key === "hours" ? "Hours" : "Revenue"}
                </button>
              ))}
            </div>
          </div>

          {/* Consultant cards */}
          <div className={s.cards}>
            {analytics.consultantUtil
              .filter((c) => {
                if (!searchFilter) return true;
                const q = searchFilter.toLowerCase();
                return c.name.toLowerCase().includes(q) || c.skills?.some((sk) => sk.toLowerCase().includes(q)) || c.location?.city?.toLowerCase().includes(q);
              })
              .sort((a, b) => {
                if (sortBy === "hours") return b.forecastHrs - a.forecastHrs;
                if (sortBy === "rate") return b.revenue - a.revenue;
                return a.name.localeCompare(b.name);
              })
              .map((c) => {
                const isExpanded = expandedConsultant === c.id;
                const myAsn = allAssignments.filter((a) => a.consultantId === c.id);
                return (
                  <div key={c.id} style={{ ...cardStyle, padding: 0, overflow: "hidden", transition: "box-shadow 0.15s ease" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", cursor: "pointer" }}
                      onClick={() => setExpandedConsultant(isExpanded ? null : c.id)}
                    >
                      <Avatar src={c.photoUrl} name={c.name} size={44} />
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: t.textPrimary }}>{c.name}</div>
                        <div style={{ fontSize: 12, color: t.textSecondary }}>
                          {c.location?.city}, {c.location?.country} &middot; {c.assignments} project(s) &middot; {c.forecastHrs.toLocaleString()} hrs
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {c.revenue > 0 && (
                          <span style={{ fontSize: 14, fontWeight: 600, color: t.green }}>${(c.revenue / 1000).toFixed(1)}k</span>
                        )}
                        {isExpanded ? <ChevronDown16Regular style={{ color: t.textTertiary }} /> : <ChevronRight16Regular style={{ color: t.textTertiary }} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ borderTop: `1px solid ${t.divider}`, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12, background: t.surface }}>
                        {/* Contact */}
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: t.textSecondary }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Mail20Regular style={{ fontSize: 14 }} />{c.email}</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Phone20Regular style={{ fontSize: 14 }} />{c.phone}</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Location20Regular style={{ fontSize: 14 }} />{c.location?.city}, {c.location?.state}</span>
                        </div>
                        {/* Skills */}
                        {c.skills?.length > 0 && (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary, marginBottom: 6 }}>Skills</div>
                            <div className={s.tagRow}>{c.skills.map((sk) => <Pill key={sk} bg={t.brandLight} color={t.brandDark} border={`1px solid ${t.brand}26`}>{sk}</Pill>)}</div>
                          </div>
                        )}
                        {/* Stats */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
                          {[
                            { l: "Forecast Hrs", v: c.forecastHrs.toLocaleString() },
                            { l: "Delivered Hrs", v: c.deliveredHrs.toLocaleString() },
                            { l: "Revenue", v: `$${c.revenue.toLocaleString()}` },
                          ].map(({ l, v }) => (
                            <div key={l} style={{ padding: "10px 12px", borderRadius: 8, background: t.cardBg, border: `1px solid ${t.divider}`, textAlign: "center" }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary }}>{v}</div>
                              <div style={{ fontSize: 10, color: t.textTertiary, textTransform: "uppercase" }}>{l}</div>
                            </div>
                          ))}
                        </div>
                        {/* Assignments */}
                        {myAsn.length > 0 && (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary, marginBottom: 6 }}>Assignments</div>
                            <div className={s.tableWrapper} style={{ border: `1px solid ${t.divider}`, background: t.cardBg }}>
                              <Table className={s.table} size="small">
                                <TableHeader style={{ background: t.surface }}><TableRow>
                                  <TableHeaderCell>Project</TableHeaderCell><TableHeaderCell>Role</TableHeaderCell><TableHeaderCell>Billable</TableHeaderCell><TableHeaderCell>Rate</TableHeaderCell><TableHeaderCell>Hours</TableHeaderCell>
                                </TableRow></TableHeader>
                                <TableBody>
                                  {myAsn.map((asn, i) => (
                                    <TableRow key={i}>
                                      <TableCell><span style={{ fontWeight: 500, color: t.brand }}>{asn.projectName ?? asn.projectId}</span></TableCell>
                                      <TableCell><Pill bg={t.purpleBg} color={t.purple}>{asn.role}</Pill></TableCell>
                                      <TableCell><BillablePill billable={asn.billable} t={t} /></TableCell>
                                      <TableCell>${asn.rate}/hr</TableCell>
                                      <TableCell style={{ fontWeight: 600 }}>{(asn.forecast ?? []).reduce((x, f) => x + f.hours, 0).toLocaleString()}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </>
      )}

      {/* ─── PROJECTS TAB ──────────────────────────────── */}
      {currentTab === "projects" && (
        <>
          <div className={s.cards}>
            {analytics.projectBreakdown
              .sort((a, b) => b.forecastHrs - a.forecastHrs)
              .map((p) => {
                const isExpanded = expandedProject === p.id;
                return (
                  <div key={p.id} style={{ ...cardStyle, padding: 0, overflow: "hidden", transition: "box-shadow 0.15s ease" }}>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", cursor: "pointer" }}
                      onClick={() => setExpandedProject(isExpanded ? null : p.id)}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: t.brandLight, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: t.brand }}>
                        <Briefcase20Regular />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: t.textPrimary }}>{p.name}</div>
                        <div style={{ fontSize: 12, color: t.textSecondary }}>
                          {p.clientName} &middot; {p.teamSize} members &middot; {p.forecastHrs.toLocaleString()} hrs
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        {p.revenue > 0 && (
                          <span style={{ fontSize: 14, fontWeight: 600, color: t.green }}>${(p.revenue / 1000).toFixed(1)}k</span>
                        )}
                        {isExpanded ? <ChevronDown16Regular style={{ color: t.textTertiary }} /> : <ChevronRight16Regular style={{ color: t.textTertiary }} />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ borderTop: `1px solid ${t.divider}`, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12, background: t.surface }}>
                        <Body1 style={{ color: t.textSecondary, fontSize: 13 }}>{p.description}</Body1>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: t.textSecondary }}>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Building20Regular style={{ fontSize: 14 }} />{p.clientName}</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><People24Regular style={{ fontSize: 14 }} />{p.clientContact}</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Mail20Regular style={{ fontSize: 14 }} />{p.clientEmail}</span>
                        </div>

                        {/* Project stats */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
                          {[
                            { l: "Team Size", v: p.teamSize.toString() },
                            { l: "Forecast Hrs", v: p.forecastHrs.toLocaleString() },
                            { l: "Revenue", v: `$${p.revenue.toLocaleString()}` },
                          ].map(({ l, v }) => (
                            <div key={l} style={{ padding: "10px 12px", borderRadius: 8, background: t.cardBg, border: `1px solid ${t.divider}`, textAlign: "center" }}>
                              <div style={{ fontSize: 16, fontWeight: 700, color: t.textPrimary }}>{v}</div>
                              <div style={{ fontSize: 10, color: t.textTertiary, textTransform: "uppercase" }}>{l}</div>
                            </div>
                          ))}
                        </div>

                        {/* Team members */}
                        {p.assignments.length > 0 && (
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 600, color: t.textPrimary, marginBottom: 6 }}>Team Members</div>
                            <div className={s.tableWrapper} style={{ border: `1px solid ${t.divider}`, background: t.cardBg }}>
                              <Table className={s.table} size="small">
                                <TableHeader style={{ background: t.surface }}><TableRow>
                                  <TableHeaderCell>Consultant</TableHeaderCell><TableHeaderCell>Role</TableHeaderCell><TableHeaderCell>Billable</TableHeaderCell><TableHeaderCell>Rate</TableHeaderCell><TableHeaderCell>Hours</TableHeaderCell>
                                </TableRow></TableHeader>
                                <TableBody>
                                  {p.assignments.map((asn, i) => {
                                    const c = data.consultants.find((x) => x.id === asn.consultantId);
                                    const fh = (asn.forecast ?? []).reduce((x, f) => x + f.hours, 0);
                                    return (
                                      <TableRow key={i}>
                                        <TableCell>
                                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <Avatar src={c?.photoUrl} name={asn.consultantName ?? "?"} size={28} />
                                            <span style={{ fontWeight: 500, color: t.brand }}>{asn.consultantName ?? asn.consultantId}</span>
                                          </div>
                                        </TableCell>
                                        <TableCell><Pill bg={t.purpleBg} color={t.purple}>{asn.role}</Pill></TableCell>
                                        <TableCell><BillablePill billable={asn.billable} t={t} /></TableCell>
                                        <TableCell>${asn.rate}/hr</TableCell>
                                        <TableCell style={{ fontWeight: 600 }}>{fh.toLocaleString()}</TableCell>
                                      </TableRow>
                                    );
                                  })}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </>
      )}

      {/* ─── ASSIGNMENTS TAB ───────────────────────────── */}
      {currentTab === "assignments" && (
        <>
          <div style={{ ...cardStyle, padding: 16 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 16 }}>
              {[
                { l: "Total Assignments", v: allAssignments.length, c: t.brand },
                { l: "Billable", v: analytics.billableAssignments, c: t.green },
                { l: "Non-Billable", v: analytics.nonBillableAssignments, c: t.amber },
                { l: "Avg Rate", v: `$${analytics.avgRate}/hr`, c: t.purple },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
                  <span style={{ fontSize: 13, color: t.textSecondary }}>{l}:</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: t.textPrimary }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={s.tableWrapper} style={{ border: `1px solid ${t.divider}`, background: t.cardBg }}>
            <Table className={s.table} size="small">
              <TableHeader style={{ background: t.surface }}><TableRow>
                <TableHeaderCell>Consultant</TableHeaderCell>
                <TableHeaderCell>Project</TableHeaderCell>
                <TableHeaderCell>Role</TableHeaderCell>
                <TableHeaderCell>Billable</TableHeaderCell>
                <TableHeaderCell>Rate</TableHeaderCell>
                <TableHeaderCell>Forecast Hrs</TableHeaderCell>
                <TableHeaderCell>Delivered Hrs</TableHeaderCell>
              </TableRow></TableHeader>
              <TableBody>
                {allAssignments.map((asn, i) => {
                  const c = data.consultants.find((x) => x.id === asn.consultantId);
                  const fh = (asn.forecast ?? []).reduce((x, f) => x + f.hours, 0);
                  const dh = (asn.delivered ?? []).reduce((x, d) => x + d.hours, 0);
                  return (
                    <TableRow key={i}>
                      <TableCell>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Avatar src={c?.photoUrl} name={asn.consultantName ?? "?"} size={28} />
                          <span style={{ fontWeight: 500, color: t.textPrimary }}>{asn.consultantName ?? asn.consultantId}</span>
                        </div>
                      </TableCell>
                      <TableCell><span style={{ fontWeight: 500, color: t.brand }}>{asn.projectName ?? asn.projectId}</span></TableCell>
                      <TableCell><Pill bg={t.purpleBg} color={t.purple}>{asn.role}</Pill></TableCell>
                      <TableCell><BillablePill billable={asn.billable} t={t} /></TableCell>
                      <TableCell>${asn.rate}/hr</TableCell>
                      <TableCell style={{ fontWeight: 600 }}>{fh.toLocaleString()}</TableCell>
                      <TableCell>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span>{dh.toLocaleString()}</span>
                          {fh > 0 && (
                            <span style={{ fontSize: 11, color: dh >= fh ? t.green : t.amber, fontWeight: 500 }}>
                              ({Math.round((dh / fh) * 100)}%)
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Empty state */}
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
