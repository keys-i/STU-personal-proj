export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type UserRole = "USER" | "ADMIN" | "MODERATOR";

export type User = {
  id: string;
  name: string;
  email: string;
  status: UserStatus;
  role: UserRole | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  deletedAt: string | null; // ISO | null
};

export type Paginated<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
};

export type CreateUserInput = {
  name: string;
  email: string;
  status: UserStatus;
  role?: UserRole | null;
};

export type UpdateUserInput = Partial<CreateUserInput>;
