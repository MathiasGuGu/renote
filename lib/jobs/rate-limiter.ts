interface RateLimitConfig {
  requests: number;
  window: number; // milliseconds
  cooldown?: number; // milliseconds
}

interface RateLimitState {
  requests: number;
  windowStart: number;
  lastRequest: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitState> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  constructor() {
    // Notion API limits: 3 requests per second
    this.configs.set("notion", {
      requests: 3,
      window: 1000, // 1 second
      cooldown: 334, // ~334ms between requests
    });

    // OpenAI API limits: 60 requests per minute
    this.configs.set("openai", {
      requests: 60,
      window: 60000, // 1 minute
      cooldown: 1000, // 1 second between requests
    });

    // General API limits for bulk operations
    this.configs.set("bulk", {
      requests: 10,
      window: 60000, // 1 minute
      cooldown: 6000, // 6 seconds between requests
    });
  }

  async checkLimit(service: string): Promise<boolean> {
    const config = this.configs.get(service);
    if (!config) {
      console.warn(`No rate limit config for service: ${service}`);
      return true; // Allow if no config
    }

    const now = Date.now();
    let state = this.limits.get(service);

    if (!state) {
      state = {
        requests: 0,
        windowStart: now,
        lastRequest: 0,
      };
      this.limits.set(service, state);
    }

    // Reset window if expired
    if (now - state.windowStart >= config.window) {
      state.requests = 0;
      state.windowStart = now;
    }

    // Check if we're within limits
    if (state.requests >= config.requests) {
      const timeUntilReset = config.window - (now - state.windowStart);
      console.log(
        `Rate limit exceeded for ${service}. Reset in ${timeUntilReset}ms`
      );
      return false;
    }

    // Check cooldown period
    if (config.cooldown && now - state.lastRequest < config.cooldown) {
      const cooldownRemaining = config.cooldown - (now - state.lastRequest);
      console.log(
        `Cooldown active for ${service}. Wait ${cooldownRemaining}ms`
      );
      return false;
    }

    return true;
  }

  async waitForLimit(service: string): Promise<void> {
    const config = this.configs.get(service);
    if (!config) return;

    while (!(await this.checkLimit(service))) {
      const state = this.limits.get(service)!;
      const now = Date.now();

      // Calculate wait time
      let waitTime = 0;

      // Check window reset time
      const windowWait = config.window - (now - state.windowStart);
      if (state.requests >= config.requests && windowWait > 0) {
        waitTime = Math.max(waitTime, windowWait);
      }

      // Check cooldown time
      if (config.cooldown && now - state.lastRequest < config.cooldown) {
        const cooldownWait = config.cooldown - (now - state.lastRequest);
        waitTime = Math.max(waitTime, cooldownWait);
      }

      if (waitTime > 0) {
        console.log(`Rate limiter waiting ${waitTime}ms for ${service}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        break;
      }
    }
  }

  recordRequest(service: string): void {
    const state = this.limits.get(service);
    if (state) {
      state.requests++;
      state.lastRequest = Date.now();
    }
  }

  // Get remaining requests for a service
  getRemainingRequests(service: string): number {
    const config = this.configs.get(service);
    const state = this.limits.get(service);

    if (!config || !state) return Infinity;

    const now = Date.now();

    // Reset if window expired
    if (now - state.windowStart >= config.window) {
      return config.requests;
    }

    return Math.max(0, config.requests - state.requests);
  }
}

export const rateLimiter = new RateLimiter();
