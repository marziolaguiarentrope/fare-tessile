'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { createSession, destroySession } from '@/lib/auth/session';
import { checkRateLimit } from '@/lib/auth/rate-limit';

const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

type LoginState = { error: string } | null;

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = (formData.get('username') as string)?.trim();
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { error: 'Please fill in all fields.' };
  }

  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1';

  if (!checkRateLimit(ip)) {
    return { error: 'Too many attempts. Please wait 1 minute.' };
  }

  const user = await db.user.findUnique({ where: { username } });

  // Generic error — never reveal if username exists
  const genericError: LoginState = { error: 'Invalid credentials.' };

  if (!user || !user.isActive) return genericError;

  // Check account lock
  if (user.lockedAt) {
    const lockedUntil = new Date(user.lockedAt.getTime() + LOCK_MINUTES * 60 * 1000);
    if (new Date() < lockedUntil) {
      const remaining = Math.ceil((lockedUntil.getTime() - Date.now()) / 60000);
      return { error: `Account locked. Try again in ${remaining} minute(s).` };
    }
    // Lock expired — reset
    await db.user.update({ where: { id: user.id }, data: { lockedAt: null, failedAttempts: 0 } });
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    const newFailed = user.failedAttempts + 1;
    const shouldLock = newFailed >= MAX_FAILED;

    await db.user.update({
      where: { id: user.id },
      data: { failedAttempts: newFailed, lockedAt: shouldLock ? new Date() : undefined },
    });

    await db.auditLog.create({
      data: {
        actorId: user.id,
        action: shouldLock ? 'account_locked' : 'login_failed',
        ipAddress: ip,
        metadata: JSON.stringify({ attempts: newFailed }),
      },
    });

    if (shouldLock) {
      return { error: `Account locked after ${MAX_FAILED} failed attempts. Try again in ${LOCK_MINUTES} min.` };
    }

    return genericError;
  }

  // Success
  await db.user.update({ where: { id: user.id }, data: { failedAttempts: 0, lockedAt: null } });

  const ua = headersList.get('user-agent') ?? '';
  await createSession(user.id, ip, ua);

  await db.auditLog.create({
    data: { actorId: user.id, action: 'login_success', ipAddress: ip },
  });

  redirect('/overview');
}

export async function logout() {
  const cookieStore = await (await import('next/headers')).cookies();
  const sessionId = cookieStore.get('session_id')?.value;

  if (sessionId) {
    const session = await db.session.findUnique({ where: { id: sessionId }, select: { userId: true } });
    if (session) {
      await db.auditLog.create({ data: { actorId: session.userId, action: 'logout' } });
    }
  }

  await destroySession();
  redirect('/login');
}
