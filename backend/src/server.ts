import cors from 'cors'
import express from 'express'

const app = express()

app.use(cors())
app.use(express.json())

app.get('/ping', (req, res) => {
	res.send('pong')
})

app.listen(4000, () => console.log('Server running on port 4000'))
