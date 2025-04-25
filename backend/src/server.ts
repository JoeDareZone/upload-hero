import cors from 'cors'
import express from 'express'
import fs from 'fs'
import { FINAL_DIR, UPLOAD_DIR } from './constants'
import uploadRoutes from './routes/uploadRoutes'
import cleanupService from './services/cleanupService'
import redisService from './services/redisService'

const app = express()

fs.mkdirSync(UPLOAD_DIR, { recursive: true })
fs.mkdirSync(FINAL_DIR, { recursive: true })

app.use(cors())
app.use(express.json())

app.use('/', uploadRoutes)

const initRedis = async () => {
	try {
		await redisService.connect()
		console.log('Redis connection established')
	} catch (error) {
		console.error('Failed to connect to Redis:', error)
	}
}

const connections = new Set<any>()

const server = app.listen(4000, () => {
	console.log('Server running on port 4000')

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
		console.log('Shutdown already in progress...')
		return
	}

	isShuttingDown = true
	console.log(`${signal} signal received: closing HTTP server...`)

	try {
		console.log(`Closing ${connections.size} active connections...`)
		for (const connection of connections) {
			connection.destroy()
		}

		console.log('Closing HTTP server...')
		await new Promise<void>(resolve => {
			server.close(() => {
				console.log('HTTP server closed')
				resolve()
			})
		})

		console.log('Stopping cleanup service...')
		cleanupService.stop()

		console.log('Disconnecting from Redis...')
		await redisService.disconnect()

		process.exit(0)
	} catch (error) {
		console.error(`Error during shutdown (${signal}):`, error)
		process.exit(1)
	}
}

process.on('SIGTERM', () => shutdownGracefully('SIGTERM'))
process.on('SIGINT', () => shutdownGracefully('SIGINT'))

process.on('uncaughtException', error => {
	console.error('Uncaught Exception:', error)
	process.exit(1)
})
