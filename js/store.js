// Lokaler Speicher. Ohne Code: JSON in localStorage. Mit Code: AES-GCM-verschlüsselt,
// Schlüssel per PBKDF2 aus dem Code abgeleitet. Nichts verlässt das Gerät.
import { migrate } from './core.js';

export const PLAIN_KEY = 'liwy.v1';      // bestehender Schlüssel der ersten Version – Daten bleiben erhalten
export const ENC_KEY = 'liwy.enc.v1';
export const PREFS_KEY = 'liwy.prefs';   // nur unkritische Anzeige-Einstellungen (Design, Sperrzeit)

const mem = {};
export const ls = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return mem[k] ?? null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { mem[k] = v; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { delete mem[k]; } },
};

export function loadPrefs() {
  try { return { theme: 'system', lockAfter: 30, ...JSON.parse(ls.get(PREFS_KEY) || '{}') }; } catch (e) { return { theme: 'system', lockAfter: 30 }; }
}
export function savePrefs(p) { ls.set(PREFS_KEY, JSON.stringify(p)); }

export function isEncrypted() { return !!ls.get(ENC_KEY); }
export function loadPlain() {
  const raw = ls.get(PLAIN_KEY);
  if (!raw) return null;
  try { return migrate(JSON.parse(raw)); } catch (e) { return null; }
}
export function savePlain(db) { ls.set(PLAIN_KEY, JSON.stringify(db)); }

const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const ITER = 210000;

export function cryptoAvailable() { return !!(globalThis.crypto && crypto.subtle); }

export async function deriveKey(pin, salt, iter = ITER) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode('liwy:' + pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

/** Erzeugt einen neuen Schlüssel (neues Salz) für einen Code. */
export async function newSession(pin) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { key: await deriveKey(pin, salt), salt: b64(salt), iter: ITER };
}

export async function saveEncrypted(db, session) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, session.key, new TextEncoder().encode(JSON.stringify(db)));
  ls.set(ENC_KEY, JSON.stringify({ v: 1, salt: session.salt, iter: session.iter, iv: b64(iv), ct: b64(ct) }));
  ls.del(PLAIN_KEY);
}

/** Entschlüsselt mit dem Code. Gibt null zurück, wenn der Code falsch ist. */
export async function unlockEncrypted(pin) {
  const blob = JSON.parse(ls.get(ENC_KEY));
  const salt = unb64(blob.salt);
  const key = await deriveKey(pin, salt, blob.iter || ITER);
  try {
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(blob.iv) }, key, unb64(blob.ct));
    return { db: migrate(JSON.parse(new TextDecoder().decode(pt))), session: { key, salt: blob.salt, iter: blob.iter || ITER } };
  } catch (e) { return null; }
}

export function wipeAll() { ls.del(PLAIN_KEY); ls.del(ENC_KEY); }

/** Prüft den Code-Hash der ersten App-Version (nur für die einmalige Umstellung). */
export async function legacyHash(p) {
  const s = 'liwy:' + p;
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  catch (e) { let h = 5381; for (const c of s) h = (h * 33 + c.charCodeAt(0)) >>> 0; return 'x' + h; }
}
