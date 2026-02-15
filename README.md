# AlfaDAO News Server

WebSocket proxy server that streams crypto news from Tree of Alpha to the AlfaDAO frontend.

## Features

- 🌲 Connects to Tree of Alpha WebSocket API
- 📰 Auto-categorizes news (Launch, Airdrop, Listing, Security, General)
- 🔍 Extracts contract addresses and token symbols
- 🔄 Auto-reconnects on connection loss
- 💚 Health check endpoint
- 📊 Real-time statistics

## Quick Start

### Local Development

1. **Install dependencies:**
   ```bash
   cd alfadao-news-server
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   # or for auto-reload during development:
   npm run dev
   ```

3. **Server will run on:**
   - WebSocket: `ws://localhost:7777/ws`
   - Health check: `http://localhost:7777/health`

### Connect Frontend

In your AlfaDAO project, the news panel is already configured to connect to `ws://127.0.0.1:7777/ws` for local development.

Just make sure this news server is running, then start your Next.js app:

```bash
cd ../alfadao-audit
npm run dev
```

Open the live feed panel on the right side of the page - it should now show live news!

## Deployment to Railway

### Option 1: Railway CLI

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login and deploy:**
   ```bash
   railway login
   railway init
   railway up
   ```

3. **Get your deployment URL:**
   ```bash
   railway domain
   ```

4. **Update AlfaDAO frontend** `.env` file:
   ```env
   NEXT_PUBLIC_NEWS_WS_URL=wss://your-app.up.railway.app/ws
   ```

### Option 2: GitHub + Railway Dashboard

1. **Create a GitHub repository** for this news server
2. **Push the code:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Tree of Alpha news server"
   git remote add origin https://github.com/yourusername/alfadao-news-server.git
   git push -u origin main
   ```

3. **Deploy on Railway:**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your news server repository
   - Railway will auto-detect and deploy

4. **Add a custom domain** (optional):
   - In Railway dashboard, go to Settings → Domains
   - Generate a Railway domain or add your custom domain

5. **Update frontend:**
   ```env
   NEXT_PUBLIC_NEWS_WS_URL=wss://your-railway-app.up.railway.app/ws
   ```

### Option 3: Deploy to Render, Heroku, etc.

The server works on any platform that supports Node.js WebSockets. Just set the `PORT` environment variable.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Port for WebSocket server | `7777` |

## API Format

The server sends news items in this format:

```json
{
  "id": "1234567890",
  "source": "tree_of_alpha",
  "title": "@username",
  "body": "Tweet text...",
  "url": "https://twitter.com/...",
  "timestamp": "2026-02-15T00:00:00Z",
  "category": "launch",
  "contracts": ["0x..."],
  "tokens": ["BTC", "ETH"]
}
```

Categories: `launch`, `airdrop`, `listing`, `security`, `general`

## Monitoring

### Check Health

```bash
curl http://localhost:7777/health
```

Response:
```json
{
  "status": "ok",
  "clients": 2,
  "uptime": 3600
}
```

### View Logs

The server logs:
- Client connections/disconnections
- News items received
- Statistics every 60 seconds

## Troubleshooting

### Connection Issues

**Problem:** "Failed to connect to Tree of Alpha"

**Solution:**
- Check your internet connection
- Tree of Alpha API might be temporarily down
- The server will auto-reconnect every 5 seconds

### No News Items

**Problem:** Connected but no news appearing

**Solution:**
- Tree of Alpha streams tweets in real-time
- Wait a few minutes for crypto news to come in
- Check the server logs to see if messages are being received

### Frontend Can't Connect

**Problem:** AlfaDAO frontend shows "Connecting..."

**Solution:**
- Make sure the news server is running (`npm start`)
- Check the WebSocket URL matches in both places
- For local dev: Should be `ws://127.0.0.1:7777/ws`
- Check browser console for WebSocket errors

## Architecture

```
Tree of Alpha API
       ↓ (WebSocket)
  News Server (this)
       ↓ (WebSocket)
  AlfaDAO Frontend
```

## License

MIT

## Support

For issues or questions:
- Check the server logs
- Verify Tree of Alpha API is accessible
- Ensure WebSocket connections aren't blocked by firewall
