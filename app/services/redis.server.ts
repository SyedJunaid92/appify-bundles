import { Redis } from "@upstash/redis";

let client: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (client !== undefined) return client;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    client = null;
    return client;
  }

  client = new Redis({ url, token });
  return client;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  try {
    const value = await redis.get<T>(key);
    return value ?? null;
  } catch (error) {
    console.error("[redis] get failed", key, error);
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number) {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    console.error("[redis] set failed", key, error);
  }
}

export async function cacheDel(...keys: string[]) {
  const redis = getRedis();
  if (!redis || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch (error) {
    console.error("[redis] del failed", keys, error);
  }
}

export async function bumpCacheVersion(namespace: string, shop: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  try {
    return await redis.incr(`${namespace}:ver:${shop}`);
  } catch (error) {
    console.error("[redis] incr failed", namespace, shop, error);
    return 0;
  }
}

export async function readCacheVersion(namespace: string, shop: string): Promise<number> {
  const redis = getRedis();
  if (!redis) return 0;
  try {
    const value = await redis.get<number>(`${namespace}:ver:${shop}`);
    return Number(value ?? 0);
  } catch {
    return 0;
  }
}

export async function cachedJson<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit != null) return hit;
  const value = await loader();
  await cacheSet(key, value, ttlSeconds);
  return value;
}
