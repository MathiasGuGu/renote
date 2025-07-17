const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

interface AppConfig {
  redis: {
    url: string;
    maxRetries: number;
    retryDelay: number;
  };
  notion: {
    rateLimits: {
      requestsPerMinute: number;
      burstLimit: number;
    };
  };
  sync: {
    batchSize: number;
    maxConcurrentJobs: number;
  };
}

export const appConfig: AppConfig = {
  redis: {
    url: redisUrl,
    maxRetries: 3,
    retryDelay: 1000,
  },
  notion: {
    rateLimits: {
      requestsPerMinute: 100,
      burstLimit: 100,
    },
  },
  sync: {
    batchSize: 100,
    maxConcurrentJobs: 10,
  },
};
