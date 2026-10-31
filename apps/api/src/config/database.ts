import { PrismaClient } from '@prisma/client';
import { getEnv } from './env.js';

let prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    const env = getEnv();
    prisma = new PrismaClient({
      log: env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['warn', 'error'],
    });
  }
  return prisma;
}

export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
}

export function setPrismaClient(client: PrismaClient | null): void {
  prisma = client;
}
