import 'server-only'
import pino from 'pino'

const isProduction = process.env.NODE_ENV === 'production'

// Avoid pino transport worker in Next.js. Use stream form instead of transport.
let destination: pino.DestinationStream | undefined
if (isProduction) {
    destination = pino.destination(1)
} else {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pretty: pino.DestinationStream = require('pino-pretty')({
        colorize: true,
        translateTime: 'SYS:standard',
        singleLine: false,
    })
    destination = pretty
}

const logger = pino(
    {
        level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
        base: {
            service: 'dd-ops',
            nodeEnv: process.env.NODE_ENV,
        },
        timestamp: pino.stdTimeFunctions.isoTime,
    },
    destination
)

export default logger


