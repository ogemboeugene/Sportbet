import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly redis: Redis | null;
  private readonly inMemoryCache = new Map<string, { value: any; expires?: number }>();

  constructor(private configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redis.on('connect', () => {
        this.logger.log('Connected to Redis');
      });

      this.redis.on('error', (error) => {
        this.logger.warn(`Redis connection error: ${error.message}. Falling back to in-memory cache.`);
      });

      this.redis.on('close', () => {
        this.logger.warn('Redis connection closed. Using in-memory cache.');
      });
    } else {
      this.redis = null;
      this.logger.warn('Redis URL not configured. Using in-memory cache only.');
    }

    // Clean up expired in-memory cache items every 5 minutes
    setInterval(() => {
      this.cleanupExpiredItems();
    }, 5 * 60 * 1000);
  }

  private cleanupExpiredItems(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [key, cacheItem] of this.inMemoryCache.entries()) {
      if (cacheItem.expires && now > cacheItem.expires) {
        this.inMemoryCache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired cache items`);
    }
  }

  private isExpired(cacheItem: { value: any; expires?: number }): boolean {
    return cacheItem.expires !== undefined && Date.now() > cacheItem.expires;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      // Try Redis first
      if (this.redis) {
        const value = await this.redis.get(key);
        if (value) {
          return JSON.parse(value);
        }
      }
      
      // Fallback to in-memory cache
      const cacheItem = this.inMemoryCache.get(key);
      if (cacheItem) {
        if (this.isExpired(cacheItem)) {
          this.inMemoryCache.delete(key);
          return null;
        }
        return cacheItem.value;
      }
      
      return null;
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      
      // Try Redis first
      if (this.redis) {
        if (ttlSeconds) {
          await this.redis.setex(key, ttlSeconds, serializedValue);
        } else {
          await this.redis.set(key, serializedValue);
        }
      }
      
      // Always store in memory as fallback
      const cacheItem: { value: any; expires?: number } = { value };
      if (ttlSeconds) {
        cacheItem.expires = Date.now() + (ttlSeconds * 1000);
      }
      this.inMemoryCache.set(key, cacheItem);
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}:`, error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.del(key);
      }
      this.inMemoryCache.delete(key);
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      if (this.redis) {
        const keys = await this.redis.keys(pattern);
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      }
      
      // For in-memory cache, use simple pattern matching
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      for (const key of this.inMemoryCache.keys()) {
        if (regex.test(key)) {
          this.inMemoryCache.delete(key);
        }
      }
    } catch (error) {
      this.logger.error(`Failed to delete cache pattern ${pattern}:`, error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (this.redis) {
        const result = await this.redis.exists(key);
        return result === 1;
      }
      
      const cacheItem = this.inMemoryCache.get(key);
      if (cacheItem && this.isExpired(cacheItem)) {
        this.inMemoryCache.delete(key);
        return false;
      }
      return !!cacheItem;
    } catch (error) {
      this.logger.error(`Failed to check cache key existence ${key}:`, error);
      return false;
    }
  }

  async increment(key: string, ttlSeconds?: number): Promise<number> {
    try {
      const result = await this.redis.incr(key);
      
      if (ttlSeconds && result === 1) {
        await this.redis.expire(key, ttlSeconds);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to increment cache key ${key}:`, error);
      return 0;
    }
  }

  async setHash(key: string, field: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      await this.redis.hset(key, field, serializedValue);
      
      if (ttlSeconds) {
        await this.redis.expire(key, ttlSeconds);
      }
    } catch (error) {
      this.logger.error(`Failed to set hash ${key}:${field}:`, error);
    }
  }

  async getHash<T>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.redis.hget(key, field);
      if (value) {
        return JSON.parse(value);
      }
      return null;
    } catch (error) {
      this.logger.error(`Failed to get hash ${key}:${field}:`, error);
      return null;
    }
  }

  async getAllHash<T>(key: string): Promise<Record<string, T>> {
    try {
      const hash = await this.redis.hgetall(key);
      const result: Record<string, T> = {};
      
      for (const [field, value] of Object.entries(hash)) {
        result[field] = JSON.parse(value);
      }
      
      return result;
    } catch (error) {
      this.logger.error(`Failed to get all hash ${key}:`, error);
      return {};
    }
  }

  async flushAll(): Promise<void> {
    try {
      await this.redis.flushall();
      this.logger.log('Cache flushed successfully');
    } catch (error) {
      this.logger.error('Failed to flush cache:', error);
    }
  }

  async getKeys(pattern: string = '*'): Promise<string[]> {
    try {
      return await this.redis.keys(pattern);
    } catch (error) {
      this.logger.error(`Failed to get keys with pattern ${pattern}:`, error);
      return [];
    }
  }

  async getTTL(key: string): Promise<number> {
    try {
      return await this.redis.ttl(key);
    } catch (error) {
      this.logger.error(`Failed to get TTL for key ${key}:`, error);
      return -1;
    }
  }

  onModuleDestroy() {
    if (this.redis) {
      this.redis.disconnect();
    }
    this.inMemoryCache.clear();
  }
}