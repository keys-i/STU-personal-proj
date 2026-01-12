import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { type INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'http';
import { AppModule } from './../src/app.module.js';

type HealthResponse = {
  code: 200;
  status: 'ok';
  message: string;
  service: string;
  uptimeSeconds: number;
  timestamp: string;
};

function isHealthResponse(value: unknown): value is HealthResponse {
  if (typeof value !== 'object' || value === null) return false;

  const v = value as Record<string, unknown>;
  return (
    v.code === 200 &&
    v.status === 'ok' &&
    typeof v.message === 'string' &&
    typeof v.service === 'string' &&
    typeof v.uptimeSeconds === 'number' &&
    typeof v.timestamp === 'string'
  );
}

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  const httpServer = (): Server => app.getHttpServer() as unknown as Server;

  it('/ (GET) returns root message object', async () => {
    await request(httpServer())
      .get('/')
      .expect(200)
      .expect({ message: 'Root for the API' });
  });

  it('/health (GET) returns structured health response', async () => {
    const res = await request(httpServer()).get('/health').expect(200);

    const body: unknown = res.body;
    expect(isHealthResponse(body)).toBe(true);

    if (!isHealthResponse(body)) return;

    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);
  });
});
