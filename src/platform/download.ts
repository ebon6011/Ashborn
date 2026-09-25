export type SaveOutcome = 'shared' | 'downloaded' | 'cancelled';

/**
 * Saves the backup file. On iPhone the share sheet ("Save to Files") is the reliable path;
 * elsewhere, or if sharing is refused, fall back to a normal download link.
 */
export async function saveBackupFile(json: string, fileName: string): Promise<SaveOutcome> {
  const file = new File([json], fileName, { type: 'application/json' });
  if (typeof navigator.canShare === 'function' && typeof navigator.share === 'function' && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName });
      return 'shared';
    } catch (error) {
      if ((error as Error).name === 'AbortError') return 'cancelled';
      // NotAllowedError etc.: fall through to a download.
    }
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
