import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../prisma/prisma.service';
import { type User, Prisma } from '../../generated/prisma/client';
import { UserFilterDto, CreateUserDto, UpdateUserDto } from './dto';
import { Paginated } from 'src/types';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getUser(id: string): Promise<User> {
    const user = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async listUsers(
    page: number,
    limit: number,
    filter?: UserFilterDto,
  ): Promise<Paginated<User>> {
    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

    const safeLimit = Number.isFinite(limit)
      ? Math.min(100, Math.max(1, Math.floor(limit)))
      : 10;

    const skip = (safePage - 1) * safeLimit;

    const where = this.buildWhere(filter);

    const [total, data] = await this.prisma.$transaction([
      this.prisma.user.count({
        where,
      }),
      this.prisma.user.findMany({
        where,
        skip,
        take: safeLimit,
        orderBy: {
          createdAt: 'desc',
        },
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

  async createUser(
    dto: CreateUserDto,
  ): Promise<{ user: User; created: boolean }> {
    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          status: dto.status,
          role: dto.role ?? null,
        },
      });
      return { user, created: true };
    } catch (e: unknown) {
      // unique email constraint violation
      if (
        e instanceof Prisma.PrismaClientKnownRequestError &&
        e.code === 'P2002'
      ) {
        const existing = await this.prisma.user.findUnique({
          where: { email: dto.email },
        });

        if (!existing) throw e;

        if (existing.deletedAt != null) {
          throw new ConflictException(
            'Email already exists (soft-deleted user)',
          );
        }

        return {
          user: existing,
          created: false,
        };
      }

      throw e;
    }
  }

  async updateUser(id: string, dto: UpdateUserDto): Promise<User> {
    const existing = await this.prisma.user.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: {
        id: true,
      },
    });

    if (!existing) throw new NotFoundException(`User ${id} not found`);

    const data: Prisma.UserUpdateInput = {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.email !== undefined ? { email: dto.email } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
      ...(dto.role !== undefined ? { role: dto.role } : {}),
    };

    try {
      return await this.prisma.user.update({
        where: { id },
        data,
      });
    } catch (e: unknown) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002')
          throw new ConflictException('Email already exists');
        if (e.code === 'P2025')
          throw new NotFoundException(`User ${id} not found`);
      }
      throw e;
    }
  }

  async softDeleteUser(id: string): Promise<void> {
    const result = await this.prisma.user.updateMany({
      where: {
        id,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    if (result.count > 0) return;

    const exists = await this.prisma.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!exists) throw new NotFoundException(`User ${id} not found`);
  }
}
