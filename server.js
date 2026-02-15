#!/usr/bin/env node
/**
 * AlfaDAO News WebSocket Server
 * Proxies Tree of Alpha news feed to AlfaDAO frontend
 */

import WebSocket, { WebSocketServer } from 'ws'
import { createServer } from 'http'
import dotenv from 'dotenv'

dotenv.config()

const PORT = process.env.PORT || 7777
const TREE_OF_ALPHA_API_KEY = process.env.TREE_OF_ALPHA_API_KEY || ''
const TREE_OF_ALPHA_WS = TREE_OF_ALPHA_API_KEY
  ? `wss://news.treeofalpha.com/ws?api-key=${TREE_OF_ALPHA_API_KEY}`
  : 'wss://news.treeofalpha.com/ws'

// Create HTTP server for health checks
const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      status: 'ok',
      clients: wss.clients.size,
      uptime: process.uptime()
    }))
  } else {
    res.writeHead(404)
    res.end()
  }
})

// Create WebSocket server
const wss = new WebSocketServer({
  server: httpServer,
  path: '/ws'
})

let toaConnection = null
let reconnectInterval = null
let messageCount = 0
let lastMessageTime = null

/**
 * Connect to Tree of Alpha WebSocket API
 */
function connectToTreeOfAlpha() {
  if (toaConnection?.readyState === WebSocket.OPEN) {
    return
  }

  console.log('🔌 Connecting to Tree of Alpha...')

  try {
    toaConnection = new WebSocket(TREE_OF_ALPHA_WS, {
      headers: {
        'User-Agent': 'AlfaDAO-News-Aggregator/1.0'
      }
    })

    toaConnection.on('open', () => {
      console.log('✅ Connected to Tree of Alpha')
      if (!TREE_OF_ALPHA_API_KEY) {
        console.log('⚠️  No API key - using free tier (may have delays)')
      }
    })

    toaConnection.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString())

        // Tree of Alpha sends news items directly
        if (message.type === 'news' || message.text) {
          messageCount++
          lastMessageTime = new Date()

          // Transform to AlfaDAO news format
          const newsItem = transformNewsToFormat(message)

          // Broadcast to all connected clients
          broadcastToClients(newsItem)

          const preview = (message.text || message.title || '').substring(0, 60)
          console.log(`📰 [${messageCount}] ${preview}...`)
        }
      } catch (error) {
        console.error('❌ Error processing message:', error)
        console.error('Raw message:', data.toString())
      }
    })

    toaConnection.on('error', (error) => {
      console.error('❌ Tree of Alpha error:', error.message)
    })

    toaConnection.on('close', () => {
      console.log('🔌 Tree of Alpha connection closed, reconnecting in 5s...')
      setTimeout(connectToTreeOfAlpha, 5000)
    })
  } catch (error) {
    console.error('❌ Failed to connect:', error)
    setTimeout(connectToTreeOfAlpha, 5000)
  }
}

/**
 * Transform Tree of Alpha news to AlfaDAO format
 */
function transformNewsToFormat(message) {
  const text = (message.text || message.title || '').toLowerCase()
  const fullText = message.text || message.title || ''

  // Auto-categorize based on keywords
  let category = 'general'
  if (text.includes('launch') || text.includes('launching')) {
    category = 'launch'
  } else if (text.includes('airdrop')) {
    category = 'airdrop'
  } else if (text.includes('listing') || text.includes('listed on')) {
    category = 'listing'
  } else if (text.includes('hack') || text.includes('exploit') || text.includes('vulnerability') || text.includes('alert')) {
    category = 'security'
  }

  // Extract contract addresses (0x...)
  const contractRegex = /0x[a-fA-F0-9]{40}/g
  const contracts = fullText.match(contractRegex) || []

  // Extract token symbols ($SYMBOL)
  const tokenRegex = /\$([A-Z]{2,10})\b/g
  const tokenMatches = [...fullText.matchAll(tokenRegex)]
  const tokens = tokenMatches.map(match => match[1])

  return {
    id: message.id || message.tweetId || `news-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    source: message.source || 'tree_of_alpha',
    title: message.title || (message.user ? `@${message.user}` : null),
    body: message.text || message.body || '',
    url: message.url || message.link || null,
    timestamp: message.timestamp || message.createdAt || new Date().toISOString(),
    category,
    contracts: [...new Set(contracts)],
    tokens: [...new Set(tokens)]
  }
}

/**
 * Broadcast news item to all connected clients
 */
function broadcastToClients(newsItem) {
  const message = JSON.stringify(newsItem)

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message)
      } catch (error) {
        console.error('❌ Error sending to client:', error)
      }
    }
  })
}

/**
 * Handle client connections
 */
wss.on('connection', (ws, req) => {
  const clientIp = req.socket.remoteAddress
  console.log(`👤 Client connected from ${clientIp} (Total: ${wss.clients.size})`)

  ws.on('close', () => {
    console.log(`👋 Client disconnected (Remaining: ${wss.clients.size})`)
  })

  ws.on('error', (error) => {
    console.error('❌ Client error:', error)
  })

  // Send welcome message
  ws.send(JSON.stringify({
    id: 'welcome',
    source: 'system',
    title: 'Connected',
    body: 'Connected to AlfaDAO News Server. Streaming live crypto news from Tree of Alpha.',
    url: null,
    timestamp: new Date().toISOString(),
    category: 'general',
    contracts: [],
    tokens: []
  }))
})

// Start server
httpServer.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║   🌲 AlfaDAO News Server (Tree of Alpha) ║
╠═══════════════════════════════════════════╣
║   WebSocket: ws://localhost:${PORT}/ws      ║
║   Health:    http://localhost:${PORT}/health║
╚═══════════════════════════════════════════╝
  `)

  // Connect to Tree of Alpha
  connectToTreeOfAlpha()

  // Log stats every minute
  setInterval(() => {
    const uptime = Math.floor(process.uptime())
    const lastMsg = lastMessageTime
      ? `${Math.floor((Date.now() - lastMessageTime) / 1000)}s ago`
      : 'never'

    console.log(`📊 Stats: ${wss.clients.size} clients | ${messageCount} messages | Last: ${lastMsg} | Uptime: ${uptime}s`)
  }, 60000)
})

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...')
  toaConnection?.close()
  wss.close(() => {
    httpServer.close(() => {
      process.exit(0)
    })
  })
})

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...')
  toaConnection?.close()
  wss.close(() => {
    httpServer.close(() => {
      process.exit(0)
    })
  })
})
