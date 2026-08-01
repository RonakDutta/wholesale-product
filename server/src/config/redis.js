const Redis = require("ioredis");
require("dotenv").config();

const redisConnection = process.env.REDIS_URL || {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT || 6379),
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
  retryStrategy: (times) => {
    if (times > 3) {
      console.warn("Redis server not available; continuing without Redis caching/queues.");
      return null;
    }
    return Math.min(times * 300, 1000);
  },
};

const redis = new Redis(redisConnection);

let hasLoggedError = false;
redis.on("error", (error) => {
  if (!hasLoggedError) {
    console.warn("Redis connection warning (optional service):", error?.message || error);
    hasLoggedError = true;
  }
});

redis.on("connect", () => {
  console.log("Redis client connected");
});

module.exports = redis;
