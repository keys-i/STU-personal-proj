import 'reflect-metadata';
import { describe, it, expect, beforeEach } from '@jest/globals';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let controller: AppController;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    controller = moduleRef.get(AppController);
  });

  it('GET / returns RootResponseDto with message "Root for the API"', () => {
    expect(controller.getRoot()).toEqual({ message: 'Root for the API' });
  });

  it('GET /health returns a structured health object', () => {
    const res = controller.getHealth();

    expect(res).toMatchObject({
      code: 200,
      status: 'ok',
      message: 'API is running',
      service: 'stu-backend',
    });

    expect(typeof res.uptimeSeconds).toBe('number');
    expect(res.uptimeSeconds).toBeGreaterThanOrEqual(0);

    // timestamp should be a valid ISO date string
    expect(typeof res.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(res.timestamp))).toBe(false);
  });
});
