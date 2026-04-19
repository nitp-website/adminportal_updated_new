import { connectRedis } from '@/lib/redis';
import { depList } from '@/lib/const';
import { query } from '@/lib/db';

const PREFIX = 'publications';

// generate key
export const getPublicationsKey = (type) => {
  return `${PREFIX}:${(type || 'all').toLowerCase()}`;
};

// helper function
export const getDepartmentFromEmail = async (email) => {
  try {
    const result = await query(
      `SELECT department FROM user WHERE email = ?`,
      [email]
    );

    return result?.[0]?.department || null;
  } catch (err) {
    console.error('[Dept Fetch Error]', err.message);
    return null;
  }
};

// GET cache (SAFE)
export const getPublicationsCache = async (key) => {
  try {
    const redis = await connectRedis();

    const data = await redis.get(key);
    // return data ? JSON.parse(data) : null;
    if (!data){
      console.log(`Cache MISS → ${key}`);
      return null;
    }
    console.log(`Cache HIT → ${key}`);
    try {
      return JSON.parse(data);
    } catch (parseErr) {
      console.error('[Redis PARSE Error]', parseErr.message);
      return null; // fallback to DB
    }

  } catch (err) {
    console.error('[Redis GET Error]', err.message);
    return null;
  }
};

// SET cache
export const setPublicationsCache = async (key, data) => {
  try {
    const redis = await connectRedis();

    await redis.set(key, JSON.stringify(data), 'EX', 21600);
    // await redis.sadd(`${PREFIX}:keys`, key);
    console.log(`Cache SET → ${key}`);
  } catch (err) {
    console.error('[Redis SET Error]', err.message);
  }
};

// invalidate cache
export const invalidatePublicationsCache = async (email=null) => {
  try {
    const redis = await connectRedis();

    const keys = [];

    if (!email) {
      // PUBLICATIONS CACHE CLEAR
      const allKeys = await redis.keys(`${PREFIX}:*`);
      if (allKeys.length) await redis.del(...allKeys);
      return;
    }
    //KEYS TO INVALIDATE
    keys.push(getPublicationsKey('all'));
    if(email){
      const department = await getDepartmentFromEmail(email);
    
      if(department){
        // Find matching type key from depList
        const normalizedDept = department.trim().toLowerCase();
        const typeKey = [...depList.entries()]
          .find(([key, value]) => value.trim().toLowerCase() === normalizedDept)?.[0];
          
        if (typeKey) {
          keys.push(getPublicationsKey(typeKey));
        }
      }
      if (!department) {
        console.warn('Department not found, clearing all publications cache');
        
        const allKeys = await redis.keys(`${PREFIX}:*`);
        if (allKeys.length) await redis.del(...allKeys);
        return;
      }
    }
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`Cleared publications cache (${keys.length} keys)`);
    }
    // await redis.del(`${PREFIX}:keys`);
  } catch (err) {
    console.error('[Redis INVALIDATE Error]', err.message);
  }
};

// note: invalidatePublicationsCache -> here, if invalidate failed due to redis error, then say redis live again then we might get stale data, so we need to set TTL accordingly or implement some other strategy
