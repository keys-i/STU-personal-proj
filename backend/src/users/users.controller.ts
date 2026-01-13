import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiConflictResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { UserService } from './users.service.js';
import {
  CreateUserDto,
  ListUsersQueryDto,
  IdParamDto,
  UpdateUserDto,
  ErrorResponseDto,
  OkResponseDto,
  PaginatedResponseDto,
  UserResponseDto,
  toUserResponseDto,
} from './dto/dto.js';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UserService) {}

  @Get()
  @ApiOperation({
    summary: 'View user list (paginated) with optional filtering',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: 'Positive int. Default: 1',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 10,
    description: '1–100. Default: 10',
  })
  @ApiQuery({
    name: 'filter[name]',
    required: false,
    type: String,
    example: 'jo',
    description: 'Partial match, case-insensitive. Max 100 chars.',
  })
  @ApiQuery({
    name: 'filter[status]',
    required: false,
    enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'],
    example: 'ACTIVE',
    description: 'One of ACTIVE | INACTIVE | SUSPENDED',
  })
  @ApiQuery({
    name: 'filter[fromDate]',
    required: false,
    type: String,
    example: '2025-01-01T00:00:00.000Z',
    description: 'ISO date. Must be <= toDate if provided.',
  })
  @ApiQuery({
    name: 'filter[toDate]',
    required: false,
    type: String,
    example: '2025-01-31T23:59:59.999Z',
    description: 'ISO date. Must be >= fromDate if provided.',
  })
  @ApiOkResponse({
    description:
      'Paginated users. Soft-deleted excluded by default (deletedAt IS NULL).',
    type: PaginatedResponseDto<UserResponseDto>,
  })
  @ApiBadRequestResponse({
    description:
      'Validation error (page/limit invalid, bad ISO dates, fromDate > toDate).',
    type: ErrorResponseDto,
  })
  async getAllUsers(
    @Query() q: ListUsersQueryDto,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    const res = await this.users.listUsers(q.page, q.limit, q.filter);

    return {
      data: res.data.map(toUserResponseDto),
      meta: res.meta,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'View user details' })
  @ApiParam({
    name: 'id',
    description: 'User ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'User found (not soft-deleted).',
    type: OkResponseDto<UserResponseDto>,
  })
  @ApiNotFoundResponse({
    description: 'User not found (missing or soft-deleted).',
    type: ErrorResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error (id must be UUID).',
    type: ErrorResponseDto,
  })
  async getUser(
    @Param() p: IdParamDto,
  ): Promise<OkResponseDto<UserResponseDto>> {
    const u = await this.users.getUser(p.id);
    return { data: toUserResponseDto(u) };
  }

  @Post()
  @ApiOperation({ summary: 'Create user (idempotent by email)' })
  @ApiCreatedResponse({
    description: 'User created (first time)',
    type: OkResponseDto<UserResponseDto>,
  })
  @ApiOkResponse({
    description: 'User already exists (returned existing user)',
    type: OkResponseDto<UserResponseDto>,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email exists but user is soft-deleted',
    type: ErrorResponseDto,
  })
  async createUser(
    @Body() body: CreateUserDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<OkResponseDto<UserResponseDto>> {
    const { user, created } = await this.users.createUser(body);

    // 201 if created, 200 if returned existing
    reply.code(created ? HttpStatus.CREATED : HttpStatus.OK);

    return { data: toUserResponseDto(user) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({
    description: 'User updated',
    type: OkResponseDto<UserResponseDto>,
  })
  @ApiBadRequestResponse({
    description: 'Validation failed or no fields provided',
    type: ErrorResponseDto,
  })
  @ApiNotFoundResponse({
    description: 'User not found (missing or soft-deleted)',
    type: ErrorResponseDto,
  })
  @ApiConflictResponse({
    description: 'Email already exists',
    type: ErrorResponseDto,
  })
  async updateUser(
    @Param() p: IdParamDto,
    @Body() body: UpdateUserDto,
  ): Promise<OkResponseDto<UserResponseDto>> {
    const u = await this.users.updateUser(p.id, body);
    return { data: toUserResponseDto(u) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete user' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'User deleted or already soft-deleted' })
  @ApiNotFoundResponse({
    description: 'User not found',
    type: ErrorResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Validation error (id must be UUID)',
    type: ErrorResponseDto,
  })
  async deleteUser(@Param() p: IdParamDto): Promise<void> {
    await this.users.softDeleteUser(p.id);
  }
}
