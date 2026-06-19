# Quick Reference

Findmyshot'ta hızlıca kullanılabilecek bilgiler.

## Proje Dosya Yapısı

```
findmyshot/
├── backend/
│   ├── app/
│   │   ├── __init__.py              # App init
│   │   ├── main.py                  # FastAPI entry point
│   │   ├── config.py                # Ayarlar
│   │   ├── database.py              # Veritabanı bağlantısı
│   │   ├── models/                  # Database modelleri (SQLAlchemy)
│   │   │   ├── event.py
│   │   │   ├── photo.py
│   │   │   ├── user.py
│   │   │   ├── order.py
│   │   │   └── ...
│   │   ├── routes/                  # API endpoint'leri
│   │   │   ├── auth.py              # Kimlik doğrulama
│   │   │   ├── events.py            # Event API'si
│   │   │   ├── photos.py            # Foto API'si
│   │   │   ├── search.py            # Search API'si
│   │   │   ├── commerce.py          # E-ticaret
│   │   │   └── files.py             # Dosya yükleme
│   │   ├── services/                # İş mantığı
│   │   │   ├── face_service.py      # Face recognition
│   │   │   ├── pinecone_service.py  # Vector search
│   │   │   ├── storage_service.py   # S3 storage
│   │   │   └── ...
│   │   ├── dependencies/            # Injection
│   │   │   ├── auth.py              # Auth dependencies
│   │   │   └── ...
│   │   └── utils/                   # Yardımcı fonksiyonlar
│   │       ├── security.py
│   │       ├── event_access.py
│   │       ├── mailer.py
│   │       └── ...
│   ├── requirements.txt             # Python dependencies
│   └── workers/                     # Background tasks
│       └── face_index_worker.py
│
├── web/
│   ├── app/                         # Next.js app directory
│   │   ├── layout.tsx               # Root layout
│   │   ├── page.tsx                 # Home page
│   │   ├── admin/page.tsx           # Admin paneli
│   │   ├── events/
│   │   │   ├── create/page.tsx      # Etkinlik oluştur
│   │   │   └── detail/page.tsx      # Etkinlik detay
│   │   ├── photographer/page.tsx    # Fotografçı dashboard
│   │   ├── search/page.tsx          # Arama sayfası
│   │   └── ...
│   ├── components/                  # React components
│   │   ├── admin-dashboard.tsx
│   │   ├── guest-search-panel.tsx
│   │   ├── photographer-dashboard.tsx
│   │   ├── public-event-page-client.tsx
│   │   └── ...
│   ├── lib/                         # Utilities
│   │   ├── api-base.ts              # API client
│   │   ├── runtime-urls.ts
│   │   └── ...
│   ├── package.json                 # Node dependencies
│   └── tsconfig.json                # TypeScript config
│
├── mobile/                          # Mobil uygulama (TBD)
├── docs/                            # Dokümantasyon
│   ├── checkpoint-*.md              # Tarihli checkpoint'ler
│   ├── backend-mvp.md
│   └── ...
├── compose.yaml                     # Production Compose
├── compose.debug.yaml               # Debug Compose
└── .env                             # Environment variables (git ignore)
```

## Temel URL'ler

```
Development:
- Frontend: http://localhost:3000
- Admin: http://localhost:3000/admin
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs (Swagger)

Production:
- TBD (deployment URL'si)
```

## Environment Variables (.env)

```bash
# Backend
DATABASE_URL=postgresql://user:pass@localhost/findmyshot
PINECONE_API_KEY=xxx
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_S3_BUCKET=findmyshot-photos
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=xxx
SMTP_PASSWORD=xxx

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Yaygın API Endpoint'leri

```
GET     /api/health                 Health check
POST    /api/auth/login             Giriş
POST    /api/auth/register          Kayıt
POST    /api/auth/logout            Çıkış

GET     /api/events                 Tüm etkinlikler
POST    /api/events                 Yeni etkinlik
GET     /api/events/{id}            Etkinlik detay
PUT     /api/events/{id}            Etkinlik güncelle
DELETE  /api/events/{id}            Etkinlik sil

GET     /api/events/{id}/photos     Etkinlik fotoları
POST    /api/photos/upload          Foto yükle
GET     /api/photos/{id}            Foto indir

POST    /api/search/faces           Yüz araması
GET     /api/search?q=term          Metin araması

POST    /api/orders                 Sipariş oluştur
GET     /api/orders/{id}            Sipariş detay
```

## Veritabanı Tabelaları

```
events                      # Etkinlikler
  id (PK), name, date, materials_json, ...

photos                      # Fotoğraflar
  id (PK), event_id (FK), s3_key, file_size, ...

users                       # Kullanıcılar
  id (PK), email, hashed_password, ...

photographers               # Fotografçılar
  id (PK), user_id (FK), ...

orders                      # Siparişler (fotoları satın alma)
  id (PK), user_id (FK), ...

saved_views                 # Kullanıcı filtreleri
  id (PK), user_id (FK), ...
```

## Terminal Komutları

```bash
# Docker
docker-compose up -d                # Başlat
docker-compose down                 # Durdur
docker-compose logs -f              # Log'ları canlı gör
docker-compose ps                   # Durumunu kontrol et
docker-compose restart backend      # Restart

# Backend (lokal)
cd backend
python -m venv venv
source venv/bin/activate            # Activation
pip install -r requirements.txt
python -m uvicorn app.main:app --reload

# Frontend (lokal)
cd web
npm install
npm run dev
npm run build
npm run lint

# Database
psql postgresql://localhost/findmyshot
psql -d findmyshot -f backup.sql    # Restore

# Git
git status
git add [files]
git commit -m "message"
git push
```

## Teknoloji Sürümleri

```
Backend:
- Python 3.9+
- FastAPI 0.100+
- SQLAlchemy 2.0+
- Pydantic 2.0+
- PostgreSQL 14+
- Pinecone SDK

Frontend:
- Node 18+
- Next.js 15.2+
- React 19.0+
- TypeScript 5.8+

DevOps:
- Docker 24+
- Docker Compose 2.20+
```

## İletişim Protokolleri

```
Backend → Database:
  SQLAlchemy ORM → PostgreSQL (SQL)

Backend → Pinecone:
  HTTP API (vector search)

Backend → S3:
  boto3 (AWS SDK)

Frontend → Backend:
  HTTP REST API (JSON)

Face Recognition:
  InsightFace model → face embeddings → Pinecone
```

## Yaygın Sorular (FAQ)

**Q: Presigned URL nedir?**
A: AWS S3'e doğrudan erişim için imzalı URL. Sınırlı süre için geçerli.

**Q: Face embedding nedir?**
A: Yüzün sayısal temsili. InsightFace modeli yüzü 512-boyutlu vektöre dönüştürür.

**Q: Event access nedir?**
A: User'ın etkinliği görebilip göremeyeceği kontrolü.

**Q: Migration nedir?**
A: Veritabanı schema değişikliklerinin versiyonlanması.

**Q: Presigned URL'nin TTL'i nedir?**
A: Time To Live - URL ne kadar süre geçerli kalacağı (saniye cinsinden).

## Hızlı Checklist (Yeni Geliştirme)

```
- [ ] Gerekiyor mu? (MVG prensibi)
- [ ] Checkpoint kontrol et
- [ ] Ortamı başlat (Docker/Local)
- [ ] API endpoint varsa test et
- [ ] Kod yaz
- [ ] Test et (manual + automated)
- [ ] Security kontrol (güvenlik checklist)
- [ ] Code review (eğer tim varsa)
- [ ] Deploy test et
- [ ] Checkpoint güncelle
- [ ] Commit/Push
```

---

**Daha fazla detay lazım mı?** Spesifik referans dosyalarını oku!
