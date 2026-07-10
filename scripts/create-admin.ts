/**
 * Cria o usuário admin inicial.
 * Uso: npx dotenv -e .env -- npx tsx scripts/create-admin.ts <username> <password>
 * Exemplo: npx dotenv -e .env -- npx tsx scripts/create-admin.ts admin MinhaS3nh@Segura
 */
import 'dotenv/config';
import { PrismaClient } from '../lib/generated/prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import bcrypt from 'bcryptjs';

const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL não definida no .env'); process.exit(1); }

const db = new PrismaClient({ adapter: new PrismaLibSql({ url, authToken: process.env.DATABASE_AUTH_TOKEN }) } as never);

async function main() {
  const username = process.argv[2];
  const password = process.argv[3];

  if (!username || !password) {
    console.error('Uso: npx tsx scripts/create-admin.ts <username> <password>');
    process.exit(1);
  }

  if (password.length < 10)            { console.error('Senha deve ter pelo menos 10 caracteres.'); process.exit(1); }
  if (!/[A-Z]/.test(password))         { console.error('Senha deve ter pelo menos 1 maiúscula.'); process.exit(1); }
  if (!/[0-9]/.test(password))         { console.error('Senha deve ter pelo menos 1 número.'); process.exit(1); }
  if (!/[^A-Za-z0-9]/.test(password))  { console.error('Senha deve ter pelo menos 1 símbolo.'); process.exit(1); }

  const existing = await db.user.findUnique({ where: { username } });
  if (existing) { console.error(`Usuário "${username}" já existe.`); process.exit(1); }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.create({ data: { username, passwordHash } });

  console.log('Admin criado com sucesso!');
  console.log(`  ID:       ${user.id}`);
  console.log(`  Username: ${user.username}`);
  console.log(`  Criado:   ${user.createdAt.toISOString()}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
