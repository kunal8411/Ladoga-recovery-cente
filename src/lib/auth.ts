import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";

export type StaffRole = "admin" | "clinician";

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  imageUrl?: string;
}

function resolveRole(email: string, metadataRole: unknown): StaffRole {
  if (metadataRole === "admin" || metadataRole === "clinician") return metadataRole;
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (admins.length === 0) return "admin";
  return admins.includes(email.toLowerCase()) ? "admin" : "clinician";
}

export async function requireStaff(): Promise<Staff> {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();
  const user = await currentUser();
  if (!user) return redirectToSignIn();
  const email = user.primaryEmailAddress?.emailAddress ?? "";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.username || email || "Staff";
  return {
    id: user.id,
    name,
    email,
    role: resolveRole(email, user.publicMetadata?.role),
    imageUrl: user.imageUrl,
  };
}

export async function requireAdmin(): Promise<Staff> {
  const staff = await requireStaff();
  if (staff.role !== "admin") throw new Error("Only admins can perform this action.");
  return staff;
}
