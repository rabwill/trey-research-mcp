import React, { useState, useCallback, useMemo } from "react";
import {
  Card,
  Text,
  Badge,
  Button,
  Input,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  TableCellLayout,
  Checkbox,
  tokens,
  makeStyles,
  Divider,
  Subtitle1,
  Body1,
  Caption1,
  Title3,
  Tooltip,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
} from "@fluentui/react-components";
import {
  Save20Regular,
  Dismiss16Regular,
  Edit16Regular,
  CheckmarkCircle16Regular,
  ArrowUndo16Regular,
} from "@fluentui/react-icons";
import { useOpenAiGlobal } from "../hooks/useOpenAiGlobal";
import { useWidgetState } from "../hooks/useWidgetState";
import type { BulkEditorData, Consultant } from "../types";

const useStyles = makeStyles({
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "16px",
    fontFamily: tokens.fontFamilyBase,
    maxWidth: "1100px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap" as const,
    gap: "8px",
  },
  toolbar: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  table: {
    width: "100%",
  },
  editableCell: {
    minWidth: "120px",
  },
  tagsInput: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  tagRow: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "4px",
    alignItems: "center",
  },
  tagBadge: {
    cursor: "pointer",
  },
  noData: {
    padding: "24px",
    textAlign: "center" as const,
    color: tokens.colorNeutralForeground3,
  },
  avatar: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    objectFit: "cover" as const,
    marginRight: "8px",
  },
  nameCell: {
    display: "flex",
    alignItems: "center",
  },
});

interface EditedRow extends Consultant {
  _dirty?: boolean;
}

export function BulkEditor() {
  const styles = useStyles();
  const toolOutput = useOpenAiGlobal<BulkEditorData>("toolOutput");
  const data = toolOutput ?? { consultants: [] };

  // Track edits locally
  const [rows, setRows] = useState<EditedRow[]>(() =>
    data.consultants.map((c) => ({ ...c, _dirty: false }))
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newSkillInputs, setNewSkillInputs] = useState<Record<string, string>>({});

  // Sync when toolOutput changes
  useMemo(() => {
    if (data.consultants.length > 0) {
      setRows(data.consultants.map((c) => ({ ...c, _dirty: false })));
    }
  }, [data.consultants]);

  const dirtyCount = rows.filter((r) => r._dirty).length;

  const updateField = useCallback(
    (id: string, field: keyof Consultant, value: unknown) => {
      setRows((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, [field]: value, _dirty: true } : r
        )
      );
    },
    []
  );

  const removeSkill = useCallback((id: string, skill: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, skills: r.skills.filter((s) => s !== skill), _dirty: true }
          : r
      )
    );
  }, []);

  const addSkill = useCallback((id: string) => {
    const skill = (newSkillInputs[id] ?? "").trim();
    if (!skill) return;
    setRows((prev) =>
      prev.map((r) =>
        r.id === id && !r.skills.includes(skill)
          ? { ...r, skills: [...r.skills, skill], _dirty: true }
          : r
      )
    );
    setNewSkillInputs((prev) => ({ ...prev, [id]: "" }));
  }, [newSkillInputs]);

  const removeRole = useCallback((id: string, role: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, roles: r.roles.filter((rl) => rl !== role), _dirty: true }
          : r
      )
    );
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === rows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(rows.map((r) => r.id)));
    }
  };

  const revertAll = () => {
    setRows(data.consultants.map((c) => ({ ...c, _dirty: false })));
    setMessage(null);
  };

  const handleSave = async () => {
    const dirty = rows.filter((r) => r._dirty);
    if (dirty.length === 0) return;

    setSaving(true);
    setMessage(null);

    try {
      const updates = dirty.map((r) => ({
        consultantId: r.id,
        name: r.name,
        email: r.email,
        phone: r.phone,
        skills: r.skills,
        roles: r.roles,
      }));

      await window.openai?.callTool?.("bulk-update-consultants", { updates });

      setRows((prev) => prev.map((r) => ({ ...r, _dirty: false })));
      setMessage({ type: "success", text: `Saved ${dirty.length} record(s) successfully.` });
    } catch (err: any) {
      setMessage({ type: "error", text: `Save failed: ${err?.message ?? "Unknown error"}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.root}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <div>
          <Title3>Consultant Bulk Editor</Title3>
          <Caption1 style={{ marginLeft: 8 }}>{rows.length} records</Caption1>
        </div>
        <div className={styles.toolbar}>
          {dirtyCount > 0 && (
            <Badge appearance="filled" color="important" size="medium">
              {dirtyCount} unsaved
            </Badge>
          )}
          <Button
            appearance="subtle"
            icon={<ArrowUndo16Regular />}
            onClick={revertAll}
            disabled={dirtyCount === 0}
          >
            Revert
          </Button>
          <Button
            appearance="primary"
            icon={<Save20Regular />}
            onClick={handleSave}
            disabled={dirtyCount === 0 || saving}
          >
            {saving ? "Saving…" : "Save All"}
          </Button>
        </div>
      </div>

      {/* ── Message Bar ── */}
      {message && (
        <MessageBar intent={message.type === "success" ? "success" : "error"}>
          <MessageBarBody>
            <MessageBarTitle>{message.type === "success" ? "Success" : "Error"}</MessageBarTitle>
            {message.text}
          </MessageBarBody>
        </MessageBar>
      )}

      {/* ── Table ── */}
      {rows.length > 0 ? (
        <Table className={styles.table} size="small">
          <TableHeader>
            <TableRow>
              <TableHeaderCell style={{ width: 40 }}>
                <Checkbox
                  checked={selected.size === rows.length ? true : selected.size > 0 ? "mixed" : false}
                  onChange={toggleAll}
                />
              </TableHeaderCell>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Email</TableHeaderCell>
              <TableHeaderCell>Phone</TableHeaderCell>
              <TableHeaderCell>Skills</TableHeaderCell>
              <TableHeaderCell>Roles</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.id}
                style={row._dirty ? { backgroundColor: tokens.colorPaletteYellowBackground1 } : undefined}
              >
                <TableCell>
                  <Checkbox
                    checked={selected.has(row.id)}
                    onChange={() => toggleSelect(row.id)}
                  />
                </TableCell>
                <TableCell>
                  <TableCellLayout>
                    <div className={styles.nameCell}>
                      <img
                        src={row.photoUrl}
                        alt=""
                        className={styles.avatar}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                      <Input
                        size="small"
                        value={row.name}
                        onChange={(_, d) => updateField(row.id, "name", d.value)}
                        className={styles.editableCell}
                      />
                    </div>
                  </TableCellLayout>
                </TableCell>
                <TableCell>
                  <Input
                    size="small"
                    value={row.email}
                    onChange={(_, d) => updateField(row.id, "email", d.value)}
                    className={styles.editableCell}
                  />
                </TableCell>
                <TableCell>
                  <Input
                    size="small"
                    value={row.phone}
                    onChange={(_, d) => updateField(row.id, "phone", d.value)}
                    className={styles.editableCell}
                  />
                </TableCell>
                <TableCell>
                  <div className={styles.tagsInput}>
                    <div className={styles.tagRow}>
                      {row.skills.map((s) => (
                        <Tooltip key={s} content={`Remove ${s}`} relationship="label">
                          <Badge
                            appearance="outline"
                            size="small"
                            className={styles.tagBadge}
                            onClick={() => removeSkill(row.id, s)}
                          >
                            {s} ✕
                          </Badge>
                        </Tooltip>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <Input
                        size="small"
                        placeholder="Add skill…"
                        value={newSkillInputs[row.id] ?? ""}
                        onChange={(_, d) =>
                          setNewSkillInputs((prev) => ({ ...prev, [row.id]: d.value }))
                        }
                        onKeyDown={(e) => e.key === "Enter" && addSkill(row.id)}
                        style={{ width: 100 }}
                      />
                      <Button size="small" appearance="subtle" onClick={() => addSkill(row.id)}>
                        +
                      </Button>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className={styles.tagRow}>
                    {row.roles.map((r) => (
                      <Tooltip key={r} content={`Remove ${r}`} relationship="label">
                        <Badge
                          appearance="filled"
                          size="small"
                          color="brand"
                          className={styles.tagBadge}
                          onClick={() => removeRole(row.id, r)}
                        >
                          {r} ✕
                        </Badge>
                      </Tooltip>
                    ))}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className={styles.noData}>
          <Body1>No consultant data loaded. Use the MCP tool to open the bulk editor.</Body1>
        </div>
      )}
    </div>
  );
}
