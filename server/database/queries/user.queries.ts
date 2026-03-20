import { query } from "../connection.js";

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
}

export interface UpdateUserDTO {
  username?: string;
  first_name?: string;
  last_name?: string;
  role?: "admin" | "staff";
  department_id?: number | null;
  position?: string | null;
}

export interface UpdateOwnProfileDTO {
  username: string;
  first_name: string;
  last_name: string;
  position?: string | null;
}

const USER_SELECT = `
  SELECT
    u.id,
    u.username,
    u.email,
    u.auth_id,
    u.first_name,
    u.last_name,
    u.role,
    u.department_id,
    u.position,
    u.created_at,
    d.name AS department_name
  FROM users u
  LEFT JOIN departments d ON u.department_id = d.id
`;

export async function findUserByUsername(username: string): Promise<User | null> {
  const result = await query<User>(`${USER_SELECT} WHERE u.username = $1`, [username]);
  return result.rows[0] ?? null;
}

export async function findUserById(id: number): Promise<User | null> {
  const result = await query<User>(`${USER_SELECT} WHERE u.id = $1`, [id]);
  return result.rows[0] ?? null;
}

export async function findAllUsers(): Promise<User[]> {
  const result = await query<User>(`${USER_SELECT} ORDER BY u.id`);
  return result.rows;
}

export async function createUser(dto: CreateUserDTO): Promise<number> {
  const result = await query<{ id: number }>(
    `INSERT INTO users (username, email, auth_id, first_name, last_name, role, department_id, position)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
    [
      dto.username,
      dto.email,
      dto.auth_id,
      dto.first_name,
      dto.last_name,
      dto.role ?? "staff",
      dto.department_id ?? null,
      dto.position ?? null,
    ]
  );

  return result.rows[0].id;
}

export async function findUserByAuthId(authId: string): Promise<User | null> {
  const result = await query<User>(`${USER_SELECT} WHERE u.auth_id = $1`, [authId]);
  return result.rows[0] ?? null;
}

export async function updateUser(id: number, dto: UpdateUserDTO): Promise<void> {
  await query(
    `UPDATE users
     SET username = $1,
         first_name = $2,
         last_name = $3,
         role = $4,
         department_id = $5,
         position = $6
     WHERE id = $7`,
    [
      dto.username,
      dto.first_name,
      dto.last_name,
      dto.role,
      dto.department_id ?? null,
      dto.position ?? null,
      id,
    ]
  );
}

export async function updateOwnProfile(id: number, dto: UpdateOwnProfileDTO): Promise<void> {
  await query(
    `UPDATE users
     SET username = $1,
         first_name = $2,
         last_name = $3,
         position = $4
     WHERE id = $5`,
    [
      dto.username,
      dto.first_name,
      dto.last_name,
      dto.position ?? null,
      id,
    ]
  );
}

export async function deleteUser(id: number): Promise<void> {
  await query("DELETE FROM users WHERE id = $1", [id]);
}

export async function getUserTasks(userId: number): Promise<Record<string, unknown>[]> {
  const result = await query<Record<string, unknown>>(
    `SELECT
       t.*,
       creator.first_name || ' ' || creator.last_name AS creator_name,
       tt.name AS task_type_name
     FROM task_assignments ta
     JOIN tasks t ON ta.task_id = t.id
     JOIN users creator ON t.created_by = creator.id
     LEFT JOIN task_types tt ON t.task_type_id = tt.id
     WHERE ta.user_id = $1
     ORDER BY t.created_at DESC`,
    [userId]
  );

  return result.rows;
}

export async function updatePassword(): Promise<void> {
  throw new Error("Passwords are managed via Supabase Auth. Use auth.controller.changePassword instead.");
}

export const findByUsername = findUserByUsername;
export const findById = findUserById;
export const findAll = findAllUsers;
export const create = createUser;
export const update = updateUser;
