# Checkpoint - 2026-03-31

## Yapilanlar
- Liwa Fest kapak gorseli kaybolma sorunu incelendi.
- `events` update akisinda `materials` alaninin istemci tarafindan gonderilmedigi durumda `materials_json` alaninin sifirlanmasi engellendi.
- Admin panelde genel etkinlik guncelleme (`handleUpdateEvent`) materyalleri de payload'a dahil edecek sekilde guncellendi.
- Event API serialization akisinda `materials` icindeki medya URL'leri imzali (presigned) URL'ye cevrilecek sekilde guncellendi.
- `liwa-fest` etkinligi icin `selected_cover` ve `covers` alanlari tekrar dolu hale getirildi.

## Degisen Dosyalar
- backend/app/routes/events.py
- web/components/admin-dashboard.tsx

## Notlar
- Klasorde aktif bir `.git` deposu bulunmuyor, bu nedenle commit alinmadi.
- Local sunucular (backend/frontend) kapatildi.

## Yarin Devam Icin
1. `backend` ve `web` servislerini yeniden baslat.
2. `http://127.0.0.1:3000/admin?event=liwa-fest` adresinden kapak gorunurlugunu kontrol et.
3. Gerekirse kapak gorselini admin materyaller ekranindan tekrar sec ve kaydet.
