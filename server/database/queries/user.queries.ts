import { supabaseAdmin } from "../../config/supabase.js";
import { findAllTasks } from "./task.queries.js";

export interface User {
  id: number;
  username: string;
  email: string | null;
  auth_id: string | null;
  password?: string | null;
  first_name: string;
  last_name: string;
  role: "admin" | "staff";
  department_id: number | null;
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
  department_id?: number | null;
  position?: string | null;
  line_user_id?: string | null;
}

export interface UpdateUserDTO {
  username?: string;
  first_name?: string;
  last_name?: string;
  role?: "admin" | "staff";
  department_id?: number | null;
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

interface UserRow {
  id: number;
  username: string;
  email: string | null;
  auth_id: string | null;
  first_name: string | null;
  last_name: string | null;
  role: "admin" | "staff";
  department_id: number | null;
  position: string | null;
  line_user_id: string | null;
  created_at: string;
  departments?:
    | { name: string | null }
    | Array<{ name: string | null }>
    | null;
}

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapUser(row: UserRow): User {
  const department = pickOne(row.departments);

  return {
    id: row.id,
    username: row.username,
    email: row.email,
    auth_id: row.auth_id,
    first_name: row.first_name ?? "",
    last_name: row.last_name ?? "",
    role: row.role,
    department_id: row.department_id,
    position: row.position,
    line_user_id: row.line_user_id,
    created_at: row.created_at,
    department_name: department?.name ?? undefined,
  };
}

async function fetchUsersBase() {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select(`
      id,
      username,
      email,
      auth_id,
      first_name,
      last_name,
      role,
      department_id,
      position,
      line_user_id,
      created_at,
      departments:departments!users_department_id_fkey(name)
    `)
    .order("id", { ascending: true });

  if (error) throw error;
  return (data ?? []) as unknown as UserRow[];
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select(`
      id,
      username,
      email,
      auth_id,
      first_name,
      last_name,
      role,
      department_id,
      position,
      line_user_id,
      created_at,
      departments:departments!users_department_id_fkey(name)
    `)
    .eq("username", username)
    .maybeSingle();

  if (error) throw error;
  return data ? mapUser(data as unknown as UserRow) : null;
}

export async function findUserById(id: number): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select(`
      id,
      username,
      email,
      auth_id,
      first_name,
      last_name,
      role,
      department_id,
      position,
      line_user_id,
      created_at,
      departments:departments!users_department_id_fkey(name)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? mapUser(data as unknown as UserRow) : null;
}

export async function findAllUsers(): Promise<User[]> {
  const rows = await fetchUsersBase();
  return rows.map(mapUser);
}

export async function createUser(dto: CreateUserDTO): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .insert({
      username: dto.username,
      email: dto.email,
      auth_id: dto.auth_id,
      first_name: dto.first_name,
      last_name: dto.last_name,
      role: dto.role ?? "staff",
      department_id: dto.department_id ?? null,
      position: dto.position ?? null,
      line_user_id: dto.line_user_id ?? null,
    })
    .select("id")
    .single();

  if (error || !data) throw error ?? new Error("Failed to create user");
  return data.id;
}

export async function findUserByAuthId(authId: string): Promise<User | null> {
  const { data, error } = await supabaseAdmin
    .from("users")
    .select(`
      id,
      username,
      email,
      auth_id,
      first_name,
      last_name,
      role,
      department_id,
      position,
      line_user_id,
      created_at,
      departments:departments!users_department_id_fkey(name)
    `)
    .eq("auth_id", authId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapUser(data as unknown as UserRow) : null;
}

export async function updateUser(id: number, dto: UpdateUserDTO): Promise<void> {
  const payload: Record<string, unknown> = {};

  if (dto.username !== undefined) payload.username = dto.username;
  if (dto.first_name !== undefined) payload.first_name = dto.first_name;
  if (dto.last_name !== undefined) payload.last_name = dto.last_name;
  if (dto.role !== undefined) payload.role = dto.role;
  if (dto.department_id !== undefined) payload.department_id = dto.department_id ?? null;
  if (dto.position !== undefined) payload.position = dto.position ?? null;
  if (dto.line_user_id !== undefined) payload.line_user_id = dto.line_user_id ?? null;

  const { error } = await supabaseAdmin
    .from("users")
    .update(payload)
    .eq("id", id);

  if (error) throw error;
}

export async function updateOwnProfile(id: number, dto: UpdateOwnProfileDTO): Promise<void> {
  const { error } = await supabaseAdmin
    .from("users")
    .update({
      username: dto.username,
      first_name: dto.first_name,
      last_name: dto.last_name,
      position: dto.position ?? null,
      line_user_id: dto.line_user_id ?? null,
    })
    .eq("id", id);

  if (error) throw error;
}

export async function deleteUser(id: number): Promise<void> {
  const { error } = await supabaseAdmin
    .from("users")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function getUserTasks(userId: number): Promise<Record<string, unknown>[]> {
  const tasks = await findAllTasks({ userId });
  return tasks as unknown as Record<string, unknown>[];
}

export async function updatePassword(): Promise<void> {
  throw new Error("Passwords are managed via Supabase Auth. Use auth.controller.changePassword instead.");
}

export const findByUsername = findUserByUsername;
export const findById = findUserById;
export const findAll = findAllUsers;
export const create = createUser;
export const update = updateUser;
