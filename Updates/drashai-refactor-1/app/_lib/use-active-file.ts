'use client';
import { useParams } from 'next/navigation';
import { useEncounters } from './encounters-store';

/**
 * Convenience hook for the file detail tabs.
 * Reads the [id] route param and returns the matching encounter.
 */
export function useActiveFile() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const { encounters, patch, loading } = useEncounters();
  const file = id ? encounters.find((e) => e.id === id) : undefined;
  return { id, file, loading, patch };
}
