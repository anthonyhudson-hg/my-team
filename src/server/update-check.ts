export interface UpdateInfo {
  currentVersion: string;
  /** Null when the check failed (offline, registry unreachable, etc.) — not an error, just "unknown". */
  latestVersion: string | null;
  updateAvailable: boolean;
}

function isNewerVersion(latest: string, current: string): boolean {
  const a = latest.split('.').map(Number);
  const b = current.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y;
  }
  return false;
}

/**
 * Plain registry GET, no npm CLI involved. Never throws — a failed check
 * (offline, registry down) just means "no update info available," not an
 * error worth surfacing to the user.
 */
export async function checkForUpdate(packageName: string, currentVersion: string): Promise<UpdateInfo> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`, {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return { currentVersion, latestVersion: null, updateAvailable: false };
    const data = (await res.json()) as { version?: string };
    if (!data.version) return { currentVersion, latestVersion: null, updateAvailable: false };
    return { currentVersion, latestVersion: data.version, updateAvailable: isNewerVersion(data.version, currentVersion) };
  } catch {
    return { currentVersion, latestVersion: null, updateAvailable: false };
  }
}
