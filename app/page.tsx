"use client";
import { useEffect, useState, useCallback } from "react";
import { Search, ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, Info, Trophy, Zap, DollarSign, Database } from "lucide-react";

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

interface ModelInsights {
  bestAccuracy: Model | null;
  fastestLatency: Model | null;
  cheapest: Model | null;
  missingDataCount: number;
  duplicateGroups: string[][];
}

type SortKey = "name" | "accuracy" | "latencyMs" | "costPer1k" | "evaluatedAt";
type SortDir = "asc" | "desc";

const FLAG_LABELS: Record<string, string> = {
  accuracy_missing: "Accuracy not evaluated",
  cost_missing: "Cost not disclosed",
  date_missing: "No evaluation date",
  latency_suspect: "Latency data may be unreliable",
  name_trimmed: "Name had extra whitespace",
  possible_duplicate: "Possible duplicate variant",
};

export default function LeaderboardPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [insights, setInsights] = useState<ModelInsights | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("accuracy");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        setModels(data.models);
        setInsights(data.insights);
        setLoading(false);
      });
  }, []);

  const handleSort = useCallback(
    (key: SortKey) => {
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortKey(key);
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
          <span className="mono" style={{ fontSize: 11, color: "var(--accent)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
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

      {/* ── INSIGHTS BANNER ── */}
      {!loading && insights && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>
            Data Insights
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>

            {/* Best Accuracy */}
            <InsightCard
              icon={<Trophy size={15} />}
              iconColor="var(--accent)"
              iconBg="var(--accent-dim)"
              label="Best Accuracy"
              value={insights.bestAccuracy ? `${(insights.bestAccuracy.accuracy! * 100).toFixed(1)}%` : "N/A"}
              sub={insights.bestAccuracy?.name ?? "—"}
            />

            {/* Fastest (excluding sentinel) */}
            <InsightCard
              icon={<Zap size={15} />}
              iconColor="#facc15"
              iconBg="rgba(250,204,21,0.1)"
              label="Fastest Response"
              value={insights.fastestLatency ? `${insights.fastestLatency.latencyMs} ms` : "N/A"}
              sub={insights.fastestLatency?.name ?? "—"}
            />

            {/* Cheapest */}
            <InsightCard
              icon={<DollarSign size={15} />}
              iconColor="var(--accent-2)"
              iconBg="var(--accent-2-dim)"
              label="Cheapest"
              value={
                insights.cheapest
                  ? insights.cheapest.costPer1k === 0
                    ? "Free"
                    : `$${insights.cheapest.costPer1k!.toFixed(2)} / 1K`
                  : "N/A"
              }
              sub={insights.cheapest?.name ?? "—"}
            />

            {/* Data Quality */}
            <InsightCard
              icon={<Database size={15} />}
              iconColor="var(--warn)"
              iconBg="var(--warn-dim)"
              label="Incomplete Records"
              value={`${insights.missingDataCount} / ${models.length}`}
              sub={`model${insights.missingDataCount !== 1 ? "s" : ""} missing accuracy, cost, or date`}
              warn={insights.missingDataCount > 0}
            />
          </div>

          {/* Duplicate warning */}
          {insights.duplicateGroups.length > 0 && (
            <div style={{
              marginTop: 12,
              background: "rgba(96,165,250,0.06)",
              border: "1px solid rgba(96,165,250,0.2)",
              borderRadius: 8,
              padding: "10px 14px",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
              fontSize: 13,
              color: "var(--accent-2)",
            }}>
              <Info size={14} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>
                <strong>Possible duplicate variants detected:</strong>{" "}
                {insights.duplicateGroups.map((g) => {
                  const names = g.map((id) => models.find((m) => m.id === id)?.name ?? id);
                  return names.join(" & ");
                }).join("; ")}.{" "}
                These share the same provider, accuracy score, and evaluation date — they may be variants of the same model.
              </span>
            </div>
          )}
        </div>
      )}

      {/* Search + Stats */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "0 0 auto", minWidth: 280 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
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
      <div style={{
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
      }}>
        <Info size={14} style={{ marginTop: 2, flexShrink: 0 }} />
        <span>
          Some models have incomplete data. These are flagged with{" "}
          <AlertTriangle size={12} style={{ display: "inline", verticalAlign: "middle" }} />{" "}
          and sorted last per column. Click a flagged row to see details.
        </span>
      </div>

      {/* Table */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 48, textAlign: "center", color: "var(--text-muted)" }}>Loading models…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 64, textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 15, color: "var(--text-secondary)", marginBottom: 6 }}>No models match &ldquo;{search}&rdquo;</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Try a different model name or provider</div>
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
          { color: "var(--accent)", label: "High accuracy (≥ 90%)" },
          { color: "var(--accent-2)", label: "Good accuracy (≥ 80%)" },
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

// ── Insight Card ─────────────────────────────────────────────────
function InsightCard({ icon, iconColor, iconBg, label, value, sub, warn }: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  sub: string;
  warn?: boolean;
}) {
  return (
    <div style={{
      background: "var(--surface)",
      border: `1px solid ${warn ? "rgba(245,158,11,0.25)" : "var(--border)"}`,
      borderRadius: 10,
      padding: "16px 18px",
      display: "flex",
      alignItems: "flex-start",
      gap: 14,
      transition: "border-color 0.15s",
    }}>
      <div style={{
        width: 34,
        height: 34,
        borderRadius: 8,
        background: iconBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: iconColor,
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
        <div className="mono" style={{ fontSize: 20, fontWeight: 700, color: iconColor, lineHeight: 1.2 }}>{value}</div>
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>
      </div>
    </div>
  );
}

// ── Table Header ─────────────────────────────────────────────────
function Th({ label, sortKey, current, dir, onSort }: {
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
        {sortKey && (active ? (dir === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} style={{ opacity: 0.3 }} />)}
      </span>
    </th>
  );
}

// ── Model Row ─────────────────────────────────────────────────────
function ModelRow({ model: m, rank }: { model: Model; rank: number }) {
  const [showFlags, setShowFlags] = useState(false);
  const hasFlags = m.flags.length > 0;
  const isDuplicate = m.flags.includes("possible_duplicate");

  const accColor =
    m.accuracy === null ? "var(--text-muted)"
    : m.accuracy >= 0.9 ? "var(--accent)"
    : m.accuracy >= 0.8 ? "var(--accent-2)"
    : "var(--text-secondary)";

  return (
    <>
      <tr
        style={{ borderBottom: "1px solid var(--border)", transition: "background 0.1s", cursor: hasFlags ? "pointer" : "default" }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "var(--surface-2)")}
        onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "")}
        onClick={() => hasFlags && setShowFlags((v) => !v)}
      >
        {/* Model name */}
        <td style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="mono" style={{ fontSize: 11, color: "var(--text-muted)", width: 20, textAlign: "right" }}>{rank}</span>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</span>
            {isDuplicate && (
              <span style={{
                fontSize: 10,
                color: "var(--accent-2)",
                background: "var(--accent-2-dim)",
                border: "1px solid rgba(96,165,250,0.25)",
                borderRadius: 4,
                padding: "1px 6px",
                fontWeight: 600,
                letterSpacing: "0.04em",
              }}>
                VARIANT
              </span>
            )}
            {hasFlags && !isDuplicate && (
              <AlertTriangle size={13} style={{ color: "var(--warn)", flexShrink: 0 }} />
            )}
            {hasFlags && isDuplicate && (
              <AlertTriangle size={13} style={{ color: "var(--warn)", flexShrink: 0 }} />
            )}
          </div>
        </td>

        {/* Provider */}
        <td style={{ padding: "14px 16px" }}>
          <span style={{
            fontSize: 12,
            color: "var(--text-secondary)",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 4,
            padding: "2px 8px",
          }}>
            {m.provider}
          </span>
        </td>

        {/* Accuracy */}
        <td style={{ padding: "14px 16px" }}>
          {m.accuracy !== null ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="mono" style={{ fontSize: 14, fontWeight: 700, color: accColor }}>
                {(m.accuracy * 100).toFixed(1)}%
              </span>
              <div style={{ width: 48, height: 4, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ width: `${m.accuracy * 100}%`, height: "100%", background: accColor, borderRadius: 2 }} />
              </div>
            </div>
          ) : (
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>n/a</span>
          )}
        </td>

        {/* Latency */}
        <td style={{ padding: "14px 16px" }}>
          {m.latencyMs !== null ? (
            <span className="mono" style={{ fontSize: 13, color: m.flags.includes("latency_suspect") ? "var(--warn)" : "var(--text-secondary)" }}>
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
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{m.evaluatedAt ?? "—"}</span>
        </td>
      </tr>

      {/* Flags expanded row */}
      {showFlags && hasFlags && (
        <tr>
          <td colSpan={6} style={{ padding: "10px 52px", background: "var(--warn-dim)", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {m.flags.map((f) => (
                <span key={f} style={{
                  fontSize: 12,
                  color: f === "possible_duplicate" ? "var(--accent-2)" : "var(--warn)",
                  background: f === "possible_duplicate" ? "var(--accent-2-dim)" : "rgba(245,158,11,0.1)",
                  border: `1px solid ${f === "possible_duplicate" ? "rgba(96,165,250,0.2)" : "rgba(245,158,11,0.2)"}`,
                  borderRadius: 4,
                  padding: "2px 8px",
                }}>
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
