import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export interface Model {
  id: string;
  name: string;
  provider: string;
  accuracy: number | null;
  latencyMs: number | null;
  costPer1k: number | null;
  evaluatedAt: string | null;
  flags: string[];
}

function parseDate(raw: string | null): string | null {
  if (!raw) return null;
  
  const ddmmyyyy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (ddmmyyyy) {
    return `${ddmmyyyy[3]}-${ddmmyyyy[2]}-${ddmmyyyy[1]}`;
  }
  return raw;
}

function normalizeProvider(p: string): string {
  return p.trim().toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function cleanModels(raw: unknown[]): Model[] {
  return raw.map((r: unknown) => {
    const m = r as Record<string, unknown>;
    const flags: string[] = [];

    const rawName = String(m.name ?? "").trim();
    if (rawName !== String(m.name ?? "")) flags.push("name_trimmed");

    const latencyMs = typeof m.latencyMs === "number" ? m.latencyMs : null;
    if (latencyMs !== null && latencyMs >= 9999) flags.push("latency_suspect");

    if (m.accuracy === null) flags.push("accuracy_missing");
    if (m.costPer1k === null) flags.push("cost_missing");
    if (!m.evaluatedAt) flags.push("date_missing");

    const provider = normalizeProvider(String(m.provider ?? ""));
    const evaluatedAt = parseDate(
      typeof m.evaluatedAt === "string" ? m.evaluatedAt : null
    );

    return {
      id: String(m.id),
      name: rawName,
      provider,
      accuracy: typeof m.accuracy === "number" ? m.accuracy : null,
      latencyMs,
      costPer1k: typeof m.costPer1k === "number" ? m.costPer1k : null,
      evaluatedAt,
      flags,
    };
  });
}

export async function GET() {
  const filePath = path.join(process.cwd(), "data", "models.json");
  const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const models = cleanModels(raw);

  // Tag duplicates
  const dupGroups = detectDuplicates(models);
  const dupIds = new Set(dupGroups.flat());
  for (const m of models) {
    if (dupIds.has(m.id)) m.flags.push("possible_duplicate");
  }

  const insights = buildInsights(models);
  return NextResponse.json({ models, insights });
}

export interface ModelInsights {
  bestAccuracy: Model | null;
  fastestLatency: Model | null;
  cheapest: Model | null;
  missingDataCount: number;
  duplicateGroups: string[][];
}

function detectDuplicates(models: Model[]): string[][] {
  const groups = new Map<string, Model[]>();
  for (const m of models) {
    const key = `${m.provider.toLowerCase()}::${m.accuracy}::${m.evaluatedAt}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }
  return Array.from(groups.values())
    .filter((g) => g.length > 1)
    .map((g) => g.map((m) => m.id));
}

function buildInsights(models: Model[]): ModelInsights {
  const withAccuracy = models.filter((m) => m.accuracy !== null);
  const withLatency = models.filter((m) => m.latencyMs !== null && !m.flags.includes("latency_suspect"));
  const withCost = models.filter((m) => m.costPer1k !== null);

  const bestAccuracy = withAccuracy.length
    ? withAccuracy.reduce((a, b) => (a.accuracy! > b.accuracy! ? a : b))
    : null;
  const fastestLatency = withLatency.length
    ? withLatency.reduce((a, b) => (a.latencyMs! < b.latencyMs! ? a : b))
    : null;
  const cheapest = withCost.length
    ? withCost.reduce((a, b) => (a.costPer1k! <= b.costPer1k! ? a : b))
    : null;

  const missingDataCount = models.filter(
    (m) =>
      m.flags.includes("accuracy_missing") ||
      m.flags.includes("cost_missing") ||
      m.flags.includes("date_missing")
  ).length;

  return { bestAccuracy, fastestLatency, cheapest, missingDataCount, duplicateGroups: detectDuplicates(models) };
}
