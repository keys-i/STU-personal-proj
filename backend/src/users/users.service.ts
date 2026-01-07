import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '../models/user.model.js';
import usersSeed from '../models/user.seed.json' with { type: 'json' };
import { PrismaService } from 'prisma/prisma.service.js';

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
  constructor(private readonly prisma: PrismaService) {}

  private readonly byId = new Map<string, User>(
    (usersSeed as User[]).map((u) => [u.id, u] as const),
  );
  private readonly users: User[] = usersSeed as User[];

  async getUser(id: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null }, // exclude soft-deleted
    });

    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async listUsers(page: number, limit: number): Promise<Paginated<User>> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const where = { deletedAt: null as null };

    const [total, data] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    return {
      data,
      meta: {
        page: Math.min(safePage, totalPages),
        limit: safeLimit,
        total,
        totalPages,
        hasNext: safePage < totalPages,
        hasPrev: safePage > 1,
      },
    };
  }
}
