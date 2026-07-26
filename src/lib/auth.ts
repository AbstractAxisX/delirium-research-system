import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "delirium-research-secret-key-change-me";
const COOKIE_NAME = "dr_session";

export type SessionUser = {
  id: string;
  username: string;
  fullName: string;
  role: "ADMIN" | "DOCTOR";
  pagePermissions?: string[]; // for doctors
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export function signToken(user: SessionUser): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): SessionUser | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionUser;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  // Refresh permissions from DB to reflect admin changes immediately
  try {
    const u = await db.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, fullName: true, role: true, pagePermissions: true, active: true },
    });
    if (!u || !u.active) return null;
    // Defensive: handle missing pagePermissions column gracefully
    const perms = u.pagePermissions || "";
    return {
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      role: u.role as "ADMIN" | "DOCTOR",
      pagePermissions: u.role === "ADMIN" ? undefined : perms.split(",").filter(Boolean),
    };
  } catch {
    // If DB query fails (e.g., missing column), fall back to JWT data
    return decoded;
  }
}

export async function setSessionCookie(user: SessionUser) {
  const cookieStore = await cookies();
  // Store minimal info in JWT; permissions are fetched from DB in getSession
  cookieStore.set(COOKIE_NAME, signToken({
    id: user.id, username: user.username, fullName: user.fullName, role: user.role,
  }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/** Check if user can access a given page view. Admins always can. */
export function canAccessPage(user: SessionUser | null, view: string): boolean {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  if (!user.pagePermissions || user.pagePermissions.length === 0) return false;
  return user.pagePermissions.includes(view);
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function requireUser(): Promise<SessionUser> {
  const s = await getSession();
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}

export async function requireAdmin(): Promise<SessionUser> {
  const s = await requireUser();
  if (s.role !== "ADMIN") throw new Error("FORBIDDEN");
  return s;
}

/**
 * Determine drug type from national ID (کد ملی) last digit.
 * Per protocol: odd -> OLANZAPINE, even -> HALOPERIDOL.
 */
export function assignDrugFromNationalId(nationalId: string): {
  drugType: "OLANZAPINE" | "HALOPERIDOL";
} {
  // Strip non-digits, take last char
  const digits = (nationalId || "").replace(/\D/g, "");
  if (digits.length === 0) return { drugType: "HALOPERIDOL" };
  const lastDigit = parseInt(digits[digits.length - 1], 10);
  return {
    drugType: lastDigit % 2 === 1 ? "OLANZAPINE" : "HALOPERIDOL",
  };
}

/**
 * Generate the next patient code: D001, D002, ...
 */
export async function generateNextPatientCode(): Promise<string> {
  const count = await db.patient.count();
  const next = count + 1;
  return `D${String(next).padStart(3, "0")}`;
}
