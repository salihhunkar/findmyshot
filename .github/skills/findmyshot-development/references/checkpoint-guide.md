# Checkpoint Inceleme Rehberi

Findmyshot projesi ilerlemesini takip etmek için checkpoint sistem kullanılır. Her checkpoint, yapılan işlerin tarihli kaydıdır.

## Checkpoint Dosyaları Nerede Bulunur

```
docs/checkpoint-YYYY-MM-DD-[başlık].md
```

Örneğin:
- `docs/checkpoint-2026-03-31-liwa-fest.md` - Liwa Festivali checkpoint'i
- `docs/checkpoint-2026-03-13-onboarding.md` - Onboarding checkpoint'i

## Checkpoint Dosyası Yapısı

Standart başlıklar:

### 1. Yapilanlar (Completed Tasks)
Tamamlanan işlerin maddeleri:
```
- Liwa Fest kapak gorseli kaybolma sorunu incelendi
- Admin panelde etkinlik güncelleme özelliği iyileştirildi
```

### 2. Degisen Dosyalar (Changed Files)
Değiştirilmiş dosyaların listesi:
```
- backend/app/routes/events.py
- web/components/admin-dashboard.tsx
```

### 3. Notlar (Notes)
Önemli bilgiler ve uyarılar:
- Veritabanı değişiklikleri
- Konfigürasyon ayarları
- Bilinen sorunlar (known issues)
- Dikkat edilmesi gereken hususlar

### 4. Yarin Devam Icin (Next Steps)
Sonraki geliştirme aşamasında yapılması gereken işler:
```
1. Servisleri yeniden başlat
2. API endpoint'lerini test et
3. Frontend bileşenini kontrol et
```

## Checkpoint Okuma Sırasından

1. **En son checkpoint dosyasını aç**
   - Hangi tarihte son güncelleme yapıldığını gör
   
2. **"Yapilanlar" bölümünü oku**
   - Proje nedir durumda olduğunu anla
   
3. **"Degisen Dosyalar" listesini kontrol et**
   - Hangi dosyalar kimin tarafından ne sebeple değiştirildi
   - Bu dosyaları incelemek isteyip istememizi belirle
   
4. **"Notlar" bölümünü dikkatle oku**
   - Sorunlar ve çözümler
   - Beklemekte olan işler
   
5. **"Yarin Devam Icin" adımlarını takip et**
   - Geliştirmeyi kaldığı yerden başlat

## Checkpoint Inceleme Komutu

Checkpoint'i hızlı açmak için:

```bash
# En yeni checkpoint dosyasını bul
ls -t docs/checkpoint-*.md | head -1

# Veya spesifik checkpoint'i aç
cat docs/checkpoint-2026-03-31-liwa-fest.md
```

## Checkpoint'i Anlamak İçin Sorular

- Hangi sorun çözülüyor?
- Hangi API endpoint'leri değişti?
- Veritabanı şeması değişti mi?
- Yeni bağımlılıklar (dependencies) eklendi mi?
- Frontend bileşenleri güncellendiğinde uyumluluğun korundu mu?

## Checkpoint'i Takip Etme Kontrol Listesi

- [ ] En son checkpoint dosyasını oku
- [ ] "Degisen Dosyalar" içinde hangileri ilgilendirir öğren
- [ ] Önemli notları anla
- [ ] Sonraki adımları takip etmeyi planla
- [ ] Gerekirse eski checkpoint'leri karşılaştır (tarih sırası)

## Checkpoint Arşivi

Proje ilerlemesinin komple tarihi `docs/` klasöründe saklanır:
- Her checkpoint, o gün yapılan işlerin özetidir
- Tarih sırası ile okuyarak proje evrimini görebilirsin
- Hangi sorunun ne zaman çözüldüğünü bulmak için kullanışlı
