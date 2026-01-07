import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';

declare const module: any;

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
  );

  // Swagger config for my project
  const config = new DocumentBuilder()
    .setTitle('API spec')
    .setDescription(
      'This allows me to test how if my API follows the spec to its requirements',
    )
    .setVersion('1.0')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;

  await app.listen({ port, host: '0.0.0.0' });

  console.log(`Application is running on: ${await app.getUrl()}`);

  // Hot reload
  if (module.hot) {
    module.hot.accept();
    module.hot.dispose(() => void app.close());
  }
}

void bootstrap();
