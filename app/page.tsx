"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Info } from "lucide-react";

interface Model {
  id: string;
  name: string;
  provider: string;
  accuracy: number | null;
  latencyMs: number | null;
  costPer1k: number | null;
  evaluatedAt: string | null;
  flags: string[];
}

type SortKey = "name" | "accuracy" | "latencyMs" | "costPer1k" | "evaluatedAt";
type SortDir = "asc" | "desc";

const FLAG_LABELS: Record<string, string> = {
  accuracy_missing: "Accuracy not evaluated",
  cost_missing: "Cost not disclosed",
  date_missing: "No evaluation date",
  latency_suspect: "Latency data may be unreliable",
  name_trimmed: "Name had extra whitespace",
};

export default function LeaderboardPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("accuracy");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        setModels(data);
        setLoading(false);
      });
  }, []);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
        // For latency and cost: lower is better, default asc
        setSortDir(key === "latencyMs" || key === "costPer1k" ? "asc" : "desc");
      }
    },
    [sortKey]
  );

  const filtered = models
    .filter((m) => {
      const q = search.toLowerCase();
      return m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      // nulls always last
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span
            className="mono"
            style={{
              fontSize: 11,
              color: "var(--accent)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Screen 01
          </span>
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 6 }}>
          Model Leaderboard
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: 15 }}>
          Compare AI models by accuracy, speed, and cost. Data sourced from backend.
        </p>
      </div>

      {/* Search + Stats bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: "0 0 auto", minWidth: 280 }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            type="text"
            placeholder="Search model or provider…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: "9px 12px 9px 34px",
              fontSize: 13,
              color: "var(--text-primary)",
              width: "100%",
              outline: "none",
            }}
          />
        </div>
        <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
          {filtered.length} of {models.length} models
        </span>
      </div>

      {/* Data quality notice */}
      <div
        style={{
          background: "var(--warn-dim)",
          border: "1px solid rgba(245,158,11,0.2)",
          borderRadius: 8,
          padding: "10px 14px",
          marginBottom: 20,
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
          fontSize: 13,
          color: "var(--warn)",
        }}
      >
        <Info size={14} style={{ marginTop: 2, flexShrink: 0 }} />
        <span>
          Some models have incomplete data (missing accuracy, cost, or evaluation date). These are flagged
          with{" "}
          <AlertTriangle
            size={12}
            style={{ display: "inline", verticalAlign: "middle" }}
          />{" "}
          and sorted last per column. Vox-Mini's latency of 9,999 ms may be a sentinel value.
        </span>
      </div>

      {/* Table */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>
            Loading models…
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-bright)" }}>
                <Th label="Model" sortKey="name" current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Provider" sortKey={null} current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Accuracy ↑" sortKey="accuracy" current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Latency ↓" sortKey="latencyMs" current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Cost / 1K ↓" sortKey="costPer1k" current={sortKey} dir={sortDir} onSort={handleSort} />
                <Th label="Evaluated" sortKey="evaluatedAt" current={sortKey} dir={sortDir} onSort={handleSort} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <ModelRow key={m.id} model={m} rank={i + 1} />
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Legend */}
      <div style={{ marginTop: 16, display: "flex", gap: 20, flexWrap: "wrap" }}>
        {[
          { color: "var(--accent)", label: "High accuracy (≥ 0.90)" },
          { color: "var(--accent-2)", label: "Good accuracy (≥ 0.80)" },
          { color: "var(--text-muted)", label: "Lower accuracy" },
        ].map((l) => (
          <div key={l.label} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: l.color, display: "inline-block" }} />
            {l.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function Th({
  label,
  sortKey,
  current,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey | null;
  current: SortKey;
  dir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = sortKey && current === sortKey;
  return (
    <th
      onClick={sortKey ? () => onSort(sortKey) : undefined}
      style={{
        padding: "12px 16px",
        textAlign: "left",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.08em",
        color: active ? "var(--accent)" : "var(--text-muted)",
        cursor: sortKey ? "pointer" : "default",
        userSelect: "none",
        whiteSpace: "nowrap",
        background: "var(--surface-2)",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {label.replace(" ↑", "").replace(" ↓", "")}
        {sortKey && (
          active ? (
            dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
          ) : (
            <ArrowUpDown size={12} style={{ opacity: 0.3 }} />
          )
        )}
      </span>
    </th>
  );
}

function ModelRow({ model: m, rank }: { model: Model; rank: number }) {
  const [showFlags, setShowFlags] = useState(false);
  const hasFlags = m.flags.length > 0;

  const accColor =
    m.accuracy === null
      ? "var(--text-muted)"
      : m.accuracy >= 0.9
      ? "var(--accent)"
      : m.accuracy >= 0.8
      ? "var(--accent-2)"
      : "var(--text-secondary)";

  const latencyBg =
    m.flags.includes("latency_suspect")
      ? "rgba(245,158,11,0.1)"
      : undefined;

  return (
    <>
      <tr
        style={{
          borderBottom: "1px solid var(--border)",
          transition: "background 0.1s",
          cursor: hasFlags ? "pointer" : "default",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLTableRowElement).style.background =
            "var(--surface-2)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLTableRowElement).style.background = "")
        }
        onClick={() => hasFlags && setShowFlags((v) => !v)}
      >
        {/* Model name */}
        <td style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                width: 20,
                textAlign: "right",
              }}
            >
              {rank}
            </span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</span>
            {hasFlags && (
              <AlertTriangle
                size={13}
                style={{ color: "var(--warn)", flexShrink: 0 }}
              />
            )}
          </div>
        </td>

        {/* Provider */}
        <td style={{ padding: "14px 16px" }}>
          <span
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "2px 8px",
            }}
          >
            {m.provider}
          </span>
        </td>

        {/* Accuracy */}
        <td style={{ padding: "14px 16px" }}>
          {m.accuracy !== null ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                className="mono"
                style={{ fontSize: 14, fontWeight: 700, color: accColor }}
              >
                {(m.accuracy * 100).toFixed(1)}%
              </span>
              <div
                style={{
                  width: 48,
                  height: 4,
                  background: "var(--border)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${m.accuracy * 100}%`,
                    height: "100%",
                    background: accColor,
                    borderRadius: 2,
                  }}
                />
              </div>
            </div>
          ) : (
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>n/a</span>
          )}
        </td>

        {/* Latency */}
        <td style={{ padding: "14px 16px", background: latencyBg }}>
          {m.latencyMs !== null ? (
            <span
              className="mono"
              style={{
                fontSize: 13,
                color: m.flags.includes("latency_suspect")
                  ? "var(--warn)"
                  : "var(--text-secondary)",
              }}
            >
              {m.latencyMs >= 9999 ? "~9,999" : m.latencyMs.toLocaleString()} ms
            </span>
          ) : (
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>n/a</span>
          )}
        </td>

        {/* Cost */}
        <td style={{ padding: "14px 16px" }}>
          {m.costPer1k !== null ? (
            <span className="mono" style={{ fontSize: 13, color: "var(--text-secondary)" }}>
              {m.costPer1k === 0 ? "free" : `$${m.costPer1k.toFixed(2)}`}
            </span>
          ) : (
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>undisclosed</span>
          )}
        </td>

        {/* Evaluated At */}
        <td style={{ padding: "14px 16px" }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>
            {m.evaluatedAt ?? "—"}
          </span>
        </td>
      </tr>

      {/* Flags row */}
      {showFlags && hasFlags && (
        <tr>
          <td
            colSpan={6}
            style={{
              padding: "10px 52px",
              background: "var(--warn-dim)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {m.flags.map((f) => (
                <span
                  key={f}
                  style={{
                    fontSize: 12,
                    color: "var(--warn)",
                    background: "rgba(245,158,11,0.1)",
                    border: "1px solid rgba(245,158,11,0.2)",
                    borderRadius: 4,
                    padding: "2px 8px",
                  }}
                >
                  {FLAG_LABELS[f] ?? f}
                </span>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
