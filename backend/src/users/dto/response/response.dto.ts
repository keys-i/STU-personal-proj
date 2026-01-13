import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ErrorResponseDto {
  @ApiProperty({ example: 'EMAIL_EXISTS' })
  code!: string;

  @ApiProperty({ example: 'Somebody already has that email' })
  message!: string;

  @ApiPropertyOptional({
    example: { email: 'a@b.com' },
    type: Object,
    additionalProperties: true,
  })
  details?: Record<string, unknown>;
}

export class MetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 123 })
  total!: number;

  @ApiProperty({ example: 13 })
  totalPages!: number;

  @ApiProperty({ example: true })
  hasNext!: boolean;

  @ApiProperty({ example: false })
  hasPrev!: boolean;
}

export class PaginatedResponseDto<T> {
  @ApiProperty({ isArray: true })
  data!: T[];

  @ApiProperty({ type: () => MetaDto })
  meta!: MetaDto;
}

export class OkResponseDto<T> {
  @ApiProperty()
  data!: T;
}
