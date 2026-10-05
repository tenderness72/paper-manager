import { PrismaClient } from '@prisma/client'
import path from 'node:path'
import { dataDir } from './storage'

process.env.DATABASE_URL ||= `file:${path.join(dataDir, 'paper-manager.db').replaceAll('\\', '/')}`

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
