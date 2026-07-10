import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaClient } from './generated/prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getDatabaseConfigError() {
  if (!process.env.DATABASE_URL) return 'DATABASE_URL is not configured.';
  if (process.env.DATABASE_URL.startsWith('libsql://') && !process.env.DATABASE_AUTH_TOKEN) {
    return 'DATABASE_AUTH_TOKEN is not configured.';
  }

  return null;
}

function createPrismaClient() {
  const url = process.env.DATABASE_URL;
  const configError = getDatabaseConfigError();
  if (configError) throw new Error(configError);

  const adapter = new PrismaLibSql({ url, authToken: process.env.DATABASE_AUTH_TOKEN });
  return new PrismaClient({ adapter } as never);
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getPrismaClient(), prop, receiver);
  },
});
