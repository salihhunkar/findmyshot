# FindMyShot Checkpoint - 2026-03-13

## Kapsam
- Homepage ve login ekranlari Photier referansina yakin yeni duzende.
- Yeni onboarding sayfasi 4 adimli akis ile eklendi.
- Login sonrasi kullanici onboarding durumuna gore yonlendiriliyor.

## Backend
- `OnboardingProfile` modeli eklendi.
- `User` modeli ile one-to-one iliski baglandi.
- `init_db` model import listesine onboarding eklendi.
- Yeni auth endpointleri:
  - `POST /api/auth/register`
  - `GET /api/auth/onboarding`
  - `POST /api/auth/onboarding/verify-email`
  - `PUT /api/auth/onboarding/profile`
  - `POST /api/auth/onboarding/complete`
- Eski kullanicilar icin onboarding kaydi yoksa varsayilan adim `4` (geriye donuk uyumluluk).

## Frontend
- `/login`: token alindiktan sonra `/api/auth/onboarding` ile adim kontrolu.
- `/onboarding`:
  - Adim 1: register
  - Adim 2: verify-email
  - Adim 3: profile update
  - Adim 4: complete -> `/admin`
- Onboarding formu icin ek CSS sinifi eklendi.

## Dogrulama
- `cd backend && python3 -m compileall app` basarili.
- `cd web && npm run build` basarili.

## Not
- Verify-email adimi su an simule calisiyor; gercek e-posta servisi entegrasyonu henuz yok.

---

## Devam Notu - 2026-03-14

### Bugun Tamamlananlar
- Event olusturma akisi (`/events/create`) Photier referansina daha yakin hale getirildi.
- Adim 3 (Tanitim Materyalleri):
  - Kapak yukleme + secim galerisi eklendi.
  - Yatay/Dikey cerceve yukleme ve onizleme eklendi.
  - Logo yukleme + konum/boyut slider kontrolleri eklendi.
  - QR merkez logo yukleme eklendi.
  - Logo yerlesimi icin hizli preset butonlari ve canvas uzerinde `+` hotspotlari eklendi.
  - Logo onizlemesine surukle-birak ile canli konumlandirma eklendi.
  - Cerceve onizlemelerine Photier hissine yakin rehber noktalar eklendi.
  - Secilen materyaller backend'e kalici olarak kaydedilecek sekilde baglandi.
- Adim 4 (Fotografcilar):
  - Tablo duzeni yerine kart/alan bazli form duzenine gecildi.
  - `+ Ekle` ve `Sil` akisi korundu.
- Adim 5 (Ayarlar):
  - Solda acik/kapali secimi, sagda aciklama olacak sekilde iki kolonlu satir yapisi uygulandi.
  - Konum giris satiri + harita placeholder bolumu eklendi.
  - Yasal sozlesme satiri en alta tasindi.
- Adim 6 (Tebrikler):
  - "Etkinlik Adi" alt basligi eklendi.

### Guncellenen Dosyalar
- `backend/app/models/event.py`
- `backend/app/routes/events.py`
- `backend/app/database.py`
- `web/app/events/create/page.tsx`
- `web/app/events/detail/page.tsx`
- `web/app/globals.css`

### Dogrulama
- `cd backend && ./venv/bin/python -m compileall app` basarili (14 Mart 2026).
- `cd backend && ./venv/bin/python -c "from app.database import init_db; init_db(); print('init_db_ok')"` basarili (14 Mart 2026).
- `cd web && npm run build` basarili (14 Mart 2026).

### Yarinki Ilk Adim
- Public etkinlik sayfasi (`/e/[slug]`) ve ilgili ekranlarda kaydedilen tanitim materyallerini gorsel olarak kullan.

---

## Devam Notu - 2026-03-15

### Bugun Tamamlananlar
- Public etkinlik sayfasi (`/e/[slug]`) kaydedilen kapak, logo, QR kimligi ve cerceve onizlemelerini kullanacak sekilde guncellendi.
- Guest arama akisinda sonuc kartlari ve modal onizleme, etkinlik materyallerini branded overlay olarak gosterecek sekilde baglandi.
- Guest sonuc gorsellerinde fotograf yonune gore yatay/dikey cerceve secimi eklendi.
- Admin event listesi ve event detail yan kartlari, kaydedilen kapak gorsellerini kullanacak sekilde guncellendi.
- Admin "Secili etkinlik" ozet karti, kapak ve logo materyalini gosterecek sekilde zenginlestirildi.
- Yeni public event feed endpoint'i (`GET /api/events/public-feed`) eklendi.
- Ana sayfa gercek recent event verisi, kapak gorselleri ve photo count bilgileriyle beslenir hale getirildi.
- Admin dashboard ust metrik kartlari, etkinlik ve foto sayilarini gercek liste verisinden gosterecek sekilde baglandi.
- Yeni dashboard summary endpoint'i (`GET /api/events/dashboard-summary`) eklendi.
- Admin dashboard ust metrik kartlari toplam yuz, yaklasan etkinlik ve fotografci sayisini gercek aggregate veriden gosterecek sekilde guncellendi.
- Admin etkinlik galerisindeki foto kartlarinda gorulen asiri uzun/bozuk gorsel orani sorunu duzeltildi; thumbnail + sabit card media stili baglandi.
- Admin overview metrikleri taslak/gecmis/medyasi hazir gibi daha semantik etkinlik durumlariyla genisletildi.
- Event kartlarindaki `...` menusu icin delete akisi guclendirildi; UI click izolasyonu eklendi ve local smoke test ile gecici event olusturup silme akisi dogrulandi.
- `Photo -> Download` iliskisinde delete cascade eklenerek etkinlik silme zinciri saglamlastirildi.
- Admin etkinlik formuna durum yonetimi eklendi (`draft / published / completed`).
- Event kartlarinda durum chip'i gosterilmeye baslandi ve `...` menusu daha guvenilir inline aksiyon satirina donusturuldu.
- Public event feed varsayilan olarak sadece `published` etkinlikleri gosterecek sekilde filtrelendi.
- Homepage bos durum metinleri, `published` mantigina gore guncellendi; draft etkinliklerin ana sayfada niye gorunmedigi artik daha net.
- Public event detail (`/e/[slug]`) icin draft etkinlikler public endpoint'te gizlendi; admin token ile `?preview=1` akisi eklendi.
- Admin panelindeki guest/onizleme linkleri status-aware hale getirildi; draft etkinlikler artik otomatik olarak preview linkiyle aciliyor.
- Admin form, toolbar ve sidebar dilinde status'a gore ayri aksiyon metinleri kullanilmaya baslandi: taslak icin onizleme, published icin canli link, completed icin arsiv linki.
- Event detail ve public guest sayfasi da status'a gore `Onizleme / Canli / Arsiv` rozetleri ve uygun acilis linkleriyle guncellendi.
- Admin sidebar event listesine status filtreleri eklendi; ekip artik `Tum / Taslak / Canli / Arsiv` segmentleriyle etkinlikleri hizlica ayirabiliyor.
- Filtre degisiminde gorunur listedeki ilk uygun etkinlik otomatik seciliyor, bos filtre durumunda da net bir empty state gosteriliyor.
- Event listesine hizli arama alani eklendi; baslik, slug, konum ve tarih uzerinden aninda filtreleme yapilabiliyor.
- Status filtreleri artik tarih filtresiyle birlikte calisiyor; `Tum Tarihler / Yaklasan / Gecmis / Tarihsiz` secenekleri buyuk listelerde taramayi hizlandiriyor.
- Admin sidebar event listesi icin siralama secenegi eklendi; ekip `Son Eklenen / Tarih Artan / Tarih Azalan / Ada Gore` duzenleri arasinda gecebilir.
- Event listesi filtreleri, siralama tercihi ve secili etkinlik artik local storage'da tutuluyor; panel yeniden acildiginda kullanici kaldigi gorunume donuyor.
- Dashboard metrik kartlari filtre kisayollarina donusturuldu; `Taslak`, `Yaklasan`, `Gecmis`, `Medyasi Hazir` ve `Kapak Hazir` kartlari event listesini tek tikla ilgili gorunume tasiyor.
- Metrik kartlarindan gelen hizli filtreler sidebar'daki yeni `Tum Icerik / Medyasi Hazir / Kapak Hazir` satiri ile senkron calisiyor.
- Admin event listesi filtre durumu artik URL query parametrelerine de yaziliyor; `status`, `date`, `quick`, `q`, `sort` parametreleri ile ayni admin gorunumu paylasilabilir hale geldi.
- URL'de filtre parametresi varsa admin panel acilisinda local storage yerine URL state'i esas aliniyor; boylece paylasilan link deterministik sekilde ayni segmenti acar.
- Secili etkinlik artik `event=<slug>` query parametresiyle de URL'e yaziliyor; admin panel paylasildiginda dogrudan ilgili etkinlik aciliyor.
- URL'de `event` varsa admin acilisinda bu slug once cozuluyor, local storage'daki son secim ancak URL yoksa fallback olarak kullaniliyor.
- Admin sidebar'a `Gorunumu Kopyala` aksiyonu eklendi; mevcut filtre + secili event kombinasyonu tek tikla kopyalanabiliyor.
- Admin share link akisi, URL query parametreleri ile senkron calistigi icin ekip ayni panel gorunumunu birbirine dogrudan iletebiliyor.
- Event listesi basligina aktif filtre ozeti chip'leri eklendi; kullanici su anki `durum / tarih / icerik / arama / siralama` baglamini tek bakista gorebiliyor.
- Aktif filtre ozetinin yanina `Tumunu Temizle` aksiyonu eklendi; secili etkinligi bozmadan liste filtreleri tek tikla varsayilana donuyor.
- Aktif filtre chip'leri artik tek tek kapatilabiliyor; kullanici sadece `durum`, `arama` ya da `siralama` gibi istedigi kriteri cikartabiliyor.
- Filtre chip'leri kaldirma aksiyonu URL ve local storage senkronu ile birlikte calisiyor; paylasilan admin gorunumu ayni sekilde sadeleştirilebiliyor.
- Admin sidebar'a mini preset gorunumler eklendi; ekip `Tum Etkinlikler`, `Taslak Kontrol`, `Canli Yaklasan`, `Arsiv Medya`, `Kapak Hazir` gorunumlerine tek tikla donebiliyor.
- Preset gorunumler mevcut filtre sistemiyle ayni state'i kullaniyor; aktif preset otomatik vurgulaniyor ve arama acikken preset secimi bilincli olarak pasiflesiyor.
- Preset sistemi kullaniciya ozel `Kayitli Gorunumler` katmaniyla genisletildi; ekip artik mevcut filtre setine isim verip local storage'da saklayabiliyor.
- Kayitli gorunumler acilabiliyor, aktif halde vurgulaniyor ve tek tek silinebiliyor; filtre, URL ve local storage akisi birlikte korunuyor.
- Kayitli gorunumlere favori sabitleme eklendi; sabitlenen gorunumler listenin ustune tasiniyor ve farkli bir vurgu ile isaretleniyor.
- Eski saved view kayitlari geriye donuk uyumlu sekilde `pinned: false` olarak normalize edilerek okunuyor.
- Kayitli gorunumler icin inline yeniden adlandirma akisi eklendi; kullanici artik yeni bir kayit acmadan mevcut gorunum adini guncelleyebiliyor.
- Rename akisi duplicate isim kontrolu ve bos isim guard'i ile korunuyor; kayitli gorunum listesi daha guvenli yonetiliyor.

### Guncellenen Dosyalar
- `web/app/e/[slug]/page.tsx`
- `web/components/guest-search-panel.tsx`
- `web/app/globals.css`
- `backend/app/routes/events.py`
- `web/components/admin-dashboard.tsx`
- `web/app/events/detail/page.tsx`
- `web/app/page.tsx`

### Dogrulama
- `cd web && npm run build` basarili (15 Mart 2026).
- `curl -s 'http://127.0.0.1:8001/api/events/public-feed?limit=2'` basarili (15 Mart 2026).
- `curl -s 'http://127.0.0.1:8001/api/events/dashboard-summary' -H 'Authorization: Bearer invalid'` auth korumasi ile dogru cevap dondu (15 Mart 2026).
- Gecici `Delete Smoke Test` etkinligi local API uzerinden olusturulup silindi, `DELETE /api/events/{id}` 204 dondu (15 Mart 2026).
- Gecici `Delete Linked Test` etkinligi icin photo + order + download bagli kayitlari ile delete zinciri test edildi, `DELETE /api/events/{id}` 204 dondu ve bagli kayitlar temizlendi (15 Mart 2026).
- Gecici `Published Feed Test` etkinligi `status=published` ile olusturuldu; `GET /api/events/public-feed?limit=4` icinde gorundu ve ardindan temizlendi (15 Mart 2026).
- Gecici `Draft Preview Test` etkinligi icin `GET /api/events/public/draft-preview-test` 404, `GET /api/events/slug/draft-preview-test` ise auth ile 200 dondu (15 Mart 2026).
- Merkezi gorunum sablonlarinin versiyon gecmisine diff ozetleri eklendi; admin artik her surum satirinda baslik, paket, aciklama, rol, durum ve filtre farklarini geri alma oncesi okuyabiliyor (16 Mart 2026).
- Merkezi gorunum sablonlarina degisiklik notu eklendi; admin her yeni surumde kisa bir neden yazabiliyor ve bu not history satirlarinda diff ile birlikte gorunuyor (16 Mart 2026).
- Merkezi gorunum sablonlarinin history alanina detayli karsilastirma paneli eklendi; admin aktif surumu secilen eski surumle yan yana gorup rollback oncesi tum alanlari tek ekranda okuyabiliyor (16 Mart 2026).
- Silinen merkezi sablonlar icin arsiv gecmisi eklendi; admin artik silinmis sablonlarin history kayitlarini ayri bolumde gorup isterse arsivi kalici olarak temizleyebiliyor (16 Mart 2026).
- Arsivden sablon geri yukleme akisi eklendi; admin ister son arsiv snapshot'ini ister secilen eski surumu tekrar aktif merkezi sablon olarak geri alabiliyor (19 Mart 2026).
- History icinde iki keyfi eski surumu birbiriyle karsilastirma secenegi eklendi; admin artik hem aktif hem arsiv history listelerinde iki farkli surumu secip alan alan yan yana okuyabiliyor (19 Mart 2026).
- Geri yuklenen merkezi sablonlar icin daha gorunur restore rozeti eklendi; aktif sablon kartlari ve history satirlari artik arsivden donen surumleri ayri bir vurgu ile gosteriyor (19 Mart 2026).
- Merkezi sablon history secimleri URL/query ile kalici hale getirildi; admin artik acik history panelini, aktif compare surumunu ve Kars. 1 / Kars. 2 secimlerini link uzerinden paylasip refresh sonrasi ayni gorunume donebiliyor (19 Mart 2026).
- Merkezi sablon compare panellerine direkt link kopyalama aksiyonu eklendi; admin artik aktif-vs-surum ve surum-vs-surum ekranlarini tek tikla ekip ile paylasabiliyor (19 Mart 2026).
- `/admin` dashboard yapisi sadeleştirildi; ana ekranda varsayilan olarak sadece Studio akisi (yukleme + galeri) kalirken, etkinlik ayarlari ve yogun sidebar ozellikleri butonlarla acilan ayri panellere tasindi (19 Mart 2026).
- Studio galerisine kompakt aksiyonlar eklendi; admin artik `Tum / Yuzu Olan / Isleniyor / Hazir` filtreleriyle galeri yogunlugunu azaltabiliyor ve `Standart / Kompakt Kart` gorunumu arasinda gecis yapabiliyor (19 Mart 2026).
- Sidebar bir tur daha sadeleştirildi; etkinlik listesi tekrar hos geldin alaninin hemen altina tasindi ve Studio ustundeki preview/yuklu/yuz ozeti kaldirilarak bu bilgi Etkinlik Ayarlari alaninda birakildi (19 Mart 2026).
- `/admin` sol menusu bir kez daha sadeleştirildi; `Yeni Etkinlik` ve yogun filtre alanlari soldan kaldirildi, etkinlik listesi yalnizca secim odakli bir rail haline geldi ve `Liste / Gorunumler / Ekip` detaylari Ayarlar icindeki sekmelere tasindi (19 Mart 2026).
- Studio ustundeki tekrar eden aksiyon karti kaldirildi; admin artik Studio ekranina girdiginde dogrudan yukleme alaniyla karsilasiyor ve preview/ayar aksiyonlari soldaki menu ile sagdaki ayarlar alaninda birakiliyor (19 Mart 2026).
- Studio galerisindeki `Standart Kart / Kompakt Kart` gecisi kaldirildi; galeri tek bir standart kart gorunumuyle sade tutuldu (19 Mart 2026).
- Admin main alandaki ust baslik metinleri kaldirildi; sag panel artik gereksiz `Dashboard / Yukleme Studyo` kopyasi olmadan dogrudan ilk icerik kartiyla basliyor (19 Mart 2026).
- Admin main alandaki ust `Studio / Ayarlar` sekmeleri de kaldirildi; etkinlik kartina tiklamak tekrar Studio'yu aciyor, `Ayarla` ve `Etkinligi Duzenle` aksiyonlari ise ayarlar ekranina goturuyor (19 Mart 2026).
- Ana sayfa `/` sadeleştirildi; sol hizli menu/yan rail kaldirildi ve `Listelenen etkinlik / Son galerilerde foto / Canli demo` ozet kartlari temizlenerek akis dogrudan `FindMyShot Pro / Kazanc Paketi` bolumunden baslatildi (19 Mart 2026).

### Sonraki Mantikli Adim
- Studio galerisine secim/toplu aksiyon katmani ekle.
