# FindMyShot Deploy Plan (Hostinger KVM Ubuntu + Traefik)

Bu rehber, projeyi GitHub'dan VPS'e alip `photo.muvipho.com` alan adinda Traefik uzerinden yayinlamak icindir.

## 1. VPS uzerinde ilk hazirlik

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git docker.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
```

Klasoru hazirla:

```bash
sudo mkdir -p /opt
sudo chown -R $USER:$USER /opt
cd /opt
```

## 2. GitHub'dan projeyi cek

```bash
git clone https://github.com/salihhunkar/findmyshot.git
cd /opt/findmyshot
```

Kod guncellemek icin:

```bash
cd /opt/findmyshot
git pull origin main
```

## 3. Env dosyalarini olustur

```bash
cd /opt/findmyshot
cp deploy/env/backend.env.example deploy/env/backend.env
cp deploy/env/web.env.example deploy/env/web.env
```

### 3.1 Backend env ayarlari

`deploy/env/backend.env` icinde bunlari duzelt:

- `DATABASE_URL=sqlite:////opt/findmyshot-data/findmyshot.db`
- `PUBLIC_BASE_URL=https://photo.muvipho.com`
- `CORS_ORIGINS=["https://photo.muvipho.com","https://www.photo.muvipho.com"]`
- `JWT_SECRET_KEY` guclu bir deger olsun

### 3.2 Web env ayarlari

`deploy/env/web.env` icinde bunlari duzelt:

- `NODE_ENV=production`
- `NEXT_PUBLIC_API_BASE_URL=https://photo.muvipho.com`
- `NEXT_PUBLIC_SHARE_BASE_URL=https://photo.muvipho.com`

## 4. Traefik network kontrolu

Ortaminda Traefik hangi docker network'u kullaniyorsa onun adini ayarla.

Varsayilan bu rehberde: `traefik-public`

Kontrol:

```bash
docker network ls
```

Eger network farkliysa calistirirken asagidaki env'i ekle:

```bash
TRAEFIK_PUBLIC_NETWORK=<senin_traefik_network_adi>
```

## 5. Servisleri ayaga kaldir

```bash
cd /opt/findmyshot
docker compose -f compose.traefik.yaml up -d --build
```

Durum kontrol:

```bash
docker compose -f compose.traefik.yaml ps
docker compose -f compose.traefik.yaml logs -f --tail=100
```

## 6. Domain dogrulama

Traefik dogru ayarliysa su adresler acilmalidir:

- `https://photo.muvipho.com`
- `https://photo.muvipho.com/admin`
- `https://photo.muvipho.com/e/ela-salih`

## 7. QR ve selfie test

1. Telefonda `https://photo.muvipho.com/e/ela-salih` ac.
2. QR taratmadan aciliyorsa QR da ayni adrese yonlenecektir.
3. Selfie cek ve eslesme sonucunu kontrol et.

## 8. Guncelleme rutini

```bash
cd /opt/findmyshot
git pull origin main
docker compose -f compose.traefik.yaml up -d --build
```

## 9. Sorun giderme hizli kontrol

- TLS yoksa: Traefik certresolver ayarlarini kontrol et.
- 404 alirsan: Traefik route kurallari ve domain DNS A kaydini kontrol et.
- API hatasi varsa: `docker compose -f compose.traefik.yaml logs findmyshot-api`
- Web hatasi varsa: `docker compose -f compose.traefik.yaml logs findmyshot-web`
