# SocialApp Backend Deployment

## Production Runbook (College Server)

This document covers stage 3 readiness: production mode, PM2, HTTPS, domain routing, and local MongoDB usage.

## 1) Prerequisites

- Linux server with Node.js 20+
- MongoDB installed on the same server (local Mongo, not cloud)
- Nginx installed for HTTPS and reverse proxy
- Domain configured to point to server IP
- PM2 installed globally:

```bash
npm i -g pm2
```

## 2) Environment

1. Copy `.env.example` to `.env`.
2. Fill real values.
3. Use local MongoDB URI (example):

```env
MONGO_URI=mongodb://app_user:strong_password@127.0.0.1:27017/socialapp_prod?authSource=admin
```

Required production env keys:

- `NODE_ENV=production`
- `PORT`
- `BASE_URL` (https URL)
- `FRONTEND_URL` (https URL)
- `MONGO_URI` (local server mongo)
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `GOOGLE_CLIENT_ID` (if Google signin is enabled)
- `OPENAI_API_KEY` (if AI endpoint is enabled)
- `OPENAI_MODEL` (recommended: `gpt-4o-mini`)
- `AI_RATE_LIMIT_PER_HOUR`
- `AI_CACHE_TTL_SECONDS`
- `AI_MOCK_MODE=false` in production

## 3) Build and run with PM2

From backend project directory:

```bash
npm ci
npm run build
npm run pm2:start
pm2 save
pm2 startup
```

Useful commands:

```bash
npm run pm2:logs
npm run pm2:restart
npm run pm2:stop
```

## 4) Nginx reverse proxy and HTTPS

Use Nginx to expose backend on domain (no port in URL) and terminate TLS.

Example Nginx location block:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:5001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /socket.io/ {
    proxy_pass http://127.0.0.1:5001/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
}
```

Enable HTTPS with certbot (or org certificate), then force redirect HTTP -> HTTPS.

## 5) Production checklist

- [ ] App runs with `NODE_ENV=production`
- [ ] Backend process managed by PM2 and survives terminal close/reboot
- [ ] Domain works without explicit port
- [ ] HTTPS enabled for backend routes and socket connection
- [ ] MongoDB is local on server (not Atlas/cloud)
- [ ] Mongo auth enabled (username/password)
- [ ] `.env` created from `.env.example` and secrets are not committed
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] `/api-docs` accessible in production
- [ ] `GET /api/posts?limit=10&skip=0` returns paginated payload
- [ ] `GET /api/auth/me` works with bearer token
- [ ] Socket handshake works over `wss://your-domain.example/socket.io/`

## 6) Smoke verification

After deploy, verify:

```bash
curl -i https://your-domain.example/
curl -i "https://your-domain.example/api/posts?limit=10&skip=0"
curl -i https://your-domain.example/api-docs/
pm2 status
```

Auth + profile smoke:

```bash
# login and extract token manually from response
curl -i -X POST https://your-domain.example/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-user@example.com","password":"your-password"}'

# then verify protected profile route
curl -i https://your-domain.example/api/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

Socket smoke (from browser console or test client):

```javascript
const s = io("https://your-domain.example", {
  transports: ["websocket"],
  auth: { token: "<ACCESS_TOKEN>" },
});
s.on("connect", () => console.log("socket connected", s.id));
```
