import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiResponse } from '@nestjs/swagger';
import { Query } from '@nestjs/graphql';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiResponse({
    status: 200,
    description: 'The API root is supposed to show hello world in demo',
  })
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiResponse({
    status: 200,
    description: 'The API is healthy and working',
  })
  getHealth(): string {
    return this.appService.getHealth();
  }
}
