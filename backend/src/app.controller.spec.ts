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
      providers: [AppService], // real service so app.service.ts gets covered too
    }).compile();

    controller = moduleRef.get(AppController);
  });

  it('getHello returns "Root for the API"', () => {
    expect(controller.getHello()).toBe('Root for the API');
  });

  it('getHealth returns JSON string with code/status', () => {
    const res = controller.getHealth();
    expect(JSON.parse(res)).toEqual({ code: 200, status: 'API is running' });
  });
});
