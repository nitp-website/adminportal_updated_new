import Redis from 'ioredis';

let redis;

export function getRedisClient() {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      enableReadyCheck: false,
      enableOfflineQueue: true,
      lazyConnect: true,
    });
    // Event listeners for logging connection status
    redis.on('error', (err) => {
      console.error('Redis Client Error', err);
    });

    redis.on('connect', () => {
      console.log('✓ Redis Connected');
    });

    redis.on('ready', () => {
      console.log('✓ Redis Ready');
    });

    redis.on('reconnecting', () => {
      console.log('⚠ Redis Reconnecting...');
    });
  }

  return redis;
}
// Connect immediately to warm up the connection pool
export async function connectRedis() {
  const client = getRedisClient();
  // If already connected, return immediately
  if (client.status === 'ready') return client;
  // If connecting, wait for ready event
  if (client.status === 'connecting') {
    return new Promise((resolve) => {
      client.once('ready', () => resolve(client));
    });
  }
  // If disconnected, attempt to connect
  if (client.status === 'end') {
    await client.connect();
  }

  return client;
}