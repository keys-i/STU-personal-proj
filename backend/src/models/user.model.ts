export type User = {
  id: string;
  name: string;
  email?: string;
  deletedAt?: string | null; // ISO string or null
};
