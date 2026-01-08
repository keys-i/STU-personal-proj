import { UserService } from './users.service.js';
import { Controller, Get, Param, Query } from '@nestjs/common';
import type { ListUsersQueryDto } from './dto/list-users.dto.js';
import type { IdParamDto } from './dto/id-param.to.js';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UserService) {}

  @Get()
  async getAllUsers(@Query() q: ListUsersQueryDto) {
    return this.users.listUsers(q.page, q.limit, q.filter);
  }

  @Get(':id')
  async getUser(@Param() p: IdParamDto) {
    return this.users.getUser(p.id);
  }
}
