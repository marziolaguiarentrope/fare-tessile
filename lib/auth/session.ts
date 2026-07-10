import { cookies } from 'next/headers';
import { db, getDatabaseConfigError } from '@/lib/db';

const SESSION_COOKIE = 'session_id';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

export async function createSession(userId: string, ip?: string, userAgent?: string) {
  const configError = getDatabaseConfigError();
  if (configError) throw new Error(configError);

  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  const session = await db.session.create({
    data: { userId, ipAddress: ip, userAgent, expiresAt },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000,
  });

  return session;
}

export async function getSession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const configError = getDatabaseConfigError();
  if (configError) {
    console.error('[auth/session] database configuration missing', { error: configError });
    return null;
  }

  try {
    return await db.session.findFirst({
      where: {
        id: sessionId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      include: { user: { select: { id: true, username: true, isActive: true } } },
    });
  } catch (error) {
    console.error('[auth/session] failed to load session', { error: String(error) });
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId && !getDatabaseConfigError()) {
    try {
      await db.session.update({
        where: { id: sessionId },
        data: { revokedAt: new Date() },
      });
    } catch (error) {
      console.error('[auth/session] failed to revoke session', { error: String(error) });
    }
  }

  cookieStore.delete(SESSION_COOKIE);
}
