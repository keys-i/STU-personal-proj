import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '../../../../generated/prisma/client.js';
import type { User as PrismaUser } from '../../../../generated/prisma/client.js';

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  email!: string | null;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiPropertyOptional({ enum: UserRole, nullable: true })
  role!: UserRole | null;

  @ApiProperty()
  createdAt!: string;
}

export function toUserResponseDto(u: PrismaUser): UserResponseDto {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    status: u.status,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  };
}
