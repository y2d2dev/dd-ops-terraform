import 'server-only'
import { PrismaClient, Prisma } from '@prisma/client'
import logger from '@/lib/logger'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
})

// Prisma logs -> pino
// Only attach listeners once per process
if (!(globalForPrisma as any)._prismaLogWired) {
  (globalForPrisma as any)._prismaLogWired = true
  const prismaAny = prisma as any
  prismaAny.$on('error', (e: Prisma.LogEvent) => {
    logger.error(
      { component: 'prisma', message: e.message, target: (e as any).target },
      'Prisma error'
    )
  })
  prismaAny.$on('warn', (e: Prisma.LogEvent) => {
    logger.warn(
      { component: 'prisma', message: e.message, target: (e as any).target },
      'Prisma warn'
    )
  })
  prismaAny.$on('query', (e: Prisma.QueryEvent) => {
    logger.debug(
      {
        component: 'prisma',
        query: e.query,
        params: e.params,
        durationMs: e.duration,
        target: e.target,
      },
      'Prisma query'
    )
  })
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma