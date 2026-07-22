import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import express, {
  Express,
  NextFunction,
  Request,
  Response,
} from 'express';
import helmet from 'helmet';
import jwt from 'jsonwebtoken';
import { AppModule } from './app.module';

let cachedServer: Express | undefined;

const PUBLIC_ADMIN_PAGES = new Set([
  '/admin/login.html',
  '/admin/signup.html',
]);

function protectAdminPages(req: Request, res: Response, next: NextFunction) {
  const path = req.path;
  if (!path.startsWith('/admin')) {
    return next();
  }

  if (
    PUBLIC_ADMIN_PAGES.has(path) ||
    path.endsWith('.css') ||
    path.endsWith('.js') ||
    path.endsWith('.map') ||
    path.endsWith('.jpg') ||
    path.endsWith('.png') ||
    path.endsWith('.webp') ||
    path.endsWith('.ico')
  ) {
    return next();
  }

  const token = req.cookies?.zonei_admin_token as string | undefined;
  if (!token) {
    return res.redirect(302, '/admin/login.html');
  }

  try {
    jwt.verify(
      token,
      process.env.JWT_SECRET || 'dev-only-insecure-secret-change-me',
    );
    return next();
  } catch {
    res.clearCookie('zonei_admin_token', {
      httpOnly: true,
      sameSite: 'strict',
      path: '/',
    });
    return res.redirect(302, '/admin/login.html');
  }
}

export async function createApp(): Promise<Express> {
  if (cachedServer) {
    return cachedServer;
  }

  const expressApp = express();
  expressApp.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  expressApp.use(cookieParser());
  expressApp.use(protectAdminPages);

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
  app.enableCors({
    origin: true,
    credentials: true,
  });
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
