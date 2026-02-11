import React, { useState, useMemo } from "react";
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
  Divider,
  Subtitle1,
  Subtitle2,
  Body1,
  Caption1,
  Title3,
} from "@fluentui/react-components";
import {
  People20Regular,
  Briefcase20Regular,
  Clock20Regular,
  ArrowRight16Regular,
  ArrowLeft16Regular,
  Mail20Regular,
  Phone20Regular,
  Location20Regular,
  Certificate20Regular,
} from "@fluentui/react-icons";
import { useOpenAiGlobal } from "../hooks/useOpenAiGlobal";
import type { DashboardData, Consultant, Project, Assignment } from "../types";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "16px",
    fontFamily: tokens.fontFamilyBase,
    boxSizing: "border-box",
    width: "100%",
    overflowX: "hidden" as const,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "12px",
  },
  kpiCard: {
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  kpiIcon: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  kpiValue: {
    fontSize: "28px",
    fontWeight: 700,
    lineHeight: "1.1",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 4px",
  },
  tableWrapper: {
    overflowX: "auto" as const,
    width: "100%",
    WebkitOverflowScrolling: "touch" as const,
  },
  table: {
    minWidth: "600px",
    width: "100%",
  },
  photoCell: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    minWidth: 0,
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    objectFit: "cover" as const,
    flexShrink: 0,
  },
  badgeRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "4px",
  },
  noData: {
    padding: "24px",
    textAlign: "center" as const,
    color: tokens.colorNeutralForeground3,
  },
  // ── Profile / Detail view styles ──
  backButton: {
    alignSelf: "flex-start",
  },
  profileHeader: {
    display: "flex",
    gap: "20px",
    alignItems: "flex-start",
    flexWrap: "wrap" as const,
  },
  profilePhoto: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    objectFit: "cover" as const,
    border: `3px solid ${tokens.colorBrandBackground}`,
    flexShrink: 0,
  },
  headerInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    flex: 1,
    minWidth: 0,
  },
  contactRow: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    color: tokens.colorNeutralForeground2,
  },
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
    gap: "12px",
  },
  statCard: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "12px 16px",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  tagRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "6px",
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

  // ── Consultant Profile View ──
  if (viewState.view === "consultant") {
    const consultant = data.consultants.find((c) => c.id === viewState.id);
    if (!consultant) {
      return (
        <div className={styles.root}>
          <Button className={styles.backButton} appearance="subtle" icon={<ArrowLeft16Regular />} onClick={() => setViewState({ view: "dashboard" })}>
            Back to Dashboard
          </Button>
          <Body1>Consultant not found.</Body1>
        </div>
      );
    }
    const myAssignments = allAssignments.filter((a) => a.consultantId === consultant.id);
    const forecastHrs = myAssignments.filter((a) => a.billable).reduce((sum, a) => sum + (a.forecast ?? []).reduce((s, f) => s + f.hours, 0), 0);
    const deliveredHrs = myAssignments.reduce((sum, a) => sum + (a.delivered ?? []).reduce((s, d) => s + d.hours, 0), 0);

    return (
      <div className={styles.root}>
        <Button className={styles.backButton} appearance="subtle" icon={<ArrowLeft16Regular />} onClick={() => setViewState({ view: "dashboard" })}>
          Back to Dashboard
        </Button>

        <Card>
          <div className={styles.profileHeader}>
            <img src={consultant.photoUrl} alt={consultant.name} className={styles.profilePhoto} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <div className={styles.headerInfo}>
              <Title3>{consultant.name}</Title3>
              <div className={styles.contactRow}><Mail20Regular /><Body1>{consultant.email}</Body1></div>
              <div className={styles.contactRow}><Phone20Regular /><Body1>{consultant.phone}</Body1></div>
              {consultant.location && (
                <div className={styles.contactRow}><Location20Regular /><Body1>{consultant.location.city}, {consultant.location.state}, {consultant.location.country}</Body1></div>
              )}
            </div>
          </div>
        </Card>

        <div className={styles.statsRow}>
          <Card className={styles.statCard}><Caption1>Active Projects</Caption1><Title3>{myAssignments.length}</Title3></Card>
          <Card className={styles.statCard}><Caption1>Forecast Hours</Caption1><Title3>{forecastHrs}</Title3></Card>
          <Card className={styles.statCard}><Caption1>Delivered Hours</Caption1><Title3>{deliveredHrs}</Title3></Card>
        </div>

        <Divider />

        {consultant.skills?.length > 0 && (
          <div className={styles.section}>
            <Subtitle2>Skills</Subtitle2>
            <div className={styles.tagRow}>{consultant.skills.map((s) => <Badge key={s} appearance="outline" size="medium" color="informative">{s}</Badge>)}</div>
          </div>
        )}
        {consultant.certifications?.length > 0 && (
          <div className={styles.section}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Certificate20Regular /><Subtitle2>Certifications</Subtitle2></div>
            <div className={styles.tagRow}>{consultant.certifications.map((c) => <Badge key={c} appearance="filled" size="medium" color="success">{c}</Badge>)}</div>
          </div>
        )}
        {consultant.roles?.length > 0 && (
          <div className={styles.section}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Briefcase20Regular /><Subtitle2>Roles</Subtitle2></div>
            <div className={styles.tagRow}>{consultant.roles.map((r) => <Badge key={r} appearance="filled" size="medium" color="brand">{r}</Badge>)}</div>
          </div>
        )}

        {myAssignments.length > 0 && (
          <>
            <Divider />
            <Subtitle1>Assignments</Subtitle1>
            <div className={styles.tableWrapper}>
              <Table className={styles.table} size="small">
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Project</TableHeaderCell>
                    <TableHeaderCell>Role</TableHeaderCell>
                    <TableHeaderCell>Billable</TableHeaderCell>
                    <TableHeaderCell>Rate</TableHeaderCell>
                    <TableHeaderCell>Forecast Hrs</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myAssignments.map((asn, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Button appearance="subtle" size="small" onClick={() => setViewState({ view: "project", id: asn.projectId })}>
                          {asn.projectName ?? `Project ${asn.projectId}`}
                        </Button>
                      </TableCell>
                      <TableCell><Badge appearance="outline" size="small">{asn.role}</Badge></TableCell>
                      <TableCell><Badge appearance="filled" size="small" color={asn.billable ? "success" : "warning"}>{asn.billable ? "Yes" : "No"}</Badge></TableCell>
                      <TableCell><Body1>${asn.rate}/hr</Body1></TableCell>
                      <TableCell><Body1>{(asn.forecast ?? []).reduce((s, f) => s + f.hours, 0)}</Body1></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Project Detail View ──
  if (viewState.view === "project") {
    const project = data.projects.find((p) => p.id === viewState.id);
    if (!project) {
      return (
        <div className={styles.root}>
          <Button className={styles.backButton} appearance="subtle" icon={<ArrowLeft16Regular />} onClick={() => setViewState({ view: "dashboard" })}>
            Back to Dashboard
          </Button>
          <Body1>Project not found.</Body1>
        </div>
      );
    }
    const projAssignments = allAssignments.filter((a) => a.projectId === project.id);
    const totalHrs = projAssignments.reduce((sum, a) => sum + (a.forecast ?? []).reduce((s, f) => s + f.hours, 0), 0);

    return (
      <div className={styles.root}>
        <Button className={styles.backButton} appearance="subtle" icon={<ArrowLeft16Regular />} onClick={() => setViewState({ view: "dashboard" })}>
          Back to Dashboard
        </Button>

        <div>
          <Title3>{project.name}</Title3>
          <Body1 style={{ marginTop: 8 }}>{project.description}</Body1>
        </div>

        <Card>
          <Subtitle2>Client Information</Subtitle2>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 8 }}>
            <Body1><strong>Name:</strong> {project.clientName}</Body1>
            <Body1><strong>Contact:</strong> {project.clientContact}</Body1>
            <Body1><strong>Email:</strong> {project.clientEmail}</Body1>
          </div>
        </Card>

        <div className={styles.statsRow}>
          <Card className={styles.statCard}><Caption1>Team Size</Caption1><Title3>{projAssignments.length}</Title3></Card>
          <Card className={styles.statCard}><Caption1>Total Forecast Hrs</Caption1><Title3>{totalHrs}</Title3></Card>
        </div>

        {projAssignments.length > 0 && (
          <>
            <Divider />
            <Subtitle1>Assigned Consultants</Subtitle1>
            <div className={styles.tableWrapper}>
              <Table className={styles.table} size="small">
                <TableHeader>
                  <TableRow>
                    <TableHeaderCell>Consultant</TableHeaderCell>
                    <TableHeaderCell>Role</TableHeaderCell>
                    <TableHeaderCell>Billable</TableHeaderCell>
                    <TableHeaderCell>Rate</TableHeaderCell>
                    <TableHeaderCell>Forecast Hrs</TableHeaderCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projAssignments.map((asn, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Button appearance="subtle" size="small" onClick={() => setViewState({ view: "consultant", id: asn.consultantId })}>
                          {asn.consultantName ?? `Consultant ${asn.consultantId}`}
                        </Button>
                      </TableCell>
                      <TableCell><Badge appearance="outline" size="small">{asn.role}</Badge></TableCell>
                      <TableCell><Badge appearance="filled" size="small" color={asn.billable ? "success" : "warning"}>{asn.billable ? "Yes" : "No"}</Badge></TableCell>
                      <TableCell><Body1>${asn.rate}/hr</Body1></TableCell>
                      <TableCell><Body1>{(asn.forecast ?? []).reduce((s, f) => s + f.hours, 0)}</Body1></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Main Dashboard View ──
  return (
    <div className={styles.root}>
      <div>
        <Title3>HR Consultant Dashboard</Title3>
        {data.summary?.searchApplied && (
          <Caption1 style={{ marginLeft: 8 }}>
            (filtered by:{" "}
            {data.summary.searchCriteria?.skill && `skill="${data.summary.searchCriteria.skill}"`}
            {data.summary.searchCriteria?.name && ` name="${data.summary.searchCriteria.name}"`})
          </Caption1>
        )}
      </div>

      <div className={styles.kpiGrid}>
        <Card className={styles.kpiCard}>
          <div className={styles.kpiIcon}><People20Regular /><Caption1>Consultants</Caption1></div>
          <Text className={styles.kpiValue}>{data.summary.totalConsultants}</Text>
        </Card>
        <Card className={styles.kpiCard}>
          <div className={styles.kpiIcon}><Briefcase20Regular /><Caption1>Projects</Caption1></div>
          <Text className={styles.kpiValue}>{data.summary.totalProjects}</Text>
        </Card>
        <Card className={styles.kpiCard}>
          <div className={styles.kpiIcon}><Clock20Regular /><Caption1>Billable Hours</Caption1></div>
          <Text className={styles.kpiValue}>{data.summary.totalBillableHours.toLocaleString()}</Text>
        </Card>
        <Card className={styles.kpiCard}>
          <div className={styles.kpiIcon}><Briefcase20Regular /><Caption1>Assignments</Caption1></div>
          <Text className={styles.kpiValue}>{data.summary.totalAssignments}</Text>
        </Card>
      </div>

      {data.consultants.length > 0 && (
        <>
          <Divider />
          <div className={styles.sectionHeader}><Subtitle1>Consultants</Subtitle1></div>
          <div className={styles.tableWrapper}>
            <Table className={styles.table} size="small">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Location</TableHeaderCell>
                  <TableHeaderCell>Skills</TableHeaderCell>
                  <TableHeaderCell>Roles</TableHeaderCell>
                  <TableHeaderCell />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.consultants.map((c: Consultant) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <TableCellLayout>
                        <div className={styles.photoCell}>
                          <img src={c.photoUrl} alt={c.name} className={styles.avatar} onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          <div>
                            <Text weight="semibold">{c.name}</Text><br />
                            <Caption1>{c.email}</Caption1>
                          </div>
                        </div>
                      </TableCellLayout>
                    </TableCell>
                    <TableCell><Caption1>{c.location.city}, {c.location.country}</Caption1></TableCell>
                    <TableCell>
                      <div className={styles.badgeRow}>
                        {c.skills.slice(0, 3).map((s) => <Badge key={s} appearance="outline" size="small">{s}</Badge>)}
                        {c.skills.length > 3 && <Badge appearance="outline" size="small" color="informative">+{c.skills.length - 3}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={styles.badgeRow}>
                        {c.roles.map((r) => <Badge key={r} appearance="filled" size="small" color="brand">{r}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button size="small" appearance="subtle" icon={<ArrowRight16Regular />} onClick={() => setViewState({ view: "consultant", id: c.id })}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {data.projects.length > 0 && (
        <>
          <Divider />
          <div className={styles.sectionHeader}><Subtitle1>Projects</Subtitle1></div>
          <div className={styles.tableWrapper}>
            <Table className={styles.table} size="small">
              <TableHeader>
                <TableRow>
                  <TableHeaderCell>Project</TableHeaderCell>
                  <TableHeaderCell>Client</TableHeaderCell>
                  <TableHeaderCell>Description</TableHeaderCell>
                  <TableHeaderCell />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.projects.map((p: Project) => (
                  <TableRow key={p.id}>
                    <TableCell><Text weight="semibold">{p.name}</Text></TableCell>
                    <TableCell><Body1>{p.clientName}</Body1></TableCell>
                    <TableCell><Caption1>{p.description}</Caption1></TableCell>
                    <TableCell>
                      <Button size="small" appearance="subtle" icon={<ArrowRight16Regular />} onClick={() => setViewState({ view: "project", id: p.id })}>
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {data.consultants.length === 0 && data.projects.length === 0 && (
        <div className={styles.noData}>
          <Body1>No data loaded. Use the MCP tool to hydrate this dashboard with HR data.</Body1>
        </div>
      )}
    </div>
  );
}
