'use client';
import { FileSparksTab } from '@/app/_components/files/FileSparksTab';
import { useActiveFile } from '@/app/_lib/use-active-file';

export default function InsightsTab() {
  const { file } = useActiveFile();
  if (!file) return null;
  return <FileSparksTab file={file}/>;
}
