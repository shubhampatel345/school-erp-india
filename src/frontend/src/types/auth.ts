export type Role =
  | "super_admin"
  | "admin"
  | "accountant"
  | "librarian"
  | "teacher"
  | "parent"
  | "student"
  | "driver";

export interface Permission {
  view: boolean;
  add: boolean;
  edit: boolean;
  delete: boolean;
}

export type ModulePermissions = Record<string, Permission>;
export type RolePermissions = Record<string, ModulePermissions>;

export interface User {
  id: string;
  name: string;
  role: Role;
  userId: string;
}
