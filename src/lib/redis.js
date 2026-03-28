import Redis from "ioredis"

let redis

if (!global._redis) {
  global._redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 2,
    enableReadyCheck: true,
  })

  global._redis.on("error", (err) => {
    console.error("Redis Error:", err)
  })

  global._redis.on("connect", () => {
    console.log("Redis connected")
  })
}

redis = global._redis

export default redis