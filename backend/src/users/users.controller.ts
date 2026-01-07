import type { User } from '../models/user.model.js';
import { UserService } from './users.service.js';
import { Controller, Get, Param, Query } from '@nestjs/common';
import type { ListUsersQueryDto } from './dto/list-users.query.js';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UserService) {}

  @Get()
  getAllUsers(@Query() q: ListUsersQueryDto) {
    const page = q.page ?? 1;
    const lim = q.limit ?? 10;
    return this.users.listUsers(page, lim);
  }

  @Get(':id')
  getUser(@Param('id') id: string): User {
    return this.users.getUser(id);
  }
}
