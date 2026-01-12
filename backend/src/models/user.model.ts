export type User = {
  id: string;
  name: string;
  email?: string | null;
  deletedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};
