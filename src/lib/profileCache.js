import { getRedisClient } from '@/lib/redis';
import { connectRedis } from '@/lib/redis';

const redis = await connectRedis();
// Cache TTL: 6 hours
// Reason: profile data changes infrequently but should not be stale for too long
const PROFILE_CACHE_TTL = 6 * 60 * 60; // 6 hours cache
const PROFILE_PREFIX = 'profile:';

/**
 * Generate cache key from email/userId
 */
function getCacheKey(email) {
  return `${PROFILE_PREFIX}${email.toLowerCase()}`;
}

/**
 * Cache complete user profile
 * Called after fetching from database
 */
export async function cacheUserProfile(email, profileData) {
  try {
    const redis = await connectRedis();
    const key = getCacheKey(email);
    
    // Store entire profile object
    await redis.setex(
      key,
      PROFILE_CACHE_TTL,
      JSON.stringify(profileData)
    );
    
    console.log(`✓ Profile cached for ${email}`);
    return true;
  } catch (error) {
    console.error('Error caching profile:', error);
    return false;
  }
}

/**
 * Retrieve cached profile from Redis
 * Called FIRST before any database query
 */
export async function getCachedUserProfile(email) {
  try {
    const redis = await connectRedis();
    const key = getCacheKey(email);
    
    const cached = await redis.get(key);
    
    if (cached) {
      console.log(`✓ Profile cache hit for ${email} (1-2ms)`);
      return JSON.parse(cached);
    }
    
    console.log(`✗ Profile cache miss for ${email} (will fetch from DB)`);
    return null;
  } catch (error) {
    console.error('Error retrieving cached profile:', error);
    return null;
  }
}

/**
 * Invalidate profile cache (when profile is updated)
 */
export async function invalidateUserProfile(email) {
  try {
    const redis = getRedisClient();
    const key = `profile:v1:${email}`;

    await redis.del(key);

    console.log(`[CACHE] INVALIDATE | email=${email}`);
    return true;
  } catch (error) {
    console.error('[CACHE] INVALIDATE ERROR:', error);
    return false;
  }
}

/**
 * Invalidate multiple profiles (when updating related data)
 */
export async function invalidateMultipleProfiles(emails) {
  try {
    const redis = await connectRedis();
    const keys = emails.map(email => getCacheKey(email));
    
    if (keys.length > 0) {
      await redis.del(...keys);
      console.log(`✓ Invalidated ${keys.length} profile caches`);
    }
    return true;
  } catch (error) {
    console.error('Error invalidating profiles:', error);
    return false;
  }
}

/**
 * Refresh cache TTL (extend expiry on access)
 */
export async function refreshProfileCacheTTL(email) {
  try {
    const redis = await connectRedis();
    const key = getCacheKey(email);
    
    await redis.expire(key, PROFILE_CACHE_TTL);
    return true;
  } catch (error) {
    console.error('Error refreshing profile TTL:', error);
    return false;
  }
}