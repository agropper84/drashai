/**
 * Google Drive storage for Studyo
 *
 * Organized folder structure in the user's Drive:
 *   Studyo/
 *   ├── uploads/           — User-uploaded source material (PDFs, docs, EPUBs)
 *   ├── recordings/        — User-uploaded or recorded audio/video sources
 *   ├── transcripts/       — Generated transcripts (.txt)
 *   ├── scripts/           — Generated podcast/lecture scripts (.json)
 *   ├── audio/             — Generated audio files (podcasts, lectures, summaries)
 *   ├── notes/             — Generated study notes (.json)
 *   ├── questions/         — Generated practice questions (.json)
 *   └── exports/           — User-exported files (Word docs, PDFs)
 *
 * Unlike Drashai, Studyo files are NOT encrypted — study material is not PHI.
 * Files use readable names (project title + output title) for easy browsing in Drive.
 */

import { google, type drive_v3 } from 'googleapis';
import { Readable } from 'stream';
import { getOAuth2Client, refreshAccessToken } from './oauth';
import { getSessionFromCookies } from './session';
import { getRedis } from './kv';

const APP_FOLDER = 'Studyo';
const SUBFOLDERS = [
  'uploads',       // PDFs, docs, EPUBs uploaded as source material
  'recordings',    // Audio/video source files (uploaded or recorded)
  'transcripts',   // Generated transcript text files
  'scripts',       // Generated podcast/lecture script JSON
  'audio',         // Generated audio output (MP3/WAV)
  'notes',         // Generated study notes JSON
  'questions',     // Generated practice question sets JSON
  'exports',       // User-exported documents (Word, PDF)
] as const;

export type StudyoSubfolder = typeof SUBFOLDERS[number];

const TOKEN_BUFFER_MS = 5 * 60 * 1000;

export interface StudyoDriveContext {
  drive: drive_v3.Drive;
  userId: string;
  rootFolderId: string;
  subfolderIds: Record<StudyoSubfolder, string>;
}

// ── Redis cache helpers ──────────────────────────────────────

const kvKey = (userId: string, key: string) => `studyo-drive:${userId}:${key}`;

async function getCached(userId: string, key: string): Promise<string | null> {
  try { return await getRedis().get(kvKey(userId, key)); } catch { return null; }
}
async function setCache(userId: string, key: string, value: string): Promise<void> {
  try { await getRedis().set(kvKey(userId, key), value); } catch {}
}

// ── Drive Context ────────────────────────────────────────────

export async function getStudyoDriveContext(): Promise<StudyoDriveContext> {
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

  // Resolve root folder
  let rootFolderId = await getCached(session.userId, 'rootFolderId');
  if (!rootFolderId) {
    rootFolderId = await ensureFolder(drive, APP_FOLDER, 'root');
    await setCache(session.userId, 'rootFolderId', rootFolderId);
  }

  // Resolve subfolders
  const subfolderIds: Record<string, string> = {};
  for (const sub of SUBFOLDERS) {
    let id = await getCached(session.userId, `folder:${sub}`);
    if (!id) {
      id = await ensureFolder(drive, sub, rootFolderId);
      await setCache(session.userId, `folder:${sub}`, id);
    }
    subfolderIds[sub] = id;
  }

  return {
    drive,
    userId: session.userId,
    rootFolderId,
    subfolderIds: subfolderIds as Record<StudyoSubfolder, string>,
  };
}

// ── Folder operations ────────────────────────────────────────

async function ensureFolder(drive: drive_v3.Drive, name: string, parentId: string): Promise<string> {
  const res = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });
  if (res.data.files?.[0]?.id) return res.data.files[0].id;

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

// ── File operations (plain, not encrypted) ───────────────────

/** Upload a file to a specific subfolder. Returns the Drive file ID. */
export async function uploadFile(
  ctx: StudyoDriveContext,
  subfolder: StudyoSubfolder,
  fileName: string,
  mimeType: string,
  content: Buffer | string,
): Promise<string> {
  const folderId = ctx.subfolderIds[subfolder];
  const body = typeof content === 'string' ? Readable.from(Buffer.from(content)) : Readable.from(content);

  // Check if file with same name exists in this folder
  const existing = await ctx.drive.files.list({
    q: `name='${sanitizeName(fileName)}' and '${folderId}' in parents and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive',
  });
  const existingId = existing.data.files?.[0]?.id;

  if (existingId) {
    // Update existing
    await ctx.drive.files.update({
      fileId: existingId,
      media: { mimeType, body },
    });
    return existingId;
  }

  // Create new
  const created = await ctx.drive.files.create({
    requestBody: {
      name: sanitizeName(fileName),
      parents: [folderId],
    },
    media: { mimeType, body },
    fields: 'id',
  });
  return created.data.id!;
}

/** Upload a JSON object as a readable .json file. */
export async function uploadJson(
  ctx: StudyoDriveContext,
  subfolder: StudyoSubfolder,
  fileName: string,
  data: unknown,
): Promise<string> {
  return uploadFile(ctx, subfolder, fileName, 'application/json', JSON.stringify(data, null, 2));
}

/** Upload a text file. */
export async function uploadText(
  ctx: StudyoDriveContext,
  subfolder: StudyoSubfolder,
  fileName: string,
  text: string,
): Promise<string> {
  return uploadFile(ctx, subfolder, fileName, 'text/plain', text);
}

/** Download a file by its Drive file ID. Returns the content as a Buffer. */
export async function downloadFile(ctx: StudyoDriveContext, fileId: string): Promise<Buffer> {
  const res = await ctx.drive.files.get(
    { fileId, alt: 'media' },
    { responseType: 'arraybuffer' },
  );
  return Buffer.from(res.data as ArrayBuffer);
}

/** Delete a file by its Drive file ID. */
export async function deleteFile(ctx: StudyoDriveContext, fileId: string): Promise<void> {
  await ctx.drive.files.delete({ fileId });
}

/** List files in a subfolder. Returns file names and IDs. */
export async function listFiles(
  ctx: StudyoDriveContext,
  subfolder: StudyoSubfolder,
): Promise<{ id: string; name: string; mimeType: string; size: string; createdTime: string }[]> {
  const folderId = ctx.subfolderIds[subfolder];
  const res = await ctx.drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType, size, createdTime)',
    spaces: 'drive',
    orderBy: 'createdTime desc',
  });
  return (res.data.files || []).map(f => ({
    id: f.id!,
    name: f.name!,
    mimeType: f.mimeType || 'application/octet-stream',
    size: f.size || '0',
    createdTime: f.createdTime || '',
  }));
}

// ── Helpers ──────────────────────────────────────────────────

/** Sanitize file name for Drive (remove special chars that cause issues). */
function sanitizeName(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, '_').substring(0, 200);
}
