// Redis helpers for Studyo — all keys prefixed studyo:{userId}:

import { getRedis } from './kv';
import type { StudyoProject } from '@/app/(studyo)/_lib/studyo-types';

function key(userId: string, ...parts: string[]) {
  return ['studyo', userId, ...parts].join(':');
}

// --- Projects ---

export async function listProjects(userId: string): Promise<StudyoProject[]> {
  const redis = getRedis();
  const raw = await redis.get(key(userId, 'projects'));
  if (!raw) return [];
  return JSON.parse(raw as string);
}

export async function getProject(userId: string, projectId: string): Promise<StudyoProject | null> {
  const projects = await listProjects(userId);
  return projects.find(p => p.id === projectId) || null;
}

export async function saveProjects(userId: string, projects: StudyoProject[]): Promise<void> {
  const redis = getRedis();
  await redis.set(key(userId, 'projects'), JSON.stringify(projects));
}

export async function createProject(userId: string, data: Partial<StudyoProject>): Promise<StudyoProject> {
  const projects = await listProjects(userId);
  const project: StudyoProject = {
    id: crypto.randomUUID(),
    title: data.title || 'Untitled project',
    desc: data.desc || '',
    color: data.color || '#D49A5A',
    updatedAt: new Date().toISOString(),
    material: data.material || [],
    instructions: data.instructions || [],
    outputs: data.outputs || [],
  };
  projects.unshift(project);
  await saveProjects(userId, projects);
  return project;
}

export async function updateProject(userId: string, projectId: string, data: Partial<StudyoProject>): Promise<StudyoProject | null> {
  const projects = await listProjects(userId);
  const idx = projects.findIndex(p => p.id === projectId);
  if (idx === -1) return null;
  projects[idx] = { ...projects[idx], ...data, updatedAt: new Date().toISOString() };
  await saveProjects(userId, projects);
  return projects[idx];
}

export async function deleteProject(userId: string, projectId: string): Promise<boolean> {
  const projects = await listProjects(userId);
  const filtered = projects.filter(p => p.id !== projectId);
  if (filtered.length === projects.length) return false;
  await saveProjects(userId, filtered);
  return true;
}
