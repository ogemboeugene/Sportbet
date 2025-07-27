import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class MobileOptimizationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = this.detectMobileDevice(userAgent);
    const isLowBandwidth = this.detectLowBandwidth(req);

    // Add mobile detection to request
    (req as any).isMobile = isMobile;
    (req as any).isLowBandwidth = isLowBandwidth;

    // Set response headers for mobile optimization
    if (isMobile) {
      // Cache mobile responses for shorter duration
      res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
      
      // Enable resource hints for mobile
      res.setHeader('Link', [
        '</api/odds>; rel=prefetch',
        '</api/sports>; rel=prefetch',
      ].join(', '));
    }

    // For low bandwidth connections, set aggressive compression
    if (isLowBandwidth) {
      res.setHeader('X-Compress-Hint', 'aggressive');
    }

    next();
  }

  private detectMobileDevice(userAgent: string): boolean {
    const mobileRegex = /Mobile|Android|iP(hone|od|ad)|BlackBerry|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/i;
    return mobileRegex.test(userAgent);
  }

  private detectLowBandwidth(req: Request): boolean {
    // Check for connection type headers (Chrome sends these)
    const effectiveType = req.headers['effective-connection-type'] as string;
    const downlink = req.headers['downlink'] as string;
    
    if (effectiveType && ['slow-2g', '2g', '3g'].includes(effectiveType)) {
      return true;
    }
    
    if (downlink && parseFloat(downlink) < 1.5) {
      return true;
    }

    return false;
  }
}
