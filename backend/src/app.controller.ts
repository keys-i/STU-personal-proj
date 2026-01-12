import { Controller, Get, HttpStatus } from '@nestjs/common';
import { AppService, type HealthResponse } from './app.service';
import {
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

class RootResponseDto {
  message!: string;
}

@ApiTags('Meta')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiOperation({
    summary: 'API root',
    description: 'Simple root endpoint for quick smoke testing.',
  })
  @ApiOkResponse({
    description: 'Root message returned successfully.',
    type: RootResponseDto,
    schema: { example: { message: 'Root for the API' } },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Unexpected server error.',
    schema: { example: { statusCode: 500, message: 'Internal server error' } },
  })
  getRoot(): RootResponseDto {
    return { message: this.appService.getRoot() };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health check',
    description:
      'Health endpoint for uptime monitors and container probes. Returns status, uptime, and timestamp.',
  })
  @ApiOkResponse({
    description: 'Service is healthy.',
    // Swagger can’t always infer TS interfaces; this schema makes it explicit.
    schema: {
      example: {
        code: 200,
        status: 'ok',
        message: 'API is running',
        service: 'stu-backend',
        uptimeSeconds: 12345,
        timestamp: '2026-01-12T02:25:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'Service is not healthy (if you later add dependency checks).',
    schema: { example: { statusCode: 503, message: 'Service unavailable' } },
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Unexpected server error.',
    schema: { example: { statusCode: 500, message: 'Internal server error' } },
  })
  getHealth(): HealthResponse {
    return this.appService.getHealth();
  }
}
