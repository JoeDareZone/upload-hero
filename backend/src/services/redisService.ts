import { createClient, RedisClientType } from 'redis'
import { CHUNK_CACHE_TTL } from '../constants'

class RedisService {
	private client: RedisClientType
	private isConnected = false

	constructor() {
		this.client = createClient({
			url: process.env.REDIS_URL || 'redis://localhost:6379',
		})

		this.client.on('error', (err: Error) => {
			console.error('Redis client error:', err)
			this.isConnected = false
		})

		this.client.on('connect', () => {
			// Only log in non-test environment
			if (process.env.NODE_ENV !== 'test') {
				console.log('Connected to Redis')
			}
			this.isConnected = true
		})
	}

	async connect() {
		if (!this.isConnected) {
			await this.client.connect()
		}
	}

	async disconnect() {
		if (this.isConnected) {
			await this.client.quit()
			this.isConnected = false
		}
	}
	async setChunkStatus(uploadId: string, chunkIndex: number, status: string) {
		// Make sure we're connected before proceeding
		if (!this.isConnected) {
			await this.connect()
		}

		console.log(
			`Setting chunk status for upload ${uploadId}, chunk ${chunkIndex} to ${status}`
		)
		const key = `upload:${uploadId}:chunk:${chunkIndex}`
		await this.client.set(key, status)
		await this.client.expire(key, CHUNK_CACHE_TTL)
	}

	async getChunkStatus(uploadId: string, chunkIndex: number) {
		// Make sure we're connected before proceeding
		if (!this.isConnected) {
			await this.connect()
		}

		console.log(
			`Getting chunk status for upload ${uploadId}, chunk ${chunkIndex}`
		)
		const key = `upload:${uploadId}:chunk:${chunkIndex}`
		return await this.client.get(key)
	}

	async updateChunksList(uploadId: string, chunkIndex: number) {
		// Make sure we're connected before proceeding
		if (!this.isConnected) {
			await this.connect()
		}

		console.log(
			`Updating chunks list for upload ${uploadId} with chunk ${chunkIndex}`
		)
		const key = `upload:${uploadId}:chunks`
		await this.client.sAdd(key, chunkIndex.toString())
		await this.client.expire(key, CHUNK_CACHE_TTL)
	}

	async getChunksList(uploadId: string): Promise<number[]> {
		// Make sure we're connected before proceeding
		if (!this.isConnected) {
			await this.connect()
		}

		console.log(`Getting chunks list for upload ${uploadId}`)
		const key = `upload:${uploadId}:chunks`
		const chunks = await this.client.sMembers(key)
		return chunks.map((chunk: string) => parseInt(chunk, 10))
	}

	async storeUploadMetadata(uploadId: string, metadata: Record<string, any>) {
		// Make sure we're connected before proceeding
		if (!this.isConnected) {
			await this.connect()
		}

		console.log(`Storing metadata for upload ${uploadId}`)
		const key = `upload:${uploadId}:metadata`
		await this.client.set(key, JSON.stringify(metadata))
		await this.client.expire(key, CHUNK_CACHE_TTL)
	}

	async getUploadMetadata(
		uploadId: string
	): Promise<Record<string, any> | null> {
		// Make sure we're connected before proceeding
		if (!this.isConnected) {
			await this.connect()
		}

		console.log(`Getting metadata for upload ${uploadId}`)
		const key = `upload:${uploadId}:metadata`
		const data = await this.client.get(key)
		return data ? JSON.parse(data) : null
	}

	async updateChunksReceived(uploadId: string, count: number) {
		// Make sure we're connected before proceeding
		if (!this.isConnected) {
			await this.connect()
		}

		console.log(
			`Updating chunks received count for upload ${uploadId} to ${count}`
		)
		const key = `upload:${uploadId}:chunksReceived`
		await this.client.set(key, count.toString())
		await this.client.expire(key, CHUNK_CACHE_TTL)
	}

	async getChunksReceived(uploadId: string): Promise<number> {
		// Make sure we're connected before proceeding
		if (!this.isConnected) {
			await this.connect()
		}

		console.log(`Getting chunks received count for upload ${uploadId}`)
		const key = `upload:${uploadId}:chunksReceived`
		const count = await this.client.get(key)
		return count ? parseInt(count, 10) : 0
	}

	async clearUploadData(uploadId: string) {
		try {
			// Make sure we're connected before proceeding
			if (!this.isConnected) {
				await this.connect()
			}

			const chunkIndices = await this.getChunksList(uploadId)

			for (const index of chunkIndices) {
				await this.client.del(`upload:${uploadId}:chunk:${index}`)
			}

			await this.client.del(`upload:${uploadId}:chunks`)
			await this.client.del(`upload:${uploadId}:metadata`)
			await this.client.del(`upload:${uploadId}:chunksReceived`)

			console.log(`Cleared Redis data for upload ${uploadId}`)
		} catch (error) {
			console.error(
				`Error clearing Redis data for upload ${uploadId}:`,
				error
			)
		}
	}
}

const redisService = new RedisService()
export default redisService
