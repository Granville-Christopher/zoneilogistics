import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express, Request, Response } from 'express';
import { AppModule } from './app.module';

let cachedServer: Express | undefined;

export async function createApp(): Promise<Express> {
  if (cachedServer) {
    return cachedServer;
  }

  const expressApp = express();
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    { logger: ['error', 'warn', 'log'] },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.enableCors();
  await app.init();

  cachedServer = expressApp;
  return expressApp;
}

async function bootstrap() {
  const server = await createApp();
  const port = process.env.PORT ?? 3000;
  server.listen(port, () => {
    console.log(
      `Zonei International Logistics running on http://localhost:${port}`,
    );
  });
}

// Local / traditional hosting
if (!process.env.VERCEL) {
  void bootstrap();
}

// Vercel serverless handler
export default async function handler(req: Request, res: Response) {
  const server = await createApp();
  return server(req, res);
}
