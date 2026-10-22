import type { ParentLock } from './schema';

function hex(bytes: ArrayBuffer | Uint8Array): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function digest(salt: string, password: string): Promise<string> {
  return hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + password)));
}

/** A new lock for a password, with a fresh random salt. */
export async function makeLock(password: string): Promise<ParentLock> {
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  return { salt, hash: await digest(salt, password) };
}

export async function checkLock(lock: ParentLock, password: string): Promise<boolean> {
  return (await digest(lock.salt, password)) === lock.hash;
}
