/**
 * Redis/KV store for Drash AI.
 * Stores user settings, encounter data, and API keys.
 */

import Redis from 'ioredis';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL || process.env.KV_URL;
    if (!url) throw new Error('REDIS_URL not set');
    redis = new Redis(url, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      commandTimeout: 3000,
      lazyConnect: false,
    });
    redis.on('error', () => {});
  }
  return redis;
}

// --- User Settings ---

export async function getUserSettings(userId: string): Promise<Record<string, unknown> | null> {
  const val = await getRedis().get(`user:${userId}:settings`);
  if (!val) return null;
  return JSON.parse(val);
}

export async function setUserSettings(userId: string, settings: Record<string, unknown>): Promise<void> {
  await getRedis().set(`user:${userId}:settings`, JSON.stringify(settings));
}

// --- User Approval ---

export async function getUserStatus(userId: string): Promise<string | null> {
  return getRedis().get(`user:${userId}:status`);
}

export async function setUserStatus(userId: string, status: string): Promise<void> {
  await getRedis().set(`user:${userId}:status`, status);
}

// --- API Keys (per-user) ---

export async function getUserElevenLabsKey(userId: string): Promise<string | null> {
  return getRedis().get(`user:${userId}:elevenlabs-key`);
}

export async function setUserElevenLabsKey(userId: string, key: string): Promise<void> {
  await getRedis().set(`user:${userId}:elevenlabs-key`, key);
}

export async function getUserClaudeApiKey(userId: string): Promise<string | null> {
  return getRedis().get(`user:${userId}:claude-key`);
}
