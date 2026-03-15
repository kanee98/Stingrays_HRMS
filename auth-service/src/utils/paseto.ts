import crypto from 'crypto';
import paseto from 'paseto';

const { V3 } = paseto;

const PASETO_SECRET = process.env.PASETO_SECRET || process.env.JWT_SECRET || 'default-secret-change-in-production';

/** Derive a 32-byte key for PASETO v3.local from env secret. */
function getSecretKey(): Buffer {
  return crypto.createHash('sha256').update(PASETO_SECRET, 'utf8').digest();
}

export async function signToken(payload: Record<string, unknown>): Promise<string> {
  const key = crypto.createSecretKey(getSecretKey());
  return V3.encrypt(payload, key, { expiresIn: '1h' });
}

export async function verifyToken(token: string): Promise<Record<string, unknown>> {
  const key = crypto.createSecretKey(getSecretKey());
  const decoded = await V3.decrypt(token, key);
  return decoded as Record<string, unknown>;
}
