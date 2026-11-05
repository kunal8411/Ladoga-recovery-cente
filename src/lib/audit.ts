import type { Staff } from "./auth";
import type { Collections } from "./mongodb";

export async function logAudit(
  cols: Collections,
  actor: Pick<Staff, "id" | "name"> | "system" | "device",
  action: string,
  targetType: string,
  targetId?: string,
  details?: string,
) {
  const who =
    typeof actor === "string" ? { actorId: actor, actorName: actor === "system" ? "System" : "Device" } : { actorId: actor.id, actorName: actor.name };
  await cols.auditLogs.insertOne({ ...who, action, targetType, targetId, details, at: new Date() });
}
