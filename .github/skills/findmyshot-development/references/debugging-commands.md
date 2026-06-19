# Debugging Komutları

Findmyshot'ta sorunları hızlıca bulup çözmek için kullanılan komutlar.

## Docker Debugging

### Container Durumu

```bash
# Tüm container'ları listele
docker-compose ps

# Container log'larını canlı izle
docker-compose logs -f backend
docker-compose logs -f web
docker-compose logs -f postgres

# Belirli sayıda son satırı göster
docker-compose logs backend --tail 100

# Zaman damgasıyla göster
docker-compose logs backend -f --timestamps
```

### Container'a Bağlantı

```bash
# Backend container'ında bash aç
docker exec -it findmyshot-backend bash

# Web container'ında bash aç
docker exec -it findmyshot-web bash

# PostgreSQL container'ında psql aç
docker exec -it findmyshot-postgres psql -U postgres

# Python REPL açık kontrol et (backend)
docker exec -it findmyshot-backend python
>>> from backend.app.models import Event
>>> import os
>>> print(os.getenv("DATABASE_URL"))
```

### Container Yeniden Başlatma

```bash
# Belirli container'ı restart et
docker-compose restart backend
docker-compose restart web

# Tüm container'ları restart et
docker-compose down
docker-compose up -d

# Container sileyip yeniden oluştur (dangling volume olmaz)
docker-compose down -v
docker-compose up -d
```

## Backend Debugging

### FastAPI API Test

```bash
# Health check
curl http://localhost:8000/api/health

# GET isteği
curl http://localhost:8000/api/events/liwa-fest

# POST isteği
curl -X POST http://localhost:8000/api/events \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Event", "date": "2026-06-11"}'

# Authentication ile (JWT token)
curl http://localhost:8000/api/events \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Verbose (request/response details)
curl -v http://localhost:8000/api/events

# Response header'larını göster
curl -i http://localhost:8000/api/events
```

### Veritabanı Kontrol

```bash
# PostgreSQL'e bağlan
docker exec -it findmyshot-postgres psql -U postgres -d findmyshot

# Veya lokal psql varsa
psql postgresql://localhost/findmyshot

# Tablolar
\dt  # Tüm tablolar

# Belirli tablo schema'sı
\d events

# Query örnekleri
SELECT * FROM events LIMIT 10;
SELECT * FROM photos WHERE event_id = 'liwa-fest' LIMIT 5;
SELECT COUNT(*) FROM events;

# Join örneği
SELECT e.name, COUNT(p.id) as photo_count
FROM events e
LEFT JOIN photos p ON e.id = p.event_id
GROUP BY e.id;

# Updated_at'e göre sırala
SELECT * FROM events ORDER BY updated_at DESC LIMIT 5;

# Belirli alanları göster
SELECT id, name, created_at FROM events;

# Quit
\q
```

### Python Debugging

```bash
# Backend container'ında Python REPL
docker exec -it findmyshot-backend python

# Import test et
from backend.app.models import Event, Photo
from sqlalchemy import create_engine

# Veritabanı sorgusu test et
from backend.app.database import SessionLocal
db = SessionLocal()
events = db.query(Event).all()
print(f"Total events: {len(events)}")

# Model incelemesi
from sqlalchemy.schema import CreateTable
print(CreateTable(Event.__table__))

# Quit
exit()
```

## Frontend Debugging

### Dev Server

```bash
# Frontend'i yeniden başlat
docker-compose restart web

# Veya lokal olarak
cd web
npm run dev

# Sayfayı ziyaret et
http://localhost:3000/admin
http://localhost:3000/admin?event=liwa-fest
```

### Tarayıcı Developer Tools

```
1. F12 veya Right-click > Inspect açmak
2. Console sekmesine git
   - Hatalar ve warnings gösterilir
   - console.log() output'ları
3. Network sekmesine git
   - API çağrılarını göster
   - Request/Response incelemek
   - 4xx/5xx status code'ları kontrol
4. Application sekmesine git
   - Local storage
   - Cookies
   - Session storage
```

### TypeScript/ESLint Hatası

```bash
# ESLint'i çalıştır
cd web
npm run lint

# Veya tüm type'ları kontrol et
npx tsc --noEmit
```

## Mobile Debugging

```bash
# Mobile'ın backend'e bağlanabileceğini kontrol et
# Mobil tarayıcıda test edin:
http://[lokal-ip]:3000
http://[lokal-ip]:8000

# LAN proxy varsa kullan
node scripts/lan-http-proxy.mjs
```

## Ortak Sorun ve Çözümler

### 1. "Connection Refused" (Backend)

```
Sorun: Cannot connect to localhost:8000
Çözüm:
- Container çalışıyor mu? → docker-compose ps
- Port açık mı? → docker-compose logs backend
- Firewall? → macOS Firewall settings
- URL doğru mu? → http://localhost:8000 (https değil)
```

### 2. "Database Connection Error"

```
Sorun: FATAL: role "postgres" does not exist
Çözüm:
- PostgreSQL container çalışıyor mu? → docker-compose ps
- DATABASE_URL .env'de var mı?
- Container'ı restart et → docker-compose restart postgres
```

### 3. "Module Not Found" (Python)

```
Sorun: ModuleNotFoundError: No module named 'fastapi'
Çözüm:
- requirements.txt kuruldu mu? → pip install -r requirements.txt
- Doğru virtual env'de misin?
- Container'ı rebuild et → docker-compose build backend
```

### 4. "Port Already in Use"

```
Sorun: Address already in use (port 8000 or 3000)
Çözüm:
- Hangi process kullanıyor? → lsof -i :8000
- Process'i kapat → kill -9 [PID]
- Veya Docker port'unu değiştir → docker-compose.yaml
```

### 5. "CORS Error"

```
Sorun: Access to XMLHttpRequest blocked by CORS policy
Çözüm:
- Backend CORS ayarlarını kontrol et
- Frontend'in domain'i whitelist'te var mı?
- localhost:3000 development'da özel handling gerekli
```

### 6. "Face Recognition Model Yüklenmiyor"

```
Sorun: InsightFace model indirme hatası
Çözüm:
- İnternet bağlantısı var mı?
- Model dosyaları cache'de mi? → ~/.insightface/
- Backend log'larını kontrol → docker-compose logs backend
- Model'i manual indir → python -c "import insightface; ..."
```

## Performance Profiling

### Backend Response Süresi

```bash
# Request'in kaç saniye sürdüğünü göster
time curl http://localhost:8000/api/events

# Detaylı breakdown
curl -w "
  Connect: %{time_connect}s
  Transfer: %{time_starttransfer}s
  Total: %{time_total}s
\n" http://localhost:8000/api/events
```

### Database Query Süresi

```python
# Backend'de query time'ı logla
import time

start = time.time()
events = db.query(Event).all()
duration = time.time() - start

logger.info(f"Query took {duration:.2f} seconds")
```

### Frontend Performance

```javascript
// Tarayıcı console'unda
performance.measure('page-load')
console.log(performance.getEntriesByType('navigation')[0])

// Veya özel measurement
performance.mark('search-start')
// ... search kodu ...
performance.mark('search-end')
performance.measure('search', 'search-start', 'search-end')
```

---

**Daha spesifik debugging mi lazım?** Sorunu anlatırsan yardımcı olurum!
