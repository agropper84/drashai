/**
 * Google Drive Encrypted Storage for Drashai
 *
 * All pastoral data encrypted with AES-256-GCM before upload.
 * File names SHA-256 hashed to prevent PHI in Drive listings.
 * Adapted from hosp_workbook_vercel/lib/drive-json.ts.
 */

import { google, type drive_v3 } from 'googleapis';
import crypto from 'crypto';
import { Readable } from 'stream';
import { getOAuth2Client, refreshAccessToken } from './oauth';
import { getSessionFromCookies } from './session';
import { getRedis } from './kv';
import { encrypt, decrypt, generateEncryptionKey, encryptBuffer, decryptBuffer } from './encryption';

const APP_FOLDER = 'Drashai';
const SUBFOLDERS = ['encounters', 'sparks', 'media', 'templates', 'library'] as const;
type Subfolder = typeof SUBFOLDERS[number];

const TOKEN_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before expiry

export interface DriveContext {
  drive: drive_v3.Drive;
  userId: string;
  rootFolderId: string;
  subfolderIds: Record<Subfolder, string>;
  encryptionKey: string;
}

// ── Key helpers ──────────────────────────────────────────────

const kvKey = (userId: string, key: string) => `drash:${userId}:${key}`;

async function getCachedValue(userId: string, key: string): Promise<string | null> {
  try { return await getRedis().get(kvKey(userId, key)); } catch { return null; }
}
async function setCachedValue(userId: string, key: string, value: string): Promise<void> {
  try { await getRedis().set(kvKey(userId, key), value); } catch {}
}

// ── File name hashing ────────────────────────────────────────

export function hashFileName(entityType: string, entityId: string, ext = '.json'): string {
  return crypto.createHash('sha256').update(`${entityType}:${entityId}`).digest('hex').substring(0, 16) + ext;
}

// ── Drive Context ────────────────────────────────────────────

export async function getDriveContext(): Promise<DriveContext> {
  const session = await getSessionFromCookies();
  if (!session.userId) throw new Error('Not authenticated');

  // Token refresh
  if (session.tokenExpiry && Date.now() > session.tokenExpiry - TOKEN_BUFFER_MS) {
    const newCreds = await refreshAccessToken(session.refreshToken);
    if (newCreds.access_token) {
      session.accessToken = newCreds.access_token;
      session.tokenExpiry = newCreds.expiry_date || Date.now() + 3600 * 1000;
      await session.save();
    }
  }

  const client = getOAuth2Client();
  client.setCredentials({ access_token: session.accessToken, refresh_token: session.refreshToken });
  const drive = google.drive({ version: 'v3', auth: client });

  // Resolve folder IDs (cached in Redis)
  let rootFolderId = await getCachedValue(session.userId, 'rootFolderId');
  if (!rootFolderId) {
    rootFolderId = await ensureFolder(drive, APP_FOLDER, 'root');
    await setCachedValue(session.userId, 'rootFolderId', rootFolderId);
  }

  const subfolderIds: Record<string, string> = {};
  for (const sub of SUBFOLDERS) {
    let id = await getCachedValue(session.userId, `folder:${sub}`);
    if (!id) {
      id = await ensureFolder(drive, sub, rootFolderId);
      await setCachedValue(session.userId, `folder:${sub}`, id);
    }
    subfolderIds[sub] = id;
  }

  // Resolve encryption key
  let encryptionKey = await getCachedValue(session.userId, 'encryptionKey');
  if (!encryptionKey) {
    encryptionKey = generateEncryptionKey();
    await setCachedValue(session.userId, 'encryptionKey', encrypt(encryptionKey));
  } else if (encryptionKey.startsWith('ENC:')) {
    encryptionKey = decrypt(encryptionKey);
  }

  return { drive, userId: session.userId, rootFolderId, subfolderIds: subfolderIds as Record<Subfolder, string>, encryptionKey };
}

// ── Folder operations ────────────────────────────────────────

async function ensureFolder(drive: drive_v3.Drive, name: string, parentId: string): Promise<string> {
  // Check if exists
  const res = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });
  if (res.data.files?.[0]?.id) return res.data.files[0].id;

  // Create
  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId === 'root' ? undefined : [parentId],
    },
    fields: 'id',
  });
  return created.data.id!;
}

// ── Encrypted JSON CRUD ──────────────────────────────────────

export async function readEncryptedJson<T>(ctx: DriveContext, subfolder: Subfolder, entityType: string, entityId: string): Promise<T | null> {
  const fileName = hashFileName(entityType, entityId);
  const folderId = ctx.subfolderIds[subfolder];

  // Find file
  const res = await ctx.drive.files.list({
    q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });
  const fileId = res.data.files?.[0]?.id;
  if (!fileId) return null;

  // Download
  const content = await ctx.drive.files.get({ fileId, alt: 'media' }, { responseType: 'text' });
  const decrypted = decrypt(content.data as string);
  return JSON.parse(decrypted) as T;
}

export async function writeEncryptedJson(ctx: DriveContext, subfolder: Subfolder, entityType: string, entityId: string, data: unknown): Promise<string> {
  const fileName = hashFileName(entityType, entityId);
  const folderId = ctx.subfolderIds[subfolder];
  const encrypted = encrypt(JSON.stringify(data));

  // Check if file exists
  const res = await ctx.drive.files.list({
    q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });
  const existingId = res.data.files?.[0]?.id;

  if (existingId) {
    // Update
    await ctx.drive.files.update({
      fileId: existingId,
      media: { mimeType: 'application/octet-stream', body: Readable.from(Buffer.from(encrypted)) },
    });
    return existingId;
  } else {
    // Create
    const created = await ctx.drive.files.create({
      requestBody: { name: fileName, parents: [folderId] },
      media: { mimeType: 'application/octet-stream', body: Readable.from(Buffer.from(encrypted)) },
      fields: 'id',
    });
    return created.data.id!;
  }
}

export async function deleteEncryptedFile(ctx: DriveContext, subfolder: Subfolder, entityType: string, entityId: string): Promise<void> {
  const fileName = hashFileName(entityType, entityId);
  const folderId = ctx.subfolderIds[subfolder];

  const res = await ctx.drive.files.list({
    q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });
  const fileId = res.data.files?.[0]?.id;
  if (fileId) await ctx.drive.files.delete({ fileId });
}

// ── Encrypted binary (audio/documents) ───────────────────────

export async function uploadEncryptedBinary(ctx: DriveContext, mediaId: string, buffer: Buffer, originalName: string): Promise<string> {
  const fileName = hashFileName('media', mediaId, '.enc');
  const encrypted = encryptBuffer(buffer, ctx.encryptionKey);

  const created = await ctx.drive.files.create({
    requestBody: {
      name: fileName,
      parents: [ctx.subfolderIds.media],
      description: originalName, // store original name in description (not in filename)
    },
    media: { mimeType: 'application/octet-stream', body: Readable.from(encrypted) },
    fields: 'id',
  });
  return created.data.id!;
}

export async function downloadDecryptedBinary(ctx: DriveContext, mediaId: string): Promise<Buffer> {
  const fileName = hashFileName('media', mediaId, '.enc');
  const folderId = ctx.subfolderIds.media;

  const res = await ctx.drive.files.list({
    q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });
  const fileId = res.data.files?.[0]?.id;
  if (!fileId) throw new Error('Media not found');

  const content = await ctx.drive.files.get({ fileId, alt: 'media' }, { responseType: 'arraybuffer' });
  return decryptBuffer(Buffer.from(content.data as ArrayBuffer), ctx.encryptionKey);
}
