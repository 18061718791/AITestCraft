export interface TokenPayload {
  userId: number;
  username: string;
  roles: string[];
  permissions: string[];
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  nickname: string | null;
  avatar: string | null;
  status: string;
  roles: RoleInfo[];
  permissions: string[];
}

export interface RoleInfo {
  id: number;
  name: string;
  code: string;
}

export interface LoginInput {
  username: string;
  password: string;
}

export interface RegisterInput {
  username: string;
  email?: string;
  password: string;
  nickname?: string;
}

export interface CreateUserInput {
  username: string;
  email?: string;
  password: string;
  nickname?: string;
  status?: string;
  roleIds?: number[];
}

export interface UpdateUserInput {
  username?: string;
  email?: string;
  nickname?: string;
  status?: string;
  avatar?: string | null;
  roleIds?: number[];
}

export interface CreateRoleInput {
  name: string;
  code: string;
  description?: string;
  permissionIds?: number[];
}

export interface UpdateRoleInput {
  name?: string;
  code?: string;
  description?: string;
  status?: string;
  permissionIds?: number[];
}
