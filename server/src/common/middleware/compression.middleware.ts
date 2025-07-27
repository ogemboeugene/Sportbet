import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as compression from 'compression';

@Injectable()
export class CompressionMiddleware implements NestMiddleware {
  private compressionMiddleware = compression({
    // Only compress responses that are larger than 1kb
    threshold: 1024,
    // Compression level (1-9, 6 is default)
    level: 6,
    // Only compress these content types
    filter: (req: Request, res: Response) => {
      // Don't compress if client doesn't support it
      if (!req.headers['accept-encoding']) {
        return false;
      }

      // Don't compress already compressed responses
      if (res.headersSent) {
        return false;
      }

      // Compress JSON, HTML, CSS, JS responses
      const contentType = res.getHeader('content-type') as string;
      if (!contentType) return false;

      return (
        contentType.includes('application/json') ||
        contentType.includes('text/html') ||
        contentType.includes('text/css') ||
        contentType.includes('application/javascript') ||
        contentType.includes('text/plain')
      );
    },
  });

  use(req: Request, res: Response, next: NextFunction) {
    this.compressionMiddleware(req, res, next);
  }
}
