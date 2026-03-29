import Redis from "ioredis"

let redis

if (!global._redis) {
  global._redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  enableReadyCheck: true,
  connectTimeout: 1000,
  lazyConnect: true
})
}

redis = global._redis

export default redis