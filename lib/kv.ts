/**
 * Redis/KV store for Drash AI.
 * Stores user settings, encounter data, and API keys.
 * API keys are encrypted at rest using AES-256-GCM.
 */

import Redis from 'ioredis';
import { encrypt, decrypt } from './encryption';

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.REDIS_URL || process.env.KV_URL || process.env.drashai_REDIS_URL;
    if (!url) throw new Error('Redis not configured. Add a Vercel KV store to this project.');
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

// --- API Keys (per-user, encrypted at rest) ---

export async function getUserElevenLabsKey(userId: string): Promise<string | null> {
  const val = await getRedis().get(`user:${userId}:elevenlabs-key`);
  if (!val) return null;
  try { return decrypt(val); } catch { return val; } // graceful fallback for plaintext
}

export async function setUserElevenLabsKey(userId: string, key: string): Promise<void> {
  await getRedis().set(`user:${userId}:elevenlabs-key`, encrypt(key));
}

export async function getUserClaudeApiKey(userId: string): Promise<string | null> {
  const val = await getRedis().get(`user:${userId}:claude-key`);
  if (!val) return null;
  try { return decrypt(val); } catch { return val; } // graceful fallback for plaintext
}

export async function setUserClaudeApiKey(userId: string, key: string): Promise<void> {
  await getRedis().set(`user:${userId}:claude-key`, encrypt(key));
}
