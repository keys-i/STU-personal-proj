import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../models/user.model.js';
import usersSeed from '../models/user.seed.json' with { type: 'json' };

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

@Injectable()
export class UserService {
  private readonly byId = new Map<string, User>(
    (usersSeed as User[]).map((u) => [u.id, u] as const),
  );
  private readonly users: User[] = usersSeed as User[];

  getUser(id: string): User {
    const user = this.byId.get(id);
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  listUsers(page: number, limit: number): Paginated<User> {
    const active = this.users.filter((u) => u.deletedAt == null);

    const total = active.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const safePage = Math.min(page, totalPages);

    const start = (safePage - 1) * limit;
    const data = active.slice(start, start + limit);

    return {
      data,
      meta: {
        page: safePage,
        limit,
        total,
        totalPages,
        hasNext: safePage < totalPages,
        hasPrev: safePage > 1,
      },
    };
  }
}
