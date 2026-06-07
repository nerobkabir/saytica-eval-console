import { NextRequest, NextResponse } from "next/server";
import { getTaskStore, TaskStatus } from "../route";

const STATUS_ORDER: TaskStatus[] = ["pending", "in_progress", "done"];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { status } = body as { status: TaskStatus };

  if (!["pending", "in_progress", "done"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const tasks = getTaskStore();
  const task = tasks.find((t) => t.id === id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  // Only allow moving status forward
  const currentIdx = STATUS_ORDER.indexOf(task.status);
  const newIdx = STATUS_ORDER.indexOf(status);
  if (newIdx <= currentIdx) {
    return NextResponse.json(
      { error: "Can only move status forward" },
      { status: 400 }
    );
  }

  task.status = status;
  return NextResponse.json(task);
}
