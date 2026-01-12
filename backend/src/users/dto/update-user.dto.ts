import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, Length } from 'class-validator';
import { UserRole, UserStatus } from '../../../generated/prisma/client.js';

import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from 'class-validator';

function AtLeastOne(fields: readonly string[], opts: ValidationOptions) {
  return (obj: object, propertyName: string) => {
    registerDecorator({
      name: 'atleastOne',
      target: obj.constructor,
      propertyName,
      options: opts,
      constraints: [fields],
      validator: {
        validate(_: unknown, args: ValidationArguments) {
          const [keys] = args.constraints as [readonly string[]];
          const o = args.object as Record<string, unknown>;
          return keys.some((k) => o[k] !== undefined);
        },
      },
    });
  };
}

export class UpdateUserDto {
  @AtLeastOne(['name', 'email', 'status', 'role'], {
    message: 'At least one field must be provided',
  })
  _atLeastOne!: true;

  @ApiPropertyOptional({ minLength: 2, maxLength: 100, example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  @Length(2, 100)
  name?: string;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ enum: UserStatus, example: UserStatus.ACTIVE })
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @ApiPropertyOptional({ enum: UserRole, example: UserRole.USER })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
