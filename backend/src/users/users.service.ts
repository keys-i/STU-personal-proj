import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { User, Prisma } from '../../generated/prisma/client.js';
import { UserFilterDto } from './dto/user-filter.dto.js';

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

  async getUser(id: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });

    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async listUsers(
    page: number,
    limit: number,
    filter: UserFilterDto,
  ): Promise<Paginated<User>> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(100, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const where = this.buildWhere(filter);

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
    const pageClamped = Math.min(safePage, totalPages);

    return {
      data,
      meta: {
        page: pageClamped,
        limit: safeLimit,
        total,
        totalPages,
        hasNext: pageClamped < totalPages,
        hasPrev: pageClamped > 1,
      },
    };
  }

  private buildWhere(filter?: UserFilterDto): Prisma.UserWhereInput {
    // soft-delete exclude
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
    };

    if (!filter) return where;

    if (filter.name) {
      where.name = {
        contains: filter.name,
        mode: 'insensitive',
      };
    }

    if (filter.status) {
      where.status = filter.status;
    }

    this.applyCreatedAtRange(where, filter.fromDate, filter.toDate);

    return where;
  }

  private applyCreatedAtRange(
    where: Prisma.UserWhereInput,
    fromDate?: string,
    toDate?: string,
  ): void {
    if (!fromDate && !toDate) return;

    const from = fromDate
      ? this.parseDate('filter.fromDate', fromDate)
      : undefined;
    const to = toDate ? this.parseDate('filter.toDate', toDate) : undefined;

    if (from && to && from > to) {
      throw new BadRequestException('filter.fromDate must be <= filter.toDate');
    }

    where.createdAt = {
      ...(from ? { gte: from } : {}),
      ...(to ? { lte: to } : {}),
    };
  }

  private parseDate(field: string, value: string): Date {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException(`${field} must be an ISO Date`);
    }

    return d;
  }
}
