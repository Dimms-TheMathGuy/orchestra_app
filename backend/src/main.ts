import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
  });

  app.enableCors({
    origin: ["http://localhost:3001", "http://localhost:3000"],
    credentials: true
  });

   app.use(
    session({
      secret: 'orchestra-passkey-secret',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
      },
    }),
  );

  await app.listen(3000);
}

bootstrap();
