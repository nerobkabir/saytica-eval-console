"use client";
import { useEffect, useState } from "react";
import { ChevronRight, CheckCircle2, Clock, Circle, AlertTriangle, BarChart3, Users } from "lucide-react";

type TaskStatus = "pending" | "in_progress" | "done";

interface Task {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  clientId: string;
  assignedTo: string | null;
  status: TaskStatus;
  flags: string[];
}

const STATUS_ORDER: TaskStatus[] = ["pending", "in_progress", "done"];

const STATUS_META: Record<TaskStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: {
    label: "Pending",
    color: "var(--pending)",
    bg: "rgba(148,163,184,0.1)",
    icon: <Circle size={13} />,
  },
  in_progress: {
    label: "In Progress",
    color: "var(--in-progress)",
    bg: "var(--accent-2-dim)",
    icon: <Clock size={13} />,
  },
  done: {
    label: "Done",
    color: "var(--done)",
    bg: "var(--accent-dim)",
    icon: <CheckCircle2 size={13} />,
  },
};

const ME = "u_annotator";

function groupByProject(tasks: Task[]) {
  const map = new Map<string, { projectId: string; projectName: string; tasks: Task[] }>();
  for (const t of tasks) {
    if (!map.has(t.projectId)) {
      map.set(t.projectId, { projectId: t.projectId, projectName: t.projectName, tasks: [] });
    }
    map.get(t.projectId)!.tasks.push(t);
  }
  return Array.from(map.values());
}

function statusCounts(tasks: Task[]) {
  return {
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    done: tasks.filter((t) => t.status === "done").length,
  };
}

export default function TaskBoardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [role, setRole] = useState<"annotator" | "client">("annotator");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((d) => {
        setTasks(d);
        setLoading(false);
      });
  }, []);

  async function advanceStatus(taskId: string, currentStatus: TaskStatus) {
    const idx = STATUS_ORDER.indexOf(currentStatus);
    if (idx >= STATUS_ORDER.length - 1) return;
    const nextStatus = STATUS_ORDER[idx + 1];
    setUpdating(taskId);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        const updated: Task = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      }
    } finally {
      setUpdating(null);
    }
  }

  const myTasks = tasks.filter((t) => t.assignedTo === ME);
  const myProjects = groupByProject(myTasks);

  const allProjects = groupByProject(tasks);

  const totalDone = tasks.filter((t) => t.status === "done").length;
  const totalValid = tasks.filter((t) => t.status !== null).length;
  const overallPct = totalValid > 0 ? Math.round((totalDone / totalValid) * 100) : 0;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>

      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.12em" }}>
            SCREEN 02
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>
              Task Board
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
              {role === "annotator"
                ? "Your assigned annotation tasks — move them forward as you complete them."
                : "Read-only overview of all project progress across all annotators."}
            </p>
          </div>

          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: 4,
              display: "flex",
              gap: 2,
            }}
          >
            <RoleBtn icon={<Users size={14} />} label="Annotator" active={role === "annotator"} onClick={() => setRole("annotator")} />
            <RoleBtn icon={<BarChart3 size={14} />} label="Client" active={role === "client"} onClick={() => setRole("client")} />
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 64, textAlign: "center", color: "var(--text-muted)" }}>
          Loading tasks…
        </div>
      ) : role === "annotator" ? (
        <AnnotatorView
          projects={myProjects}
          onAdvance={advanceStatus}
          updating={updating}
        />
      ) : (
        <ClientView projects={allProjects} overallPct={overallPct} />
      )}
    </div>
  );
}

function RoleBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 16px",
        borderRadius: 7,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? (label === "Annotator" ? "var(--accent)" : "var(--accent-2)") : "var(--text-secondary)",
        background: active
          ? label === "Annotator"
            ? "var(--accent-dim)"
            : "var(--accent-2-dim)"
          : "transparent",
        border: "none",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {icon}
      {label}
    </button>
  );
}

function AnnotatorView({
  projects,
  onAdvance,
  updating,
}: {
  projects: { projectId: string; projectName: string; tasks: Task[] }[];
  onAdvance: (id: string, status: TaskStatus) => void;
  updating: string | null;
}) {
  if (projects.length === 0) {
    return (
      <div
        style={{
          padding: 48,
          textAlign: "center",
          color: "var(--text-muted)",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
        }}
      >
        No tasks assigned to you.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <AnnotatorStats projects={projects} />

      {projects.map((proj) => (
        <div
          key={proj.projectId}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: "16px 20px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "var(--surface-2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  background: "var(--border)",
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
              >
                {proj.projectId.toUpperCase()}
              </span>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{proj.projectName}</span>
            </div>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {proj.tasks.length} task{proj.tasks.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div>
            {proj.tasks.map((task, i) => (
              <TaskRow
                key={task.id}
                task={task}
                onAdvance={onAdvance}
                updating={updating}
                last={i === proj.tasks.length - 1}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function AnnotatorStats({
  projects,
}: {
  projects: { tasks: Task[] }[];
}) {
  const all = projects.flatMap((p) => p.tasks);
  const counts = statusCounts(all);
  const total = all.length;
  const pct = total > 0 ? Math.round((counts.done / total) * 100) : 0;

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12,
      }}
    >
      {[
        { label: "Total Assigned", value: total, color: "var(--text-primary)" },
        { label: "Pending", value: counts.pending, color: "var(--pending)" },
        { label: "In Progress", value: counts.in_progress, color: "var(--in-progress)" },
        { label: "Done", value: counts.done, color: "var(--done)" },
        { label: "Completion", value: `${pct}%`, color: "var(--accent)" },
      ].map((s) => (
        <div
          key={s.label}
          style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            padding: "16px 20px",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6 }}>{s.label}</div>
          <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: s.color }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function TaskRow({
  task,
  onAdvance,
  updating,
  last,
}: {
  task: Task;
  onAdvance: (id: string, status: TaskStatus) => void;
  updating: string | null;
  last: boolean;
}) {
  const meta = STATUS_META[task.status];
  const idx = STATUS_ORDER.indexOf(task.status);
  const canAdvance = idx < STATUS_ORDER.length - 1;
  const isUpdating = updating === task.id;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 20px",
        borderBottom: last ? "none" : "1px solid var(--border)",
        gap: 12,
        transition: "background 0.1s",
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.background = "var(--surface-2)")}
      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.background = "")}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
        <span style={{ color: meta.color, flexShrink: 0 }}>{meta.icon}</span>

        <span
          style={{
            fontSize: 14,
            color: task.status === "done" ? "var(--text-muted)" : "var(--text-primary)",
            textDecoration: task.status === "done" ? "line-through" : "none",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {task.title}
        </span>

        {task.flags.includes("status_unknown") && (
          <span title="Unknown status — treated as pending">
            <AlertTriangle size={13} style={{ color: "var(--warn)", flexShrink: 0 }} />
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: meta.color,
            background: meta.bg,
            border: `1px solid ${meta.color}33`,
            borderRadius: 6,
            padding: "3px 10px",
            whiteSpace: "nowrap",
          }}
        >
          {meta.label}
        </span>

        {/* Advance button */}
        {canAdvance ? (
          <button
            onClick={() => onAdvance(task.id, task.status)}
            disabled={isUpdating}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "5px 12px",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-primary)",
              background: "var(--surface-2)",
              border: "1px solid var(--border-bright)",
              borderRadius: 6,
              cursor: isUpdating ? "wait" : "pointer",
              opacity: isUpdating ? 0.5 : 1,
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border-bright)";
              (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
            }}
          >
            {isUpdating ? "…" : (
              <>
                Move to {STATUS_META[STATUS_ORDER[idx + 1]].label}
                <ChevronRight size={12} />
              </>
            )}
          </button>
        ) : (
          <div style={{ width: 80 }} />
        )}
      </div>
    </div>
  );
}

// Client View 
function ClientView({
  projects,
  overallPct,
}: {
  projects: { projectId: string; projectName: string; tasks: Task[] }[];
  overallPct: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Overall progress */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "24px",
        }}
      >
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>Overall Progress</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            className="mono"
            style={{ fontSize: 48, fontWeight: 700, color: "var(--accent)", lineHeight: 1 }}
          >
            {overallPct}%
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                height: 8,
                background: "var(--border)",
                borderRadius: 4,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${overallPct}%`,
                  height: "100%",
                  background: "var(--accent)",
                  borderRadius: 4,
                  transition: "width 0.6s ease",
                }}
              />
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
              tasks completed across all projects
            </div>
          </div>
        </div>
      </div>

      {/* Per-project breakdown */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
        {projects.map((proj) => {
          const counts = statusCounts(proj.tasks);
          const total = proj.tasks.length;
          const pct = total > 0 ? Math.round((counts.done / total) * 100) : 0;
          const unknownCount = proj.tasks.filter((t) => t.flags.includes("status_unknown")).length;
          const unassignedCount = proj.tasks.filter((t) => t.flags.includes("unassigned")).length;

          return (
            <div
              key={proj.projectId}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: "16px 20px",
                  background: "var(--surface-2)",
                  borderBottom: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{proj.projectName}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {total} tasks total
                  </div>
                </div>
                <div
                  className="mono"
                  style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}
                >
                  {pct}%
                </div>
              </div>

              {/* Progress bar */}
              <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
                <div
                  style={{
                    height: 6,
                    background: "var(--border)",
                    borderRadius: 3,
                    overflow: "hidden",
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: "var(--accent)",
                      borderRadius: 3,
                    }}
                  />
                </div>

                {/* Counts */}
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  {(["pending", "in_progress", "done"] as TaskStatus[]).map((s) => {
                    const m = STATUS_META[s];
                    return (
                      <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ color: m.color }}>{m.icon}</span>
                        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                          {m.label}
                        </span>
                        <span
                          className="mono"
                          style={{ fontSize: 13, fontWeight: 700, color: m.color }}
                        >
                          {counts[s]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Data issues */}
              {(unknownCount > 0 || unassignedCount > 0) && (
                <div style={{ padding: "12px 20px", display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {unknownCount > 0 && (
                    <DataIssue
                      icon={<AlertTriangle size={12} />}
                      label={`${unknownCount} task${unknownCount > 1 ? "s" : ""} with unknown status`}
                    />
                  )}
                  {unassignedCount > 0 && (
                    <DataIssue
                      icon={<AlertTriangle size={12} />}
                      label={`${unassignedCount} task${unassignedCount > 1 ? "s" : ""} unassigned`}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Read-only notice */}
      <div
        style={{
          textAlign: "center",
          fontSize: 12,
          color: "var(--text-muted)",
          padding: "12px",
          border: "1px solid var(--border)",
          borderRadius: 8,
          background: "var(--surface)",
        }}
      >
        🔒 Client view is read-only. Switch to Annotator to update task statuses.
      </div>
    </div>
  );
}

function DataIssue({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        fontSize: 11,
        color: "var(--warn)",
        background: "var(--warn-dim)",
        border: "1px solid rgba(245,158,11,0.2)",
        borderRadius: 4,
        padding: "3px 8px",
      }}
    >
      {icon}
      {label}
    </span>
  );
}
