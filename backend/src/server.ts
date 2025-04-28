import cors from 'cors'
import express from 'express'
import fs from 'fs'
import { FINAL_DIR, UPLOAD_DIR } from './constants'
import uploadRoutes from './routes/uploadRoutes'
import cleanupService from './services/cleanupService'
import redisService from './services/redisService'
import logger, { logRequest } from './utils/logger'

const app = express()

fs.mkdirSync(UPLOAD_DIR, { recursive: true })
fs.mkdirSync(FINAL_DIR, { recursive: true })

app.use(cors())
app.use(express.json())
app.use(logRequest)

app.use('/', uploadRoutes)

const initRedis = async () => {
	try {
		await redisService.connect()
		logger.info('Redis connection established')
	} catch (error) {
		logger.error(`Failed to connect to Redis: ${error}`)
	}
}

const connections = new Set<any>()

const server = app.listen(4000, () => {
	logger.info('Server running on port 4000')

	initRedis()
	cleanupService.start()
})

server.on('connection', connection => {
	connections.add(connection)
	connection.on('close', () => {
		connections.delete(connection)
	})
})

let isShuttingDown = false

const shutdownGracefully = async (signal: string) => {
	if (isShuttingDown) {
		logger.info('Shutdown already in progress...')
		return
	}

	isShuttingDown = true
	logger.info(`${signal} signal received: closing HTTP server...`)

	try {
		logger.info(`Closing ${connections.size} active connections...`)
		for (const connection of connections) {
			connection.destroy()
		}

		logger.info('Closing HTTP server...')
		await new Promise<void>(resolve => {
			server.close(() => {
				logger.info('HTTP server closed')
				resolve()
			})
		})

		logger.info('Stopping cleanup service...')
		cleanupService.stop()

		logger.info('Disconnecting from Redis...')
		await redisService.disconnect()

		process.exit(0)
	} catch (error) {
		logger.error(`Error during shutdown (${signal}): ${error}`)
		process.exit(1)
	}
}

process.on('SIGTERM', () => shutdownGracefully('SIGTERM'))
process.on('SIGINT', () => shutdownGracefully('SIGINT'))

process.on('uncaughtException', error => {
	logger.error(`Uncaught Exception: ${error}`)
	process.exit(1)
})
