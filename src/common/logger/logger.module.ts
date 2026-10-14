import { Module, Global } from '@nestjs/common';
import { WinstonModule, utilities as nestWinstonModuleUtilities } from 'nest-winston';
import * as winston from 'winston';
import * as path from 'path';
import * as fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Structured JSON format for production.
 * Includes: timestamp (ISO 8601), level, context, traceId, message, and meta.
 */
const jsonFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, context, message, traceId, ...meta }) => {
    const log: Record<string, any> = {
      timestamp,
      level: level.toUpperCase(),
      service: 'TravelAPI',
      context: context || 'Application',
      traceId: traceId || '-',
      message,
    };
    // Include extra metadata (e.g. statusCode, latency, error stack)
    if (Object.keys(meta).length > 0) {
      log.meta = meta;
    }
    return JSON.stringify(log);
  }),
);

/**
 * Human-readable colorized format for development.
 */
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
  winston.format.ms(),
  winston.format.errors({ stack: true }),
  nestWinstonModuleUtilities.format.nestLike('TravelAPI', {
    colors: true,
    prettyPrint: true,
  }),
);

const transports: winston.transport[] = [
  // Console transport — dev uses pretty-print, prod uses JSON
  new winston.transports.Console({
    format: isProduction ? jsonFormat : devFormat,
    level: 'debug',
  }),
  // Rotating daily application log file (all levels)
  new winston.transports.File({
    filename: path.join(logsDir, 'application.log'),
    format: jsonFormat,
    level: 'debug',
    maxsize: 10 * 1024 * 1024, // 10 MB
    maxFiles: 14, // keep 14 files (2 weeks)
    tailable: true,
  }),
  // Dedicated error log file (only error & above)
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    format: jsonFormat,
    level: 'error',
    maxsize: 10 * 1024 * 1024,
    maxFiles: 30, // keep 30 files (1 month of errors)
    tailable: true,
  }),
];

@Global()
@Module({
  imports: [
    WinstonModule.forRoot({
      level: isProduction ? 'info' : 'debug',
      transports,
      // Suppress Winston's unhandled rejection warnings in watch mode
      exitOnError: false,
    }),
  ],
  exports: [WinstonModule],
})
export class LoggerModule {}
