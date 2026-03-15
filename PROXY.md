# Reverse Proxy and Subdomain Setup (Stingrays HRMS)

This guide configures **Nginx** as a reverse proxy so you can access the app via **subdomains**. The main app is at **https://hrms.stingraysglobal.com**; login and other services use the subdomains below. Only **80, 443, and 22** need to be open; app ports stay bound to localhost.

**Domain used:** `stingraysglobal.com` (config and steps below use this; change if you use a different domain.)

---

## What You Get

| Subdomain            | Service      | Proxies to   |
|----------------------|-------------|--------------|
| **hrms.stingraysglobal.com** | HRMS UI     | localhost:3000 |
| payroll.stingraysglobal.com | Payroll UI  | localhost:3010 |
| employee.stingraysglobal.com | Employee UI | localhost:3001 |
| auth.stingraysglobal.com   | Auth API    | localhost:4001 |
| employee-api.stingraysglobal.com | Employee API | localhost:4000 |
| payroll-api.stingraysglobal.com  | Payroll API  | localhost:4010 |

After setup you can **close** ports 3000, 3001, 3010, 4000, 4001, 4010 in the firewall; only **80** (HTTP), **443** (HTTPS), and **22** (SSH) need to be open.

---

## Prerequisites

- A **domain** you control (e.g. `company.com`).
- **DNS** for that domain pointing to your VPS (see Step 1).
- The app already running on the server (Docker Compose up).
- SSH access to the server.

---

## Step 1: Create DNS A Records (Subdomains)

In your domain’s DNS (where you manage **stingraysglobal.com**), create **A records** that point to your **server’s public IP**:

| Type | Name         | Value        | TTL  | Results in                    |
|------|--------------|-------------|------|-------------------------------|
| A    | hrms         | YOUR_VPS_IP | 300  | hrms.stingraysglobal.com      |
| A    | payroll      | YOUR_VPS_IP | 300  | payroll.stingraysglobal.com   |
| A    | employee     | YOUR_VPS_IP | 300  | employee.stingraysglobal.com  |
| A    | auth         | YOUR_VPS_IP | 300  | auth.stingraysglobal.com      |
| A    | employee-api | YOUR_VPS_IP | 300  | employee-api.stingraysglobal.com |
| A    | payroll-api  | YOUR_VPS_IP | 300  | payroll-api.stingraysglobal.com  |

- **Name**: subdomain only (e.g. `hrms`). Some providers use the full name (e.g. `hrms.stingraysglobal.com`).
- **Value**: your VPS IP (e.g. `107.175.85.91`).

Wait 5–15 minutes for DNS to propagate. Check with:

```bash
dig +short hrms.stingraysglobal.com
dig +short auth.stingraysglobal.com
```

You should see your server IP.

---

## Step 2: Install Nginx and Certbot (Ubuntu/Debian)

On the server:

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

Ensure Nginx is running:

```bash
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

---

## Step 3: Add the Nginx Config

1. Copy the project’s proxy config and open it:

```bash
cd /opt/Stingrays_HRMS
sudo cp proxy/stingrays-hrms.conf /etc/nginx/sites-available/stingrays-hrms
sudo nano /etc/nginx/sites-available/stingrays-hrms
```

2. The bundled config already uses **stingraysglobal.com**. If you use a different domain, replace `stingraysglobal.com` in the config with your domain.

3. Save and exit (Ctrl+O, Enter, Ctrl+X).

4. (Optional) Disable the default Nginx site so it doesn’t take over port 80:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

5. Enable the site and test the config:

```bash
sudo ln -sf /etc/nginx/sites-available/stingrays-hrms /etc/nginx/sites-enabled/
sudo nginx -t
```

If you see `syntax is ok` and `test is successful`, reload Nginx:

```bash
sudo systemctl reload nginx
```

---

## Step 4: Get SSL Certificates (HTTPS)

Certbot will add HTTPS and redirect HTTP → HTTPS for all six subdomains:

```bash
sudo certbot --nginx -d hrms.stingraysglobal.com -d payroll.stingraysglobal.com -d employee.stingraysglobal.com -d auth.stingraysglobal.com -d employee-api.stingraysglobal.com -d payroll-api.stingraysglobal.com
```

Certbot will:

- Ask for an email (for renewal notices).
- Add `listen 443 ssl` and certificate paths to each server block.
- Optionally set up HTTP→HTTPS redirect.

Test again:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Open in a browser: **https://hrms.stingraysglobal.com** — you should see the HRMS app (or login).

---

## Step 5: Point the App at the Subdomains (.env)

The frontends must call the **subdomain URLs** (with HTTPS), not the IP. On the server, edit the project’s `.env`:

```bash
cd /opt/Stingrays_HRMS
nano .env
```

**Remove or comment out** `PUBLIC_HOST=...` and set these for **stingraysglobal.com**:

```env
# Subdomain URLs (HTTPS) — stingraysglobal.com
NEXT_PUBLIC_AUTH_SERVICE_URL=https://auth.stingraysglobal.com
NEXT_PUBLIC_HRMS_URL=https://hrms.stingraysglobal.com
NEXT_PUBLIC_EMPLOYEE_UI_URL=https://employee.stingraysglobal.com
NEXT_PUBLIC_EMPLOYEE_API_URL=https://employee-api.stingraysglobal.com
NEXT_PUBLIC_PAYROLL_URL=https://payroll.stingraysglobal.com
NEXT_PUBLIC_PAYROLL_API_URL=https://payroll-api.stingraysglobal.com
```

Save and exit.

Rebuild the frontends and restart so the new URLs are baked in:

```bash
docker compose build --no-cache hrms-ui payroll-ui employee-ui
docker compose up -d
```

---

## Step 6: Close App Ports in the Firewall

With Nginx proxying to localhost, the app ports no longer need to be open to the internet. Only **80**, **443**, and **22** should be open.

On the server:

```bash
# Remove rules for app ports (adjust if your ufw rules differ)
sudo ufw delete allow 3000
sudo ufw delete allow 3001
sudo ufw delete allow 3010
sudo ufw delete allow 4000
sudo ufw delete allow 4001
sudo ufw delete allow 4010
# If you have both "4001" and "4001/tcp", remove both
sudo ufw delete allow 4010/tcp

# Ensure these stay open
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443

sudo ufw status
sudo ufw reload
```

**Expected:** Only 22, 80, 443 (and their v6 entries) show as ALLOW. Ports 3000, 3001, 3010, 4000, 4001, 4010 should no longer be listed.

---

## Ports Summary

| Port  | Role              | Before proxy     | After proxy        |
|-------|-------------------|------------------|--------------------|
| 22    | SSH               | Open             | **Keep open**      |
| 80    | HTTP (Nginx)      | Open             | **Keep open**      |
| 443   | HTTPS (Nginx)     | Open             | **Keep open**      |
| 3000  | HRMS UI           | Open             | **Close** (Nginx → localhost) |
| 3001  | Employee UI       | Open             | **Close**          |
| 3010  | Payroll UI        | Open             | **Close**          |
| 4000  | Employee API      | Open             | **Close**          |
| 4001  | Auth API          | Open             | **Close**          |
| 4010  | Payroll API       | Open             | **Close**          |

Containers still bind to 3000, 3001, etc. on the host; only the firewall stops the internet from reaching them. Nginx (on 80/443) forwards to `127.0.0.1:3000` etc.

---

## Troubleshooting

- **502 Bad Gateway**  
  Nginx can’t reach the app. Check that the stack is up:  
  `docker compose ps`  
  and that the port in the Nginx config matches (e.g. `proxy_pass http://127.0.0.1:3000;` for hrms).

- **SSL certificate errors**  
  Run again:  
  `sudo certbot --nginx -d hrms.YOUR_DOMAIN ...`  
  and ensure all subdomains are listed.

- **Login or API calls fail after switching to subdomains**  
  Rebuild frontends after changing `.env`:  
  `docker compose build --no-cache hrms-ui payroll-ui employee-ui && docker compose up -d`  
  and hard-refresh the browser (Ctrl+F5).

- **Can’t access by subdomain**  
  Confirm DNS: `dig +short hrms.stingraysglobal.com` → your server IP.  
  Confirm Nginx: `sudo nginx -t` and `curl -I http://127.0.0.1:3000` from the server.

---

## Optional: Redirect HTTP to HTTPS

Certbot usually adds this. If not, inside each `server { listen 80; ... }` block you can add:

```nginx
return 301 https://$host$request_uri;
```

and keep a minimal `listen 80` server that only does this redirect.

---

## Renewing SSL (Let’s Encrypt)

Certificates expire after 90 days. Certbot installs a timer; test renewal with:

```bash
sudo certbot renew --dry-run
```

If that succeeds, automatic renewal is set up.
