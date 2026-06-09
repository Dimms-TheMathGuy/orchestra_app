import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  // Allowed CORS origins: prod frontend (env) plus local dev defaults.
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3001',
    'http://localhost:3000',
  ].filter(Boolean) as string[];

  app.enableCors({
    origin: allowedOrigins,
    credentials: true
  });

  const isProd = process.env.NODE_ENV === 'production';

   app.use(
    session({
      secret: process.env.SESSION_SECRET ?? 'orchestra-passkey-secret',
      resave: false,
      saveUninitialized: true,
      cookie: {
        secure: isProd,
      },
    }),
  );

  await app.listen(process.env.PORT ? Number(process.env.PORT) : 3000);
}

bootstrap();
