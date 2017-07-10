const http = require('http')
const path = require('path')
const opn = require('opn');
const express = require('express')
const app = express()
require('dotenv').config()

app.use(express.static(path.join(__dirname, '/../dist')))

const router = express.Router({ strict: true })

router.get('*', (req, res) => {
  res.sendFile(path.join(__dirname + '/../dist/index.html'))
})

app.use(router)

const server = http.createServer(app)
server.listen(process.env.DEV_PORT, () => {
  console.log('Dev server running')
})
