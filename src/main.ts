import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { ErrorsService } from './common/errors/errors.service';
import { AuthGuard } from './common/middlewares/auth.guard';
import { RolesGuard } from './common/middlewares/role.guard';
import { LoggingInterceptor } from './common/middlewares/logging.interceptor';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Suppress NestJS default logger — Winston handles all logging
    bufferLogs: true,
  });

  // Use Winston as the default NestJS logger
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Global Guards
  app.useGlobalGuards(app.get(AuthGuard), app.get(RolesGuard));

  // Global Prefix
  app.setGlobalPrefix('api/v1');

  // Global Exception Filter (centralized logging of all errors)
  const errorFilter = app.get(ErrorsService);
  app.useGlobalFilters(errorFilter);

  // Global Interceptor (centralized HTTP request/response logging)
  const loggingInterceptor = app.get(LoggingInterceptor);
  app.useGlobalInterceptors(loggingInterceptor);

  // Validation Pipe
  app.useGlobalPipes(new ValidationPipe({ transform: true }));

  // Cookie Parser
  app.use(cookieParser());

  // CORS
  const origins = [
    'http://localhost:3200',
    'http://localhost:3700',
    'http://localhost:3006',
    'http://localhost:3005',
    'https://stag.pacifictravelindo.com',
    'https://pacifictravelindo.com',
    'https://www.pacifictravelindo.com',
    'https://pasifik.my.id',
    'https://stag.pasifik.my.id',
    'https://www.pasifik.my.id',
  ];
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  });

  const port = process.env.PORT || 8002;
  await app.listen(port);
}

bootstrap();
