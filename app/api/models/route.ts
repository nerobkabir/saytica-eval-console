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
  // Handle DD/MM/YYYY format
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

    // Detect suspiciously high latency (9999 sentinel value)
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
  return NextResponse.json(models);
}
