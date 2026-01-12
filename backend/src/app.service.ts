import { Injectable } from '@nestjs/common';

export type HealthStatus = 'ok';

export interface HealthResponse {
  code: 200;
  status: HealthStatus;
  message: string;
  service: string;
  uptimeSeconds: number;
  timestamp: string;
}

@Injectable()
export class AppService {
  getRoot(): string {
    return 'Root for the API';
  }

  getHealth(): HealthResponse {
    return {
      code: 200,
      status: 'ok',
      message: 'API is running',
      service: 'stu-backend',
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }
}
