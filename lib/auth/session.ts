import { cookies } from 'next/headers';
import { db } from '@/lib/db';

const SESSION_COOKIE = 'session_id';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 hours

export async function createSession(userId: string, ip?: string, userAgent?: string) {
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

  return db.session.findFirst({
    where: {
      id: sessionId,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: { user: { select: { id: true, username: true, isActive: true } } },
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;

  if (sessionId) {
    await db.session.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  cookieStore.delete(SESSION_COOKIE);
}
