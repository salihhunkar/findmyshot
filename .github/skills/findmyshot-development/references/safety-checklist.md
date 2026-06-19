# Güvenlik Kontrol Listesi

Kodda değişiklik yaparken ve öncesi kontrol edilmesi gereken güvenlik ve uyumluluk hususları.

## Genel Güvenlik Kontrolleri

### 1. Mevcut Kodu Kırma (Breaking Changes)

- [ ] Tüm mevcut API endpoint'leri hala çalışıyor mu?
- [ ] Veritabanı sorguları hala geçerli mi?
- [ ] Frontend bileşenleri hala render ediliyor mu?
- [ ] Mobile uygulama ile uyumlu mu?
- [ ] Backward compatibility (eski sürümler) korundu mu?

**Örnek Problem:**
```python
# KÖTÜ: Eski API'yi silme
# @router.get("/events")  # BU SATIRI SİLDİ
# def get_events():

# İYİ: Eğer kaldırmak lazımsa, deprecation warning ver
@router.get("/events", deprecated=True)
def get_events():
    """[DEPRECATED] Lütfen /api/v2/events kullanın"""
    return redirect("/api/v2/events")
```

### 2. Veri Güvenliği

- [ ] Hassas veriler (API keys, secrets, passwords) kod içinde var mı? **HAYIR**
- [ ] Environment variables (`.env`) kullanıldı mı?
- [ ] Git history'de gizli veriler yoksa mı? (Varsa `git rm --cached` kullan)
- [ ] Database password'ler kodda hardcoded mi? **HAYIR**

**Örnek Problem:**
```python
# KÖTÜ
DATABASE_URL = "postgresql://user:password@localhost/db"
AWS_KEY = "AKIAIOSFODNN7EXAMPLE"

# İYİ
DATABASE_URL = os.getenv("DATABASE_URL")
AWS_KEY = os.getenv("AWS_ACCESS_KEY_ID")
```

### 3. SQL Injection Koruması

- [ ] Tüm database sorgularında parameterized queries kullanıldı mı?
- [ ] Doğrudan string concatenation var mı? **HAYIR**
- [ ] SQLAlchemy ORM kullanıldı mı?

**Örnek Problem:**
```python
# KÖTÜ: SQL Injection riski
query = f"SELECT * FROM events WHERE id = '{event_id}'"

# İYİ: SQLAlchemy ORM
event = db.query(Event).filter(Event.id == event_id).first()
```

### 4. Yetkilendirme (Authorization)

- [ ] Kimlik doğrulama (authentication) yapıldı mı?
- [ ] User sadece kendi verilerine erişebiliyor mu?
- [ ] Admin işlemleri protect edilmiş mi?
- [ ] Event fotografçısı control'ü var mı?

**Örnek Problem:**
```python
# KÖTÜ: Herkes tüm event'leri görebiliyor
@router.get("/events/{event_id}")
def get_event(event_id: str):
    return db.query(Event).filter(Event.id == event_id).first()

# İYİ: Sadece yetkili user'lar görebiliyor
@router.get("/events/{event_id}")
def get_event(
    event_id: str,
    current_user = Depends(get_current_user)
):
    event = db.query(Event).filter(Event.id == event_id).first()
    # User'ın bu event'e erişim hakkı var mı?
    if not has_event_access(current_user, event):
        raise HTTPException(status_code=403, detail="Not authorized")
    return event
```

### 5. Hata Mesajları

- [ ] Hata mesajları stack trace açmıyor mu?
- [ ] Sistem detayları user'a gösterilmiyor mu?
- [ ] Veritabanı yapısı hata mesajında sızdırılmıyor mu?

**Örnek Problem:**
```python
# KÖTÜ: Stack trace gösteriyor
try:
    db.execute(query)
except Exception as e:
    return {"error": str(e)}  # "Unexpected token in JSON at position 45"
    # Veya: "Column 'users.password' does not exist"

# İYİ: Genel hata mesajı
try:
    db.execute(query)
except Exception as e:
    logger.error(f"Database error: {e}", exc_info=True)
    return {"error": "Bir hata oluştu. Lütfen daha sonra deneyin."}
```

### 6. Veritabanı Migrations

- [ ] Migration dosyası oluşturuldu mu?
- [ ] Migration'lar test sunucusunda çalıştırıldı mı?
- [ ] Rollback planı var mı?
- [ ] Veritabanında data loss olmayacak mı?

**Kontrol Adımları:**
```bash
# Migration'ı test et
# Eski schema'yı backup al
pg_dump postgresql://localhost/findmyshot > backup.sql

# Migration çalıştır
alembic upgrade head

# Verileri kontrol et
SELECT COUNT(*) FROM events;
SELECT COUNT(*) FROM photos;

# Gerekirse rollback
alembic downgrade -1
```

### 7. TypeScript Tipler (Frontend)

- [ ] Tüm props TypeScript typed mi?
- [ ] API response'leri type defined mi?
- [ ] Null/undefined kontroller var mı?
- [ ] Type errors compiler'da gösteriliyor mu?

**Örnek Problem:**
```typescript
// KÖTÜ: Any tip kullanıyor
const handleEventChange = (event: any) => {
    console.log(event.name)  // Runtime error olabilir
}

// İYİ: Proper types
interface Event {
    id: string
    name: string
    materials?: Material[]
}

const handleEventChange = (event: Event) => {
    console.log(event.name)  // Type-safe
}
```

### 8. API Response Format

- [ ] Response format tutarlı mı?
- [ ] HTTP status code'ları doğru mu?
- [ ] Error response'leri structured mi?
- [ ] API documentation güncellenmiş mi?

**Örnek Problem:**
```python
# KÖTÜ: Inconsistent responses
@router.get("/events/{event_id}")
def get_event(event_id: str):
    try:
        return {"event": {...}}  # 200 OK, data in "event" field
    except:
        return "Event not found"  # 500, string response

@router.get("/photos/{photo_id}")
def get_photo(photo_id: str):
    try:
        return {...}  # 200 OK, direct data
    except:
        return {"error": "Not found"}  # 404?, JSON response

# İYİ: Consistent format
from fastapi.responses import JSONResponse

@router.get("/events/{event_id}")
def get_event(event_id: str):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"success": true, "data": event}

@router.get("/photos/{photo_id}")
def get_photo(photo_id: str):
    photo = db.query(Photo).filter(Photo.id == photo_id).first()
    if not photo:
        raise HTTPException(status_code=404, detail="Photo not found")
    return {"success": true, "data": photo}
```

### 9. Performance

- [ ] Database sorgularında N+1 problem var mı?
- [ ] Image'lar optimize edilmiş mi?
- [ ] API response'leri pagination'lı mı?
- [ ] Gereksiz re-render'lar frontend'de var mı?

**Örnek Problem:**
```python
# KÖTÜ: N+1 problem
events = db.query(Event).all()
for event in events:
    photos = db.query(Photo).filter(Photo.event_id == event.id).all()  # Her event için query!
    # Toplam: 1 + N queries

# İYİ: Eager loading
events = db.query(Event).options(
    joinedload(Event.photos)
).all()
# Toplam: 1 query
```

### 10. Logging ve Monitoring

- [ ] Önemli işlemler log'lanıyor mu?
- [ ] Error'lar log'lanıyor mu?
- [ ] User aktiviteleri track ediliyor mu?
- [ ] Production'da debug mode açık değil mi?

**Kontrol:**
```python
import logging

logger = logging.getLogger(__name__)

@router.post("/events/{event_id}/photos")
async def upload_photo(event_id: str, photo: UploadFile):
    logger.info(f"User uploaded photo to event {event_id}")
    
    try:
        # ...
    except Exception as e:
        logger.error(f"Photo upload failed: {e}", exc_info=True)
        raise
```

## Kontrol Listesi (Kısaltılmış)

Her değişiklik sonrası:

```
Güvenlik Kontrolleri:
- [ ] Mevcut kod hala çalışır mı?
- [ ] Hassas veriler kod içinde yok mu?
- [ ] Database sorgularında SQL injection koruması var mı?
- [ ] Yetkilendirme kontrol edilmiş mi?
- [ ] Hata mesajları güvenli mi?
- [ ] Database migration'ları uyumlu mu?
- [ ] TypeScript types doğru mu?
- [ ] API responses tutarlı mı?
- [ ] Performance sorunları yok mu?
- [ ] Logging ve monitoring OK mu?
```

## Tehlikeli Komutlar

Yapılırken çok dikkat edilmesi gereken işlemler:

```bash
# ⚠️ UYARI: Veritabanını silme
DROP TABLE events;
# Önce: backup al (pg_dump)
# Sonra: migration kullan (ALTER TABLE veya DOWN)

# ⚠️ UYARI: Tüm API'yi değiştirme
# Sonuç: Tüm client'lar kırılır
# Çözüm: Versioning yap (/api/v1 vs /api/v2) veya deprecation periode

# ⚠️ UYARI: Node modules/dependencies silme
rm -rf node_modules requirements.txt
# Sonrası: npm install / pip install gerekli

# ⚠️ UYARI: .env dosyasını delete etme
rm .env
# Bu dosya lokal secrets içerir! Git track'lenmez.
```

---

**Şüphe varsa**: Checkpoint güncellemeden veya push etmeden önce sor!
