import React, { useMemo } from "react";
import {
  Card,
  CardHeader,
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
  Body1,
  Caption1,
  Title3,
} from "@fluentui/react-components";
import {
  People20Regular,
  Briefcase20Regular,
  Clock20Regular,
  ArrowRight16Regular,
} from "@fluentui/react-icons";
import { useOpenAiGlobal } from "../hooks/useOpenAiGlobal";
import type { DashboardData, Consultant, Project } from "../types";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "16px",
    fontFamily: tokens.fontFamilyBase,
    maxWidth: "900px",
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
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
  table: {
    width: "100%",
  },
  photoCell: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  avatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    objectFit: "cover" as const,
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
});

const fallback: DashboardData = {
  consultants: [],
  projects: [],
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

  const handleViewProfile = (id: string) => {
    window.openai?.callTool?.("show-consultant-profile", { consultantId: id });
  };

  const handleViewProject = (id: string) => {
    window.openai?.callTool?.("show-project-details", { projectId: id });
  };

  return (
    <div className={styles.root}>
      {/* ── Header ── */}
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

      {/* ── KPI Cards ── */}
      <div className={styles.kpiGrid}>
        <Card className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <People20Regular />
            <Caption1>Consultants</Caption1>
          </div>
          <Text className={styles.kpiValue}>{data.summary.totalConsultants}</Text>
        </Card>

        <Card className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <Briefcase20Regular />
            <Caption1>Projects</Caption1>
          </div>
          <Text className={styles.kpiValue}>{data.summary.totalProjects}</Text>
        </Card>

        <Card className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <Clock20Regular />
            <Caption1>Billable Hours</Caption1>
          </div>
          <Text className={styles.kpiValue}>
            {data.summary.totalBillableHours.toLocaleString()}
          </Text>
        </Card>

        <Card className={styles.kpiCard}>
          <div className={styles.kpiIcon}>
            <Briefcase20Regular />
            <Caption1>Assignments</Caption1>
          </div>
          <Text className={styles.kpiValue}>{data.summary.totalAssignments}</Text>
        </Card>
      </div>

      {/* ── Consultants Table ── */}
      {data.consultants.length > 0 && (
        <>
          <Divider />
          <div className={styles.sectionHeader}>
            <Subtitle1>Consultants</Subtitle1>
          </div>
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
                        <img
                          src={c.photoUrl}
                          alt={c.name}
                          className={styles.avatar}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                          }}
                        />
                        <div>
                          <Text weight="semibold">{c.name}</Text>
                          <br />
                          <Caption1>{c.email}</Caption1>
                        </div>
                      </div>
                    </TableCellLayout>
                  </TableCell>
                  <TableCell>
                    <Caption1>
                      {c.location.city}, {c.location.country}
                    </Caption1>
                  </TableCell>
                  <TableCell>
                    <div className={styles.badgeRow}>
                      {c.skills.slice(0, 3).map((s) => (
                        <Badge key={s} appearance="outline" size="small">
                          {s}
                        </Badge>
                      ))}
                      {c.skills.length > 3 && (
                        <Badge appearance="outline" size="small" color="informative">
                          +{c.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={styles.badgeRow}>
                      {c.roles.map((r) => (
                        <Badge key={r} appearance="filled" size="small" color="brand">
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<ArrowRight16Regular />}
                      onClick={() => handleViewProfile(c.id)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {/* ── Projects Table ── */}
      {data.projects.length > 0 && (
        <>
          <Divider />
          <div className={styles.sectionHeader}>
            <Subtitle1>Projects</Subtitle1>
          </div>
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
                  <TableCell>
                    <Text weight="semibold">{p.name}</Text>
                  </TableCell>
                  <TableCell>
                    <Body1>{p.clientName}</Body1>
                  </TableCell>
                  <TableCell>
                    <Caption1>{p.description}</Caption1>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      appearance="subtle"
                      icon={<ArrowRight16Regular />}
                      onClick={() => handleViewProject(p.id)}
                    >
                      Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}

      {/* ── Empty state ── */}
      {data.consultants.length === 0 && data.projects.length === 0 && (
        <div className={styles.noData}>
          <Body1>
            No data loaded. Use the MCP tool to hydrate this dashboard with HR data.
          </Body1>
        </div>
      )}
    </div>
  );
}
