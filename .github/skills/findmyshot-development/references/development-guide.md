# Geliştirme Rehberi

Findmyshot'ta yeni özellik eklerken veya hata düzeltirken izlenecek adım adım process.

## Genel Workflow

```
1. Checkpoint Kontrol
   ↓
2. Ortamı Hazırla (Docker/Local)
   ↓
3. Görevi Plan Et
   ↓
4. Kod Yaz
   ↓
5. Test Et
   ↓
6. Güvenlik Kontrol Et
   ↓
7. Checkpoint Güncelle
   ↓
8. Commit/Push (eğer git varsa)
```

## 1. Checkpoint Kontrol

Başlamadan önce son checkpoint'i oku:

```bash
# En yeni checkpoint bulunur
docs/checkpoint-*.md
```

**Kontrol listesi:**
- [ ] Son yapılan işler nelerdi?
- [ ] Hangi dosyalar değiştirildi?
- [ ] Önemli notlar var mı?
- [ ] Kaldığınız yerden başlıyor musunuz?

## 2. Ortamı Hazırla

### Docker ile (Önerilen)

```bash
# Servisleri başlat
docker-compose up -d

# Durumu kontrol et
docker-compose ps

# Log'ları gör
docker-compose logs -f backend
docker-compose logs -f web
```

### Lokal Geliştirme

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Environment ayarla
export DATABASE_URL=postgresql://...
export AWS_ACCESS_KEY_ID=...

# Sunucuyu başlat
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd web
npm install
npm run dev
```

## 3. Görevi Plan Et

Yapmak istediğiniz şeyi yazılı hale getirin:

**Örnek Planlar:**

Backend:
```
Görev: Event API'sine 'materials' alanını ekle
1. Model'e 'materials_json' sütunu ekle (migration)
2. Serialization'da medya URL'lerini presigned yapmak
3. Update endpoint'ini güncelle
4. Test et: curl ile API çağrı yap
```

Frontend:
```
Görev: Admin panele 'Kapak Resmi' seçim widget'ı ekle
1. admin-dashboard.tsx'te yeni component oluştur
2. S3 presigned URL'lerini göster
3. Seçim yapıldığında API'ye gönder
4. Hata handling ekle
5. Type definitions ekle
```

## 4. Kod Yaz

### Backend Kuralları

- **Model ekleme**: `backend/app/models/` klasöründe
- **Route ekleme**: `backend/app/routes/` klasöründe fonksiyon olarak
- **İş mantığı**: `backend/app/services/` klasöründe
- **Utilities**: `backend/app/utils/` klasöründe

**Örnek API Eklemek:**

```python
# backend/app/routes/events.py
from fastapi import APIRouter, Depends
from backend.app.models import Event
from backend.app.dependencies import get_current_user

router = APIRouter()

@router.get("/events/{event_id}")
async def get_event(
    event_id: str,
    current_user = Depends(get_current_user)
):
    # İş mantığı buraya
    return {"event_id": event_id}
```

### Frontend Kuralları

- **Sayfalar**: `web/app/[path]/page.tsx`
- **Bileşenler**: `web/components/` klasöründe
- **TypeScript Types**: Bileşen dosyasının başında
- **API Çağrıları**: `web/lib/api-base.ts` kullan

**Örnek Bileşen:**

```typescript
// web/components/event-detail.tsx
'use client'

interface EventDetailProps {
  eventId: string
}

export function EventDetail({ eventId }: EventDetailProps) {
  // Component logic
  return <div>Event: {eventId}</div>
}
```

## 5. Test Et

### Backend Test

```bash
# Endpoint'i test et
curl http://localhost:8000/api/events/liwa-fest

# POST örneği
curl -X POST http://localhost:8000/api/events \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Event"}'
```

### Frontend Test

```bash
# Sayfayı ziyaret et
# http://localhost:3000/admin

# Tarayıcı console'unda hatalar kontrol et
# API çağrılarının başarılı olduğundan emin ol
```

### Database İçeri Test

```bash
# Container'a bağlan
docker exec -it findmyshot-postgres psql -U postgres

# Veya lokal postgres varsa:
psql postgresql://localhost/findmyshot

# Query test et
SELECT * FROM events WHERE id = 'liwa-fest';
```

## 6. Güvenlik Kontrol Et

**Kontrol listesi:**

- [ ] Mevcut çalışan kod hala çalışır mı?
- [ ] API uyumluluğu (backward compatibility) korundu mu?
- [ ] Hassas veriler (API keys, passwords) kod içinde var mı? **HAYIR**
- [ ] Hata mesajları güvenli (stack trace açmaz) mı?
- [ ] Yetkilendirme kontrol edildi mi?
- [ ] Veritabanı sorgusu SQL injection'dan korumalı mı?

[Güvenlik Checklist](./safety-checklist.md)

## 7. Checkpoint Güncelle

Önemli değişiklikler sonrası checkpoint oluştur:

```bash
# Yeni checkpoint dosyası oluştur
cat > docs/checkpoint-$(date +%Y-%m-%d)-[görev-adı].md << 'EOF'
# Checkpoint - [Tarih]

## Yapilanlar
- Görev 1 yapıldı
- Görev 2 yapıldı

## Degisen Dosyalar
- backend/app/models/event.py
- web/components/admin-dashboard.tsx

## Notlar
- Önemli bilgiler burada

## Yarin Devam Icin
1. Sonraki adım
2. Sonraki adım
EOF
```

[Checkpoint Yazma Rehberi](./checkpoint-writing.md)

## 8. Commit/Push

Git kullanılıyorsa:

```bash
# Durumu kontrol et
git status

# Dosyaları stage et
git add backend/app/models/event.py web/components/admin-dashboard.tsx

# Commit yap
git commit -m "Feature: Add materials field to events

- Added materials_json column to Event model
- Updated event update API endpoint
- Implemented presigned URL generation for media
- Updated admin dashboard component"

# Push et
git push origin [branch-name]
```

---

**Devam etmek içinde yeterli mi?** Spesifik bir görev var mı? Sor!
