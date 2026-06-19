---
name: findmyshot-development
description: 'Findmyshot projesi geliştirme ve debugging için kapsamlı yardımcı. Backend (FastAPI, face recognition), Frontend (Next.js, React), Mobile, Docker ortamında çalışma, checkpoint'lerden devam etme ve adım adım debugging yardımı sağlar.'
argument-hint: 'Yapılmak istenen görev (örn: "backend hata ayıkla", "frontend özellik ekle", "checkpoint'i gözden geçir")'
user-invocable: true
disable-model-invocation: false
---

# Findmyshot Proje Geliştirme Skill'i

Bu skill, Findmyshot'ın geliştirilmesi ve bakımı için adım adım rehberlik sağlar. Proje yapısı, teknoloji yığını, checkpoint sistem ve geliştirme workflow'u hakkında bilgi içerir.

## Proje Özeti

**Findmyshot** - Etkinlik fotoğraflarını bulma ve yönetme platformu:

| Bileşen | Teknoloji | Amaç |
|---------|-----------|------|
| **Backend** | FastAPI, PostgreSQL, Pinecone | Face recognition, photo search, API |
| **Frontend** | Next.js 15, React 19, TypeScript | Admin panel, event management, guest search |
| **Mobile** | TBD | Fotograflama deneyimi |
| **Deployment** | Docker, Docker Compose | Containerized services |

Proje `docs/` klasöründe checkpoint dosyaları tutar ve Türkçe açıklamalar içerir.

## Ne Zaman Kullanmalı

- Backend geliştirme: Python/FastAPI hataları, database işlemleri, face recognition
- Frontend geliştirme: React bileşenleri, TypeScript tipler, Next.js ayarları
- Docker ortamında çalışma: Compose hataları, container sorunları
- Adım adım debugging: Hata ayıklamayı planlı bir şekilde yapma
- Checkpoint'ten devam: Son yapılan işlerden kaldığı yerden başlama

## Temel Iş Akışı

### 1. Başlamadan Önce: Checkpoint Kontrol

Projede yapılan son işlemleri anlamak için checkpoint dosyasını oku:

```
docs/checkpoint-*.md
```

En son checkpoint:
- Hangi dosyalar değiştirildi
- Yapılan işler ve notlar
- Devam etmeden önce adımlar

[Checkpoint Inceleme Rehberi](./references/checkpoint-guide.md)

### 2. Ortamı Hazırla

Geliştirme ortamını başlat:

```bash
# Docker Compose ile servisleri başlat
docker-compose up -d

# Veya lokal olarak
# Backend: cd backend && python -m uvicorn app.main:app --reload
# Frontend: cd web && npm run dev
```

### 3. Geliştirme Adımlarını Takip Et

[Geliştirme Rehberi](./references/development-guide.md) adım adım süreci açıklar:

- Backend özelliği eklemek
- Frontend bileşeni oluşturmak
- Hata ayıklamak
- Kod güvenliği sağlamak

### 4. Değişiklikleri Belgelendir

Önemli değişlikler için:

1. **Git kullanılıyorsa**: Commit açıklaması yaz
2. **Checkpoint güncelle**: `docs/checkpoint-YYYY-MM-DD.md` oluştur
3. **Hatırlatmalar ekle**: Gelecek adımlar için notlar

[Checkpoint Yazma Rehberi](./references/checkpoint-writing.md)

## Temel Proje Yapısı

```
findmyshot/
├── backend/              # FastAPI uygulaması
│   ├── app/
│   │   ├── models/       # SQLAlchemy modelleri
│   │   ├── routes/       # API endpoint'leri
│   │   ├── services/     # İş mantığı (face recognition, Pinecone)
│   │   ├── dependencies/ # Kimlik doğrulama, erişim kontrol
│   │   └── utils/        # Yardımcı fonksiyonlar
│   └── requirements.txt  # Python bağımlılıkları
├── web/                  # Next.js uygulaması
│   ├── app/              # Sayfalar ve layout
│   ├── components/       # React bileşenleri
│   ├── lib/              # Kütüphane fonksiyonları
│   └── package.json      # Node bağımlılıkları
├── mobile/               # Mobil uygulama
├── docs/                 # Dokümantasyon ve checkpoint'ler
└── compose.yaml          # Docker Compose konfigürasyonu
```

## Temel Teknoloji Yığını

### Backend
- **FastAPI**: API framework
- **SQLAlchemy**: ORM
- **PostgreSQL**: Veritabanı
- **Pinecone**: Vektör arama (face embeddings)
- **InsightFace**: Face recognition modeli
- **Boto3**: AWS S3 depolama

### Frontend
- **Next.js 15**: React framework
- **React 19**: UI kütüphanesi
- **TypeScript**: Tip güvenliği
- **QR Scanner**: Etkinlik kodları

### Deployment
- **Docker**: Containerization
- **Docker Compose**: Multi-container orchestration

## Güvenlik Önlemleri

Kod değişikliği yaparken:

1. **Önemli değişiklikler öncesi onay iste**: Checkpoint güncelle, `docs/` dosya değişiklikleri
2. **Mevcut çalışan kodu kırma**: Testten geç, API uyumluluğu kontrol et
3. **Veritabanı migrations'ı dikkatli yönet**: Rollback planı yap
4. **Hassas veriler (API keys, password'ler)**: Asla kod içine yazma, `.env` kullan

[Güvenlik Rehberi](./references/safety-checklist.md)

## Hızlı İleti Şablonları

Terminal'de kuruluşu test etmek için:

```bash
# Backend sağlık kontrolü
curl http://localhost:8000/api/health

# Frontend dev sunucusu
curl http://localhost:3000

# Docker konteynerlerini kontrol et
docker-compose ps
```

[Debugging Komutları](./references/debugging-commands.md)

## Checkpoint Sistemi

Proje ilerlemesini takip etmek için `docs/` klasöründe tarihli checkpoint dosyaları tutulur:

```
docs/checkpoint-2026-03-31-liwa-fest.md
docs/checkpoint-2026-03-13-onboarding.md
```

Her checkpoint:
- **Yapılanlar**: Tamamlanan işler listesi
- **Değişen Dosyalar**: Hangi dosyalar değiştirildi
- **Notlar**: Önemli bilgiler ve uyarılar
- **Yarin Devam İçin**: Sonraki adımlar

## Yaygın Görevler

### Backend
- [Model ve Database](./references/backend-models.md)
- [API Endpoint'leri](./references/backend-routes.md)
- [Face Recognition](./references/face-recognition.md)
- [Kimlik Doğrulama](./references/authentication.md)

### Frontend
- [Sayfa Oluşturma](./references/frontend-pages.md)
- [Bileşen Yapısı](./references/frontend-components.md)
- [TypeScript Tipler](./references/typescript-types.md)
- [API İntegrasyonu](./references/api-integration.md)

### DevOps
- [Docker Kurulum](./references/docker-setup.md)
- [Compose Komutları](./references/compose-commands.md)
- [Ortam Değişkenleri](./references/environment-variables.md)

## İletişim Terimleri

- **Checkpoint**: Proje durumunun tarihli yazılı özeti
- **Presigned URL**: AWS S3 medya URL'sinin imzalanmış hali
- **Face Embedding**: Yüz tanıma için vektör temsili
- **Pinecone**: Vektör veritabanı hizmeti (face embeddings)
- **Event**: Etkinlik (düğün, festival vb.)
- **Photographer**: Fotografçı (etkinliklerde foto çeken kişi)

## Sonraki Adımlar

1. Yapılması gereken görevi açıkla
2. Skill gerekli referans dosyasını açacak
3. Adım adım rehberlik sağlanacak
4. Değişiklikler after yapıldıktan sonra checkpoint güncelle

---

**Başlangıç**: "checkpoint'i gözden geçir" komutunu kullan veya "backend/frontend hata ayıkla" gibi spesifik görev söyle.
