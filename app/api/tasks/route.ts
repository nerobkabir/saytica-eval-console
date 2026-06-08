import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";

export type TaskStatus = "pending" | "in_progress" | "done";

export interface Task {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  clientId: string;
  assignedTo: string | null;
  status: TaskStatus;
  flags: string[];
}

const VALID_STATUSES: TaskStatus[] = ["pending", "in_progress", "done"];

function cleanTasks(raw: unknown[]): Task[] {
  return raw.map((r: unknown) => {
    const t = r as Record<string, unknown>;
    const flags: string[] = [];

    const rawStatus = String(t.status ?? "").trim();
    let status: TaskStatus = "pending";
    if (VALID_STATUSES.includes(rawStatus as TaskStatus)) {
      status = rawStatus as TaskStatus;
    } else {
      flags.push("status_unknown");
    }

    const assignedTo =
      t.assignedTo && typeof t.assignedTo === "string"
        ? t.assignedTo.trim()
        : null;
    if (!assignedTo) flags.push("unassigned");

    return {
      id: String(t.id),
      title: String(t.title ?? "Untitled").trim(),
      projectId: String(t.projectId ?? ""),
      projectName: String(t.projectName ?? "Unknown Project").trim(),
      clientId: String(t.clientId ?? ""),
      assignedTo,
      status,
      flags,
    };
  });
}


let taskStore: Task[] | null = null;

export function getTaskStore(): Task[] {
  if (!taskStore) {
    const filePath = path.join(process.cwd(), "data", "tasks.json");
    const raw = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    taskStore = cleanTasks(raw);
  }
  return taskStore;
}

export async function GET() {
  const tasks = getTaskStore();
  return NextResponse.json(tasks);
}
