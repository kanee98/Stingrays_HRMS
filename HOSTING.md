# Hosting Stingrays HRMS on a VPS (Step-by-Step with PuTTY)

This guide deploys the full HRMS stack on **Ubuntu** and uses your **VPS IP** (no domain yet). Use PuTTY to connect from Windows.

---

## What You Need

- A VPS running **Ubuntu 22.04** (or 24.04).
- Your VPS **IP address** (e.g. `203.0.113.50`) — we use the IP for everything for now.
- **PuTTY** on your Windows PC ([download](https://www.putty.org/)).

---

## Step 1: Connect to Your VPS with PuTTY

1. Open **PuTTY**.
2. **Host Name:** enter your VPS IP (e.g. `203.0.113.50`).
3. **Port:** `22`.
4. **Connection type:** SSH.
5. Click **Open**.
6. When asked, log in as **root** (or your admin user, e.g. `ubuntu`).
7. If it’s the first time, accept the host key by clicking **Yes**.

You should see a terminal prompt (e.g. `root@your-vps:~#`).

---

## Step 2: Update the Server and Install Docker

Run these commands one by one (copy-paste into the PuTTY window).

```bash
# Update packages
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Check
docker --version
docker compose version
```

---

## Step 3: Get the Project onto the VPS

**Option A – Clone with Git (recommended)**

```bash
# Install Git if needed
sudo apt install -y git

# Go to a folder (e.g. home)
cd ~

# Clone your repo (replace with your actual repo URL)
git clone https://github.com/YOUR_USERNAME/Stingrays_HRMS.git
cd Stingrays_HRMS
```

**Option B – Upload with SCP/WinSCP**

1. Install [WinSCP](https://winscp.net/) on your PC.
2. Connect to the VPS (same IP, user, SSH).
3. Upload the whole **Stingrays_HRMS** folder (e.g. to `/root/Stingrays_HRMS` or `/home/ubuntu/Stingrays_HRMS`).
4. In PuTTY, go to that folder:  
   `cd /root/Stingrays_HRMS` (or the path you used).

---

## Step 4: Note Your VPS IP

The app runs in the **browser**, so every URL must use your **VPS IP** (not `localhost`).  
Use the same IP everywhere, e.g. `203.0.113.50` → `http://203.0.113.50`.

No `.env` is required for this; we’ll put the IP into `docker-compose.yml` in the next step.

---

## Step 5: Start the Database First

The app needs the database and network to exist before the main stack.

```bash
cd ~/Stingrays_HRMS

# Create network and start DB + init
sudo docker compose -f docker-compose.db.yml up -d

# Wait 2–3 minutes, then check
sudo docker compose -f docker-compose.db.yml ps
```

Wait until **stingrays-mssql** is **healthy** and **stingrays-mssql-init** has **exited (0)**. Then continue.

---

## Step 6: Point the App at Your VPS IP and Build

The browser must call your **VPS IP**, not localhost. Replace `http://localhost` with `http://YOUR_VPS_IP` in `docker-compose.yml`.

**Option A – Script (easiest)**

```bash
cd ~/Stingrays_HRMS
chmod +x scripts/set-vps-url.sh
./scripts/set-vps-url.sh http://YOUR_VPS_IP
```
Use your real IP, e.g. `./scripts/set-vps-url.sh http://203.0.113.50`.

**Option B – Edit by hand**

```bash
nano docker-compose.yml
```

Replace **every** `http://localhost` with `http://YOUR_VPS_IP` (e.g. `http://203.0.113.50`). So:

- `http://localhost:4001` → `http://203.0.113.50:4001`
- `http://localhost:3000` → `http://203.0.113.50:3000`
- …and the same for 3001, 4000, 4010, 3010.

Save: **Ctrl+O**, **Enter**, **Ctrl+X**.

Then build and start the app stack:

```bash
cd ~/Stingrays_HRMS
sudo docker compose build --no-cache
sudo docker compose up -d
```

This can take several minutes the first time.

---

## Step 7: Open Firewall Ports

Allow traffic to the app and database (only if you need direct access to SQL from outside; otherwise you can skip 1433).

```bash
sudo ufw allow 22
sudo ufw allow 3000
sudo ufw allow 3001
sudo ufw allow 3010
sudo ufw allow 4000
sudo ufw allow 4001
sudo ufw allow 4010
# Optional: only if you need external SQL access
# sudo ufw allow 1433
sudo ufw enable
sudo ufw status
```

---

## Step 8: Check That Everything Is Running

```bash
sudo docker compose ps
```

You should see **hrms-ui**, **employee-ui**, **payroll-ui**, **auth-service**, **employee-api**, **payroll-api** as **Up**.  
(DB is managed by `docker-compose.db.yml`.)

From your **PC browser** open (use your real VPS IP). **Use a colon before the port, not a slash:**

- **Main HRMS (login):** `http://YOUR_VPS_IP:3000`  ← correct  
  (Wrong: `http://YOUR_VPS_IP/3000` — that won’t load.)

- Employee onboarding: `http://YOUR_VPS_IP:3001`
- Payroll: `http://YOUR_VPS_IP:3010`

Log in with your admin user (e.g. `admin@stingrays.com` / `Admin@123` after a password reset).

---

## Step 9: (Optional for Now) Change Default Passwords

When you’re ready to harden things:

1. **DB password** – In `docker-compose.db.yml` and `docker-compose.yml`, replace `Kanishka#9810` with a strong password, then recreate the DB and app stacks.
2. **JWT secret** – In `docker-compose.yml`, under **auth-service** → **environment**, set a long random `JWT_SECRET`, then: `sudo docker compose up -d auth-service`.
3. **Admin password** – From project root (DB must be up):  
   `cd auth-service && sudo docker compose run --rm -e DB_HOST=stingrays-mssql -e DB_PASSWORD=Kanishka#9810 auth-service node scripts/reset-admin-password.js`

---

## Step 10: Auto-Start After Reboot (Optional)

So the stack starts again after a server restart:

```bash
# Create a systemd service
sudo nano /etc/systemd/system/stingrays-hrms.service
```

Paste (adjust paths and user if needed):

```ini
[Unit]
Description=Stingrays HRMS Stack
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/root/Stingrays_HRMS
ExecStart=/usr/bin/docker compose -f docker-compose.db.yml up -d && /usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down && /usr/bin/docker compose -f docker-compose.db.yml down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Enable and (optionally) start it now:

```bash
sudo systemctl daemon-reload
sudo systemctl enable stingrays-hrms.service
# sudo systemctl start stingrays-hrms.service
```

---

## Updating the App Later

After you change code (e.g. pull from Git):

```bash
cd ~/Stingrays_HRMS
git pull
sudo docker compose build --no-cache
sudo docker compose up -d
```

If you changed **only** the app (not the DB), you don’t need to run `docker-compose.db.yml` again.

---

## Viewing the Database with SQL Server

The app uses **SQL Server** in the `stingrays-mssql` container. Database name: **StingraysHRMS**.

### Option 1: From your Windows PC (SSMS or Azure Data Studio)

1. **Install a client** (pick one):
   - **SQL Server Management Studio (SSMS)** – [Download](https://learn.microsoft.com/en-us/sql/ssms/download-sql-server-management-studio-ssms)
   - **Azure Data Studio** – [Download](https://learn.microsoft.com/en-us/sql/azure-data-studio/download-azure-data-studio)

2. **Connect** with these settings:

   | Setting    | Value |
   |-----------|--------|
   | Server    | Your VPS IP (e.g. `107.175.85.91`) or `localhost` if DB runs on your machine |
   | Port      | `1433` (or leave blank if your client uses 1433 by default; in SSMS use `IP,1433`) |
   | Authentication | SQL Server Authentication |
   | Login     | `sa` |
   | Password  | `Kanishka#9810` (or whatever you set in `docker-compose.db.yml`) |

   In **SSMS**, Server name: `107.175.85.91,1433` (IP comma port).  
   In **Azure Data Studio**, use the same server and port in the connection form.

3. **Open the database:** after connecting, expand **Databases** → **StingraysHRMS** to see tables (Users, Roles, Employees, Contracts, etc.).

**If you’re connecting to the VPS:** open **port 1433** in the VPS firewall and in your cloud provider’s security group:

```bash
sudo ufw allow 1433
sudo ufw reload
```

### Option 2: From the VPS (command line with sqlcmd)

Run a one-off command inside the SQL Server container:

```bash
cd /opt/Stingrays_HRMS   # or your project path
docker exec -it stingrays-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Kanishka#9810' -C -d StingraysHRMS -Q "SELECT * FROM Users"
```

- `-d StingraysHRMS` uses that database.
- Change the `-Q "..."` query to run other SQL (e.g. `SELECT * FROM Employees`).
- For an interactive session, use `-Q` without a query or run:  
  `docker exec -it stingrays-mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'Kanishka#9810' -C -d StingraysHRMS`  
  then type SQL and run with `GO`.

---

## Useful Commands

| Task | Command |
|------|--------|
| View logs (all) | `sudo docker compose logs -f` |
| Logs for one service | `sudo docker compose logs -f hrms-ui` |
| Stop app stack | `sudo docker compose down` |
| Stop DB stack | `sudo docker compose -f docker-compose.db.yml down` |
| Restart one service | `sudo docker compose restart auth-service` |
| List running containers | `sudo docker compose ps` |

---

## Troubleshooting

- **Can’t open the site in browser**  
  - Check firewall: `sudo ufw status`  
  - Check containers: `sudo docker compose ps`  
  - Check logs: `sudo docker compose logs hrms-ui`

- **Login works locally but “Failed to fetch” on the server**  
  - The frontend is built with the auth URL **at build time**. If the image was built with `localhost`, the browser (on the user’s PC) tries to call `localhost:4001` and fails.  
  - **Fix:** Replace all `http://localhost` with your VPS IP in `docker-compose.yml` (e.g. run `./scripts/set-vps-url.sh http://107.175.85.91`), then **rebuild and restart**:  
    `sudo docker compose build --no-cache && sudo docker compose up -d`  
  - The compose file now passes these URLs as **build args**, so the rebuild bakes the correct URLs into the app.

- **Database connection errors**  
  - Start DB first: `sudo docker compose -f docker-compose.db.yml up -d`  
  - Wait until **stingrays-mssql** is healthy and **stingrays-mssql-init** has finished.

- **PuTTY disconnects**  
  - Use **tmux** or **screen** for long builds:  
    `sudo apt install -y tmux` then run `tmux` before `docker compose build`.

---

## Summary Checklist (Ubuntu + IP only)

1. Connect with PuTTY (VPS IP, port 22).
2. Update Ubuntu and install Docker: `sudo apt update && sudo apt upgrade -y` then the Docker install block from Step 2.
3. Clone or upload project; `cd ~/Stingrays_HRMS`.
4. Replace every `http://localhost` in `docker-compose.yml` with `http://YOUR_VPS_IP` (script or nano).
5. Start DB: `sudo docker compose -f docker-compose.db.yml up -d`; wait for healthy + init done.
6. Build and start app: `sudo docker compose build --no-cache && sudo docker compose up -d`.
7. Open firewall: ports 3000, 3001, 3010, 4000, 4001, 4010.
8. In browser open `http://YOUR_VPS_IP:3000` and log in.

You’re using the IP only for now; you can add a domain and HTTPS when you’re ready for production.
