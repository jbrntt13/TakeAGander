# 🪿 Goose Cam Setup Guide

## Quick Overview

```
Tapo Camera (RTSP) → go2rtc (converts stream) → Nginx (serves webpage) → Cloudflare Tunnel (public URL)
```

Everything runs on peanut via Docker.

---

## Step 1: Copy Files to Peanut

Copy this entire `goosecam` folder to peanut:

```bash
scp -r goosecam/ kryze@192.168.179.200:/home/kryze/goosecam/
```

Or if you're already on peanut, just create `/home/kryze/goosecam/` and place the files there.

Your folder structure should look like:

```
/home/kryze/goosecam/
├── docker-compose.yml
├── go2rtc.yaml
├── nginx.conf
└── www/
    └── index.html
```

---

## Step 2: Configure Credentials

Copy the example environment file and fill in your camera credentials:

```bash
cd /home/kryze/goosecam
cp .env.example .env
nano .env
```

Set your RTSP username, password, and camera IP address in `.env`. These get
passed into the go2rtc container automatically.

> **Note:** `.env` is gitignored and will never be committed. Keep your
> credentials there, not in `go2rtc.yaml`.

---

## Step 3: Start go2rtc + Nginx

```bash
docker compose up -d
```

Test locally:
- go2rtc admin UI: http://192.168.179.200:1984
- Goose cam webpage: http://192.168.179.200:8080

If you see the go2rtc admin UI and can play the "goose" stream there, the RTSP
connection is working.

---

## Step 4: Activate the Stream on the Webpage

Once go2rtc is confirmed working, edit `www/index.html` and find this line near
the bottom:

```js
// Uncomment the line below once go2rtc is running:
// activateStream();
```

Uncomment `activateStream();` so it reads:

```js
activateStream();
```

Then restart nginx (or just hard-refresh the page):

```bash
docker compose restart nginx
```

---

## Step 5: Set Up Cloudflare Tunnel

### 4a: Install cloudflared on peanut

```bash
# Download and install
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
rm cloudflared.deb
```

### 4b: Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This opens a browser. Pick the domain you want to use (e.g., your Bluff
Development domain or whatever you've got on Cloudflare).

### 4c: Create the tunnel

```bash
cloudflared tunnel create goosecam
```

This creates a tunnel and outputs a tunnel ID (a UUID). Note it down.

### 4d: Configure DNS

Replace YOUR_SUBDOMAIN and YOUR_DOMAIN with what you want (e.g., goose.yourdomain.com):

```bash
cloudflared tunnel route dns goosecam YOUR_SUBDOMAIN.YOUR_DOMAIN
```

For example:
```bash
cloudflared tunnel route dns goosecam goose.bluffdevelopment.com
```

### 4e: Create the tunnel config

```bash
mkdir -p ~/.cloudflared
nano ~/.cloudflared/config.yml
```

Paste this (replace TUNNEL_ID with the UUID from step 4c):

```yaml
tunnel: TUNNEL_ID
credentials-file: /home/kryze/.cloudflared/TUNNEL_ID.json

ingress:
  - hostname: YOUR_SUBDOMAIN.YOUR_DOMAIN
    service: http://localhost:8080
  - service: http_status:404
```

### 4f: Run the tunnel

Test it first:
```bash
cloudflared tunnel run goosecam
```

If it works, hit your public URL in a browser. You should see the goose cam!

### 4g: Run as a service (so it survives reboots)

```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

## Step 6: You're Live!

Visit your URL (e.g., goose.yourdomain.com) from any device, anywhere. Your
goose is now internet famous.

---

## Troubleshooting

**Stream not loading in browser?**
- Check go2rtc admin at http://192.168.179.200:1984 first
- Make sure the "goose" stream shows up and plays there
- Check that nginx can reach go2rtc (they share the host network)

**Cloudflare tunnel not connecting?**
- Run `cloudflared tunnel run goosecam` manually to see errors
- Make sure your domain's DNS is on Cloudflare (orange cloud)
- Check that port 8080 is what nginx is listening on

**Camera stream dropping?**
- Tapo cameras sometimes drop RTSP connections under load
- go2rtc handles reconnection automatically
- If persistent, try using stream2 (lower res) in go2rtc.yaml

**nginx can't reach go2rtc?**
- Since go2rtc uses network_mode: host, nginx (in a regular container)
  needs to reach it via `host.docker.internal` or the host IP
- If `host.docker.internal` doesn't resolve, replace it in nginx.conf
  with `192.168.179.200`

---

## Optional: Nginx on Host Network Too

If you have trouble with the proxy setup, you can switch nginx to host
network mode as well. Change docker-compose.yml:

```yaml
  nginx:
    image: nginx:alpine
    container_name: goosecam-nginx
    restart: unless-stopped
    network_mode: host
    volumes:
      - ./www:/usr/share/nginx/html:ro
      - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
```

And update nginx.conf to use `proxy_pass http://127.0.0.1:1984/...` instead.
Make sure nothing else is using port 80 on peanut though.
