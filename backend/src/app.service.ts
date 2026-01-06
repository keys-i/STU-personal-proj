import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Root for the API';
  }

  getHealth(): string {
    return JSON.stringify({ code: 200, status: 'API is running' });
  }
}
