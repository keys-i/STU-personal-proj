import { Module } from '@nestjs/common';
// import { PrismaModule } from '/path/to/prisma.module';
import { UsersController } from './users.controller.js';
import { UserService } from './users.service.js';

@Module({
  // imports: [PrismaModule]
  controllers: [UsersController],
  providers: [UserService],
})
export class UsersModule {}
