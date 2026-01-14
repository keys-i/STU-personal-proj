import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import qs from 'qs';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({
      // IMPORTANT: parse filter[name] into { filter: { name: ... } }
      querystringParser: (str) =>
        qs.parse(str, {
          allowDots: false,
          depth: 10,
          parameterLimit: 1000,
          ignoreQueryPrefix: true,
        }),
    }),
    { logger: ['error', 'warn', 'log', 'debug', 'verbose'] },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('API spec')
    .setDescription(
      'This allows me to test how if my API follows the spec to its requirements',
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000, '0.0.0.0');
}

void bootstrap();
