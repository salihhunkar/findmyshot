# Checkpoint Yazma Rehberi

Önemli değişiklikler sonrası yapılacak checkpoint dosyasının nasıl yazılacağı.

## Dosya Adı Konvensiyonu

```
docs/checkpoint-YYYY-MM-DD-[konu].md
```

**Örnekler:**
- `checkpoint-2026-06-11-face-recognition-bug.md`
- `checkpoint-2026-06-10-admin-panel-update.md`
- `checkpoint-2026-06-09-docker-setup.md`

## Standart Checkpoint Şablonu

```markdown
# Checkpoint - [Tarih] - [Başlık]

## Yapilanlar
- İş 1 tamamlandı
- İş 2 tamamlandı
- Sorun X çözüldü

## Degisen Dosyalar
- backend/app/models/photo.py (Yeni 'status' alanı eklendi)
- backend/app/routes/photos.py (Yeni endpoint eklendi)
- web/components/photo-gallery.tsx (UI güncellendi)

## Notlar
- PostgreSQL'de migration çalıştırılması gerekiyor
- Presigned URL generation backend'de otomatik yapılıyor
- S3 bucket izinleri kontrol edildi

## Sorunlar ve Çözümler (İsteğe Bağlı)
- **Sorun**: Admin panelde kapak resmi gösterilmiyor
  - **Çözüm**: Materials JSON serializasyonu presigned URL'ye dönüştürüldü
  - **Dosya**: backend/app/routes/events.py satır 123

## Yarin Devam Icin
1. Backend ve web servislerini yeniden başlat
2. `http://localhost:3000/admin?event=liwa-fest` adresinden kapak gösterilip gösterilmediğini kontrol et
3. Mobil uygulamada test et
```

## Her Bölümü Nasıl Yazmalı

### "Yapilanlar" Bölümü

Tamamlanan işleri maddeli liste olarak yaz:

```
- [Yapılan iş] ([ilgili dosya] varsa)
- [Yapılan iş] ([ilgili dosya] varsa)
```

**Örnekler:**

**İyi:**
```
- Face recognition model caching iyileştirildi (face_service.py)
- Admin panel kapak resmi widget'ı eklendi (admin-dashboard.tsx)
- Bug fix: Event update'de materials sıfırlanması sorunu düzeltildi
```

**Kötü:**
```
- Şeyler yapıldı
- Frontend'de değişiklikler
- Backend fixed
```

### "Degisen Dosyalar" Bölümü

Hangi dosyaların değiştirildiğini, kısaca ne yapıldığını yaz:

```
- backend/app/models/event.py (Yeni 'materials' alanı eklendi)
- backend/app/routes/events.py (Update endpoint güncellendi)
- web/components/admin-dashboard.tsx (Materials UI bileşeni)
- docs/checkpoint-*.md (Bu dosya)
```

### "Notlar" Bölümü

**Dikkat edilmesi gereken hususlar:**
- Veritabanı migration'larının yapılıp yapılmadığı
- Ortam değişkenleri (environment variables)
- Bağımlılık güncellemeleri
- API uyumluluğu değişiklikleri
- Bilinen sorunlar (known issues)

**Örnek:**

```
- PostgreSQL migration: `ALTER TABLE events ADD COLUMN materials_json JSONB;`
- AWS S3 bucket izinleri kontrol edildi (presigned URL generation'ı için)
- `.env` dosyasında PINECONE_API_KEY bulunmalı
- Eski API endpoint'leri hala destekleniyor (backward compatible)
```

### "Sorunlar ve Çözümler" (İsteğe Bağlı)

Karşılaşılan sorunları ve çözümünü dokümante et:

```
- **Sorun**: Frontend'de TypeScript hataları
  - **Hata**: Property 'materials' does not exist
  - **Çözüm**: Event model'e materials type definition eklendi
  - **Dosya**: web/components/types/event.ts

- **Sorun**: Presigned URL'ler expired
  - **Sebep**: TTL 60 saniye idi
  - **Çözüm**: TTL 3600 saniyeye çıkartıldı
  - **Dosya**: backend/app/services/storage_service.py
```

### "Yarin Devam Icin" Bölümü

Sonraki geliştirme aşamasında yapılması gereken işleri madde madde yaz:

```
1. Backend ve web servislerini restart et
2. Admin panelde test et: http://localhost:3000/admin?event=liwa-fest
3. Fotografçı uygulaması (mobile) ile test et
4. Veritabanında data integrity kontrol et
5. S3 medya URL'lerinin çalıştığını test et
```

## Checkpoint Yazarken İpuçları

1. **Spesifik olun**: "Hata düzeltildi" yerine "Event update'de materials sıfırlanması sorunu düzeltildi"

2. **Dosya referansları**: Değiştirilen dosyaları tam yolu ile yaz
   ```
   ✓ backend/app/routes/events.py
   ✗ events.py
   ```

3. **Zaman damgası**: YYYY-MM-DD formatı (ISO 8601)
   ```
   ✓ 2026-06-11
   ✗ June 11, 2026
   ✗ 11.06.2026
   ```

4. **Kısaca ama net**: Her madde 1-2 satırda
   - Çok uzun metinler okumak zor
   - Kısaca yazıp önem kazandır

5. **Türkçe yazı**: Tüm checkpoint'ler Türkçe olmalı

6. **Testlenmiş olması**: Checkpoint yazmadan önce test et
   - API endpoint'leri çalışır mı?
   - Frontend bileşenler render olur mu?
   - Database'de veri var mı?

## Checkpoint Örneği (Tam)

```markdown
# Checkpoint - 2026-06-11 - Admin Panel Materials

## Yapilanlar
- Admin panelde event kapak resmi (materials) seçim widgeti eklendi
- Presigned URL generation backend'de otomatik yapılıyor
- Event update API'ye materials payload'u eklendi
- Bug fix: Event update'de materials alanının sıfırlanması sorunu düzeltildi

## Degisen Dosyalar
- backend/app/models/event.py
- backend/app/routes/events.py
- web/components/admin-dashboard.tsx

## Notlar
- PostgreSQL: Herhangi bir yeni migration gerekli değil (materials_json zaten var)
- AWS S3 bucket izinleri kontrol edildi
- Presigned URL TTL: 3600 saniye (1 saat)
- API backward compatible: eski endpoint'ler hala çalışıyor

## Sorunlar ve Çözümler
- **Sorun**: Materials JSON'ı frontend'den gönderilmediğinde sıfırlanıyor
  - **Çözüm**: Backend'de gönderilen payload'a bakıp materials varsa güncelle, yoksa eski değeri koru
  - **Dosya**: backend/app/routes/events.py satır 145-160

- **Sorun**: Medya URL'leri presigned değil, direct S3 path
  - **Çözüm**: Event serialization'da media URL'leri presigned URL'ye dönüştür
  - **Dosya**: backend/app/models/event.py satır 45-60

## Yarin Devam Icin
1. Backend ve web servislerini restart et
2. Admin panelde test et: http://localhost:3000/admin?event=liwa-fest
3. Fotografçı uygulaması ile test et
4. Kapak resmi değişikliklerini kaydet ve kontrol et
5. Mobil uygulamada responsive test et
```

---

**İpucu**: Checkpoint yazarken, 3 ay sonra bunu okuyacak biri (hatta siz) anlar mı diye düşün!
