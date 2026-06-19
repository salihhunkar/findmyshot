# FindMyShot Production Deploy (Hostinger VPS + Veridyen DNS)

## 1. DNS (Veridyen)

Add these records for your production domain:

- A record: `@` -> `YOUR_VPS_IP`
- CNAME: `www` -> `@`

Optional if you later split API and web:

- A record: `api` -> `YOUR_VPS_IP`

Use low TTL during migration (300).

## 2. VPS Base Setup (Hostinger Ubuntu)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx python3 python3-venv python3-pip nodejs npm certbot python3-certbot-nginx
```

## 3. Project Location

Recommended path:

```bash
sudo mkdir -p /opt/findmyshot
sudo chown -R $USER:$USER /opt/findmyshot
```

Upload/clone repo into `/opt/findmyshot`.

## 4. Backend Setup

```bash
cd /opt/findmyshot/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Create env file:

```bash
cp /opt/findmyshot/deploy/env/backend.env.example /opt/findmyshot/deploy/env/backend.env
nano /opt/findmyshot/deploy/env/backend.env
```

Important:

- Set `DATABASE_URL`
- Set `PUBLIC_BASE_URL` to your real domain
- Set strong `JWT_SECRET_KEY`

## 5. Web Setup

```bash
cd /opt/findmyshot/web
npm ci
npm run build
```

Create env file:

```bash
cp /opt/findmyshot/deploy/env/web.env.example /opt/findmyshot/deploy/env/web.env
nano /opt/findmyshot/deploy/env/web.env
```

Important:

- `NEXT_PUBLIC_API_BASE_URL=https://your-domain.com`
- `NEXT_PUBLIC_SHARE_BASE_URL=https://your-domain.com`

## 6. systemd Services

Copy service templates:

```bash
sudo cp /opt/findmyshot/deploy/systemd/findmyshot-api.service /etc/systemd/system/
sudo cp /opt/findmyshot/deploy/systemd/findmyshot-web.service /etc/systemd/system/
```

Reload + start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable findmyshot-api findmyshot-web
sudo systemctl start findmyshot-api findmyshot-web
sudo systemctl status findmyshot-api findmyshot-web
```

## 7. Nginx Reverse Proxy

Copy config and update domain:

```bash
sudo cp /opt/findmyshot/deploy/nginx/findmyshot.conf /etc/nginx/sites-available/findmyshot
sudo nano /etc/nginx/sites-available/findmyshot
sudo ln -s /etc/nginx/sites-available/findmyshot /etc/nginx/sites-enabled/findmyshot
sudo nginx -t
sudo systemctl reload nginx
```

## 8. SSL

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
sudo certbot renew --dry-run
```

## 9. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## 10. Verify

- Open `https://your-domain.com`
- Open `https://your-domain.com/admin`
- Test QR flow from phone
- Test selfie upload + match + download

## 11. Next Phase (After Stable Launch)

- Rebrand all `FindMyShot` texts to your new brand
- Add real SMTP for emails and verification
- Add admin approval and user block flows
- Add audit logs and moderation tools
