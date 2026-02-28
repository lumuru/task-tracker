# QA Task Tracker — Deployment Guide

## Architecture Overview

```
┌─────────────────────────────┐       HTTPS        ┌──────────────────────────┐
│   YOUR DOMAIN (Public)      │  ◄──────────────►  │   USERS / BROWSERS       │
│   e.g. qa.yourdomain.com    │                     └──────────────────────────┘
│                              │
│   Static Files (HTML/JS/CSS)│
│   Served by Nginx / Hosting │
│   (Vite production build)   │
└──────────┬──────────────────┘
           │
           │  API calls: /api/*
           │  Reverse proxy or direct
           │
┌──────────▼──────────────────┐
│   YOUR LOCAL DEVICE          │
│   (Express API Server)       │
│   Port 3001                  │
│                              │
│   ┌────────────────────┐     │
│   │  SQLite Database   │     │
│   │  server/data/      │     │
│   └────────────────────┘     │
└──────────────────────────────┘
```

**Frontend** — Deployed to your domain as static files (HTML, JS, CSS).
**Backend** — Runs on your local machine, exposed via tunnel so the frontend can reach it.

---

## Docker Deployment (Recommended)

The simplest way to deploy is with Docker. A single container builds the React frontend and serves everything (API + UI) from one Express server.

### Prerequisites

- Docker and Docker Compose installed

### Quick Start with Docker Compose

```bash
# Set environment variables (or create a .env file in the project root)
export JWT_SECRET=your-secure-random-secret

# Build and start
docker compose up -d
```

Open http://localhost:3001 — the app serves both the frontend and API.

### Using Docker Directly

```bash
# Build the image
docker build -t qa-tracker .

# Run the container
docker run -d \
  -p 3001:3001 \
  -v ./server/data:/app/server/data \
  -e JWT_SECRET=your-secure-random-secret \
  qa-tracker
```

### Data Persistence

SQLite database files live in `server/data/`. The Docker setup mounts this directory as a volume so data persists across container restarts and rebuilds.

### Optional AI Provider Configuration

To enable AI features, pass the relevant environment variables:

```bash
docker compose up -d \
  -e AI_PROVIDER=anthropic \
  -e ANTHROPIC_API_KEY=sk-ant-...
```

Or add them to a `.env` file in the project root.

### Rebuilding After Updates

```bash
git pull
docker compose up -d --build
```

---

## Manual Deployment

### Prerequisites

- Node.js 18+ installed on your local device
- A domain with hosting that supports static sites (e.g. Vercel, Netlify, Cloudflare Pages, or your own VPS with Nginx)
- A tunneling tool to expose your local server to the internet (e.g. Cloudflare Tunnel, ngrok)

---

## Step 1: Build the Frontend for Production

The Vite dev server and proxy are only for local development. For production, you build static files and configure the API URL.

### 1a. Create environment file

Create `client/.env.production`:

```env
VITE_API_URL=https://api.yourdomain.com
```

Replace `https://api.yourdomain.com` with the public URL that will point to your local server (set up in Step 3).

### 1b. Build

```bash
cd client
npm run build
```

This generates a `client/dist/` folder containing:
- `index.html`
- `assets/` (JS, CSS bundles)

These are the only files you need to deploy to your domain.

---

## Step 2: Set Up the Backend on Your Local Device

### 2a. Install dependencies

```bash
cd server
npm install
```

### 2b. Start the server

```bash
node src/index.js
```

Server starts on `http://localhost:3001`. The SQLite database is stored in `server/data/qa-tracker.db`.

### 2c. (Optional) Keep server running with PM2

```bash
npm install -g pm2
pm2 start server/src/index.js --name qa-tracker-api
pm2 save
pm2 startup   # auto-start on device reboot
```

### 2d. Configure CORS for your domain

Edit `server/src/index.js` to restrict CORS to your domain only:

```js
// Replace: app.use(cors());
// With:
app.use(cors({
  origin: 'https://qa.yourdomain.com',  // your frontend domain
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
```

---

## Step 3: Expose Your Local Server to the Internet

Since the backend runs on your local device, you need a tunnel so the frontend (on your domain) can reach it.

### Option A: Cloudflare Tunnel (Recommended — free, stable, custom domain)

1. Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
2. Authenticate: `cloudflared tunnel login`
3. Create a tunnel:
   ```bash
   cloudflared tunnel create qa-tracker
   ```
4. Configure the tunnel — create `~/.cloudflared/config.yml`:
   ```yaml
   tunnel: qa-tracker
   credentials-file: ~/.cloudflared/<TUNNEL_ID>.json

   ingress:
     - hostname: api.yourdomain.com
       service: http://localhost:3001
     - service: http_status:404
   ```
5. Route DNS:
   ```bash
   cloudflared tunnel route dns qa-tracker api.yourdomain.com
   ```
6. Run the tunnel:
   ```bash
   cloudflared tunnel run qa-tracker
   ```

Your local server is now accessible at `https://api.yourdomain.com`.

### Option B: ngrok (Quick setup, free tier has random URLs)

1. Install ngrok: https://ngrok.com/download
2. Run:
   ```bash
   ngrok http 3001
   ```
3. Use the generated URL (e.g. `https://abc123.ngrok-free.app`) as your `VITE_API_URL` in Step 1a.

> **Note:** ngrok free tier URLs change every restart. For a stable URL, use a paid plan or Cloudflare Tunnel.

---

## Step 4: Deploy the Frontend to Your Domain

### Option A: Static hosting (Vercel / Netlify / Cloudflare Pages)

1. Push the repo to GitHub
2. Connect your hosting provider to the repo
3. Set build settings:
   - **Build command:** `cd client && npm run build`
   - **Output directory:** `client/dist`
   - **Environment variable:** `VITE_API_URL` = `https://api.yourdomain.com`
4. Set your custom domain in the hosting provider's dashboard

### Option B: VPS with Nginx

1. Copy `client/dist/` to your server (e.g. `/var/www/qa-tracker/`)
2. Nginx config:

```nginx
server {
    listen 443 ssl;
    server_name qa.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/qa.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/qa.yourdomain.com/privkey.pem;

    root /var/www/qa-tracker;
    index index.html;

    # SPA: all routes serve index.html (React Router handles routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # (Optional) Proxy API through Nginx instead of direct tunnel access
    # Uncomment if you want the frontend and API on the same domain
    # location /api/ {
    #     proxy_pass https://api.yourdomain.com;
    #     proxy_set_header Host $host;
    #     proxy_set_header X-Real-IP $remote_addr;
    # }
}
```

3. Reload Nginx: `sudo nginx -t && sudo systemctl reload nginx`

---

## Step 5: Verify the Deployment

1. Open `https://qa.yourdomain.com` in your browser
2. Open DevTools → Network tab
3. Confirm API calls go to `https://api.yourdomain.com/api/...` and return JSON (not HTML or errors)
4. Test all pages: Dashboard, Projects, Test Scripts, Test Cases, Test Runs, Bugs, Settings

---

## Summary of URLs

| Component       | URL                              | Where it runs    |
|-----------------|----------------------------------|------------------|
| Frontend (UI)   | `https://qa.yourdomain.com`      | Your domain host |
| Backend (API)   | `https://api.yourdomain.com`     | Your local device via tunnel |
| Database        | `server/data/qa-tracker.db`      | Your local device |

---

## Environment Variables Reference

| Variable        | Where          | Purpose                          | Example                          |
|-----------------|----------------|----------------------------------|----------------------------------|
| `VITE_API_URL`  | Client build   | Backend API base URL             | `https://api.yourdomain.com`     |
| `PORT`          | Server runtime | Express server port (default 3001)| `3001`                          |

---

## Keeping It Running

- **Server process**: Use PM2 (`pm2 start`) to keep the Express server running and auto-restart on crashes/reboots
- **Tunnel process**: Use `cloudflared service install` to run the tunnel as a system service
- **Database backups**: Periodically copy `server/data/qa-tracker.db` to a safe location

---

## Security Considerations

- Restrict CORS to your frontend domain only (see Step 2d)
- Use HTTPS for both frontend and tunnel (Cloudflare Tunnel provides this automatically)
- Consider adding authentication to the API if accessible from the internet
- The SQLite database file contains all your data — protect it and back it up regularly
