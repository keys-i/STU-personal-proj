import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min, ValidateNested } from 'class-validator';
import { UserFilterDto } from './user-filter.dto.js';

function toInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    if (Number.isInteger(n)) return n;
  }
  return fallback;
}

export class ListUsersQueryDto {
  @IsOptional()
  @Transform(({ value }) => toInt(value, 1))
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => toInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 10;

  /**
   * Supports query like:
   * /users?filter[name]=john&filter[status]=ACTIVE&filter[fromDate]=2025-01-01T00:00:00.000Z
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => UserFilterDto)
  filter: UserFilterDto;
}
