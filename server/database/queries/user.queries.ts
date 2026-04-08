import { db } from "../../config/firebase-admin.js";
import { findAllTasks } from "./task.queries.js";

export interface User {
  id: string;
  username: string;
  email: string | null;
  auth_id: string | null;
  password?: string | null;
  first_name: string;
  last_name: string;
  role: "admin" | "staff";
  department_id: string | null;
  position: string | null;
  line_user_id?: string | null;
  created_at: string;
  department_name?: string;
}

export interface CreateUserDTO {
  username: string;
  email: string;
  auth_id: string;
  first_name: string;
  last_name: string;
  role?: "admin" | "staff";
  department_id?: string | null;
  position?: string | null;
  line_user_id?: string | null;
}

export interface UpdateUserDTO {
  username?: string;
  first_name?: string;
  last_name?: string;
  role?: "admin" | "staff";
  department_id?: string | null;
  position?: string | null;
  line_user_id?: string | null;
}

export interface UpdateOwnProfileDTO {
  username: string;
  first_name: string;
  last_name: string;
  position?: string | null;
  line_user_id?: string | null;
}

function mapUser(id: string, data: FirebaseFirestore.DocumentData): User {
  return {
    id,
    username: data.username ?? "",
    email: data.email ?? null,
    auth_id: id,
    first_name: data.first_name ?? "",
    last_name: data.last_name ?? "",
    role: data.role ?? "staff",
    department_id: data.department_id ?? null,
    position: data.position ?? null,
    line_user_id: data.line_user_id ?? null,
    created_at: data.created_at ?? new Date().toISOString(),
    department_name: data.department_name ?? undefined,
  };
}

async function enrichWithDepartmentName(users: User[]): Promise<User[]> {
  const deptIds = [...new Set(users.map(u => u.department_id).filter(Boolean))] as string[];
  if (deptIds.length === 0) return users;

  const deptDocs = await Promise.all(deptIds.map(id => db.collection("departments").doc(id).get()));
  const deptMap = new Map<string, string>();
  for (const doc of deptDocs) {
    if (doc.exists) deptMap.set(doc.id, doc.data()?.name ?? "");
  }

  return users.map(u => ({
    ...u,
    department_name: u.department_id ? (deptMap.get(u.department_id) ?? undefined) : undefined,
  }));
}

export async function findAllUsers(): Promise<User[]> {
  const snap = await db.collection("users").orderBy("first_name", "asc").get();
  const users = snap.docs.map(doc => mapUser(doc.id, doc.data()));
  return enrichWithDepartmentName(users);
}

export async function findUserById(id: string): Promise<User | null> {
  const doc = await db.collection("users").doc(id).get();
  if (!doc.exists) return null;
  const [user] = await enrichWithDepartmentName([mapUser(doc.id, doc.data()!)]);
  return user ?? null;
}

export async function findUserByAuthId(authId: string): Promise<User | null> {
  return findUserById(authId);
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const snap = await db.collection("users").where("username", "==", username).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const [user] = await enrichWithDepartmentName([mapUser(doc.id, doc.data())]);
  return user ?? null;
}

export async function findUserByLineUserId(lineUserId: string): Promise<User | null> {
  const snap = await db.collection("users").where("line_user_id", "==", lineUserId).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const [user] = await enrichWithDepartmentName([mapUser(doc.id, doc.data())]);
  return user ?? null;
}

export async function createUser(dto: CreateUserDTO): Promise<string> {
  const uid = dto.auth_id;
  await db.collection("users").doc(uid).set({
    username: dto.username,
    email: dto.email,
    first_name: dto.first_name,
    last_name: dto.last_name,
    role: dto.role ?? "staff",
    department_id: dto.department_id ?? null,
    position: dto.position ?? null,
    line_user_id: dto.line_user_id ?? null,
    created_at: new Date().toISOString(),
  });
  return uid;
}

export async function updateUser(id: string, dto: UpdateUserDTO): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (dto.username !== undefined) payload.username = dto.username;
  if (dto.first_name !== undefined) payload.first_name = dto.first_name;
  if (dto.last_name !== undefined) payload.last_name = dto.last_name;
  if (dto.role !== undefined) payload.role = dto.role;
  if (dto.department_id !== undefined) payload.department_id = dto.department_id ?? null;
  if (dto.position !== undefined) payload.position = dto.position ?? null;
  if (dto.line_user_id !== undefined) payload.line_user_id = dto.line_user_id ?? null;
  await db.collection("users").doc(id).update(payload);
}

export async function updateOwnProfile(id: string, dto: UpdateOwnProfileDTO): Promise<void> {
  await db.collection("users").doc(id).update({
    username: dto.username,
    first_name: dto.first_name,
    last_name: dto.last_name,
    position: dto.position ?? null,
    line_user_id: dto.line_user_id ?? null,
  });
}

export async function deleteUser(id: string): Promise<void> {
  await db.collection("users").doc(id).delete();
}

export async function getUserTasks(userId: string): Promise<Record<string, unknown>[]> {
  const tasks = await findAllTasks({ userId });
  return tasks as unknown as Record<string, unknown>[];
}

export async function updatePassword(): Promise<void> {
  throw new Error("Passwords are managed via Firebase Auth. Use auth.controller.changePassword instead.");
}

export const findByUsername = findUserByUsername;
export const findById = findUserById;
export const findAll = findAllUsers;
export const create = createUser;
export const update = updateUser;
