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
  })
  @ApiBadRequestResponse({
    description:
      'Validation error (page/limit invalid, bad ISO dates, fromDate > toDate).',
  })
  async getAllUsers(@Query() q: ListUsersQueryDto) {
    return await this.users.listUsers(q.page, q.limit, q.filter);
  }

  @Get(':id')
  @ApiOperation({ summary: 'View user details' })
  @ApiParam({
    name: 'id',
    description: 'User ID (UUID)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({ description: 'User found (not soft-deleted).' })
  @ApiNotFoundResponse({
    description: 'User not found (missing or soft-deleted).',
  })
  @ApiBadRequestResponse({ description: 'Validation error (id must be UUID).' })
  async getUser(@Param() p: IdParamDto) {
    return await this.users.getUser(p.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create user (idempotent by email)' })
  @ApiCreatedResponse({ description: 'User created (first time)' })
  @ApiOkResponse({
    description: 'User already exists (returned existing user)',
  })
  @ApiBadRequestResponse({ description: 'Validation failed' })
  @ApiConflictResponse({ description: 'Email exists but user is soft-deleted' })
  async createUser(
    @Body() body: CreateUserDto,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const { user, created } = await this.users.createUser(body);

    // 201 if created, 200 if returned existing
    reply.code(created ? HttpStatus.CREATED : HttpStatus.OK);
    return user;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({
    name: 'id',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiOkResponse({ description: 'User updated' })
  @ApiBadRequestResponse({
    description: 'Validation failed or no fields provided',
  })
  @ApiNotFoundResponse({
    description: 'User not found (missing or soft-deleted)',
  })
  @ApiConflictResponse({ description: 'Email already exists' })
  async updateUser(@Param() p: IdParamDto, @Body() body: UpdateUserDto) {
    return await this.users.updateUser(p.id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete user' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({ description: 'User deleted or already soft-deleted' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiBadRequestResponse({ description: 'Validation error (id must be UUID)' })
  async deleteUser(@Param() p: IdParamDto) {
    await this.users.softDeleteUser(p.id);
  }
}
