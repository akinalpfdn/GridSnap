<p align="center">
  <a href="README.md">🇬🇧 English</a>
</p>

<p align="center">
  <img src="icons/logo.svg" width="120" alt="GridSnap Logo" />
</p>

<h1 align="center">GridSnap</h1>

<p align="center">
  <strong>Hassas veriler için şifreli grid tabanlı not yöneticisi.</strong><br>
  SSH komutları, kimlik bilgileri, API anahtarları, kod parçacıkları — hepsi bir kısayol uzağınızda.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-D4915E?style=flat-square" alt="Versiyon" />
  <img src="https://img.shields.io/badge/tauri-v2-24C8D8?style=flat-square&logo=tauri&logoColor=white" alt="Tauri v2" />
  <img src="https://img.shields.io/badge/react-18-61DAFB?style=flat-square&logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/rust-secure-DEA584?style=flat-square&logo=rust&logoColor=white" alt="Rust" />
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="MIT Lisans" />
</p>

<p align="center">
  <img src="https://img.shields.io/badge/bundle-~8.5MB-blue?style=flat-square" alt="Paket Boyutu" />
  <img src="https://img.shields.io/badge/RAM-~30MB-blue?style=flat-square" alt="Bellek" />
  <img src="https://img.shields.io/badge/startup-<500ms-blue?style=flat-square" alt="Başlangıç Süresi" />
</p>

---

## Neden GridSnap?

Muhtemelen kimlik bilgileriniz, SSH komutlarınız, bağlantı stringleriniz ve API anahtarlarınız yapışkan notlar, metin dosyaları ve hızlı kopyala-yapıştır için tasarlanmamış parola yöneticileri arasında dağınık halde.

GridSnap size sistem trayde yaşayan **elektronik tablo benzeri bir grid** sunar. `Ctrl+Shift+Space` tuşuna basın, bir hücreye tıklayın — panoya kopyalandı. Her şey AES-256-GCM ile şifreli olarak saklanır.

**Bu bir parola yöneticisi değildir.** Her gün kopyala-yapıştır yaptığınız şeyler için hızlı, şifreli bir çalışma alanıdır.

---

## Özellikler

**Grid Motoru**
- Sanallaştırılmış 1000×26 grid — 60fps'de kaydırma
- Klavye ile gezinme (Ok tuşları, Tab, Enter, Escape)
- Yazarak düzenleme: yazmaya başlayın, hücre otomatik dolsun
- **Çoklu hücre seçimi** — tıkla & sürükle veya Shift+Ok ile aralık seçin
- Hücre üzerine gelin veya tıklayın — satır içi kopyalama butonu ile onay geri bildirimi
- `Ctrl+C` seçimi kopyalar (aralıklar için TSV formatı — Excel/Sheets'e yapıştırın)
- `Ctrl+V` TSV verisini seçili hücreden başlayarak grid'e yapıştırır
- Sütun boyutlandırma (50–600px), satır boyutlandırma (22–120px)
- Tüm hücrelerde anlık vurgulama ile arama
- `Ctrl+S` veya araç çubuğu butonu ile manuel kaydetme (otomatik kaydetme gecikmesi yok)

**Sayfalar**
- Renkli sekmelerle birden fazla sayfa
- Silme onayı ile ekleme, kaldırma, yeniden adlandırma
- `Ctrl+Tab` / `Ctrl+Shift+Tab` ile sayfa değiştirme
- **Sayfa maskeleme** — sekmeye sağ tıklayın → Sayfayı maskele, tüm değerler `●●●●` olarak gösterilir
- **Hücre bazlı maskeleme** — hücrelere sağ tıklayarak tek tek veya aralık olarak maskele/maskesini kaldır
- **Sayfa bazlı şifre koruması** — sekmeye sağ tıklayın → Şifre belirle (AES-256-GCM + Argon2id)
- Şifreli sayfalar her sekme değişikliğinde kilitlenir — oturum kalıcılığı yok
- Brute force koruması: 10 yanlış deneme → 2 dakika bekleme süresi (kalıcı, yeniden başlatmaya dayanır)
- Her sayfa bağımsız bir şifreye sahip olabilir

**Güvenlik**
- **Varsayılan olarak şifresiz** — ilk kurulumda doğrudan açılır, kurulum gerekmez
- İsteğe bağlı ana şifre (Ayarlar'dan vault'u şifrelemek için)
- İsteğe bağlı sayfa bazlı şifreler (vault şifresinden bağımsız)
- Argon2id anahtar türetme ile AES-256-GCM şifreleme (64MB bellek, 3 iterasyon)
- Anahtarlar kullanımdan sonra bellekten sıfırlanır
- Ağ erişimi yok, telemetri yok, bulut yok

**Masaüstü Entegrasyonu**
- **Her zaman üstte** — diğer uygulamalarda çalışırken görünür kalır
- Özel başlık çubuğu ile kenarlıksız pencere
- Göster/gizle geçişi ile sistem tepsisi
- Global kısayol tuşu (varsayılan `Ctrl+Shift+Space`, Ayarlar'dan yapılandırılabilir)
- Kapat butonu tepsiye küçültür — uygulama hazır kalır
- İsteğe bağlı sistem başlangıcında otomatik başlatma (Ayarlar'dan yapılandırılabilir)
- ~8.5MB paket, ~30MB RAM

**Temalar**
- Ayarlar'dan seçilebilir 11 yerleşik tema
- Carbon (varsayılan), Midnight, Ocean, Aurora, Deep Teal, Light, Velvet, Nordic, Rose, Terminal, Slate
- Tema oturumlar arasında kalıcıdır

---

## Kurulum

### İndirme

En son sürümü [**Releases**](../../releases) sayfasından indirin:

| Platform | Dosya |
|----------|-------|
| Windows (yükleyici) | `GridSnap_x.x.x_x64-setup.exe` |
| Windows (MSI) | `GridSnap_x.x.x_x64_en-US.msi` |

> macOS ve Linux sürümleri planlanmaktadır.

### Kaynaktan Derleme

**Gereksinimler:** [Node.js](https://nodejs.org/) 18+, [Rust](https://rustup.rs/) 1.70+

```bash
git clone https://github.com/akinalpfdn/GridSnap.git
cd GridSnap/gridsnap
npm install
npm run tauri dev      # Hot reload ile geliştirme
npm run tauri build    # Üretim derlemesi
```

---

## Kullanım

1. **İlk açılış** — doğrudan açılır, kurulum gerekmez
2. **Gezinme** — bir hücreye tıklayın veya ok tuşlarını kullanın
3. **Düzenleme** — çift tıklayın veya Enter'a basın, ardından yazın
4. **Kopyalama** — hücre üzerine gelip kopyala simgesine tıklayın veya `Ctrl+C` basın
5. **Yapıştırma** — TSV verisini kopyalayıp `Ctrl+V` ile birden fazla hücreyi doldurun
6. **Kaydetme** — `Ctrl+S` tuşuna basın veya araç çubuğundaki kaydet butonuna tıklayın
7. **Yeni sayfa** — sekme çubuğundaki `+` butonuna tıklayın
8. **Sayfa değiştirme** — bir sekmeye tıklayın veya `Ctrl+Tab` / `Ctrl+Shift+Tab`
9. **Sayfa maskeleme** — sekmeye sağ tıklayın → Sayfayı maskele
10. **Hücre maskeleme** — hücreleri seçin, sağ tıklayın → Hücreleri maskele
11. **Sayfa şifresi** — sekmeye sağ tıklayın → Şifre belirle
12. **Ana şifre belirleme** — vault'u şifrelemek için Ayarlar'a gidin
13. **Gizleme** — `Ctrl+Shift+Space` tuşuna basın veya pencereyi kapatın (tepsiye gider)
14. **Çıkış** — tepsi simgesine sağ tıklayın → Çıkış

---

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Kabuk | Tauri v2 (~8.5MB paket, yerel OS webview) |
| Ön Yüz | React 18 + TypeScript |
| Stillendirme | CSS Modules + CSS Custom Properties |
| Grid | Özel sanallaştırılmış renderer (prefix-sum + binary search) |
| Durum Yönetimi | Zustand |
| Derleme | Vite 6 |
| Şifreleme | AES-256-GCM + Argon2id (Rust) |
| Depolama | Şifreli JSON vault (Rust fs) |

---

## Proje Yapısı

```
gridsnap/
├── src/                    # React ön yüz
│   ├── components/         # Grid, Sayfalar, Araç Çubuğu, Kilit Ekranı
│   ├── hooks/              # Gezinme, boyutlandırma, pano, arama
│   ├── stores/             # Zustand (vaultStore)
│   ├── services/           # Tauri IPC köprüsü (vault, pano, kısayol, otomatik başlatma, sayfa şifresi)
│   ├── theme/              # CSS token'ları + temalar
│   ├── types/              # TypeScript tanımları
│   └── utils/              # Grid matematiği, hücre anahtarları, debounce
│
├── src-tauri/              # Rust arka uç
│   ├── src/commands/       # IPC işleyicileri (vault, pano, kısayol, otomatik başlatma, sayfa şifresi)
│   ├── src/services/       # Şifreleme, depolama, vault yöneticisi
│   ├── src/models/         # Vault, Sheet, Settings yapıları
│   └── src/tray.rs         # Sistem tepsisi kurulumu
│
└── icons/                  # Uygulama simgeleri (tüm platformlar)
```

---

## Klavye Kısayolları

| Kısayol | Eylem |
|---------|-------|
| `Ctrl+Shift+Space` | Pencereyi aç/kapat (global, yapılandırılabilir) |
| `Ok tuşları` | Hücreler arası gezinme |
| `Shift+Ok` | Seçim aralığını genişlet |
| `Tab` / `Shift+Tab` | Sağa / sola git |
| `Enter` | Hücreyi düzenle / aşağı git |
| `Escape` | Düzenlemeyi durdur / seçimi kaldır |
| `Ctrl+C` | Hücre değerini kopyala (aralıklar için TSV) |
| `Ctrl+V` | TSV verisini grid'e yapıştır |
| `Ctrl+Tab` | Sonraki sayfa |
| `Ctrl+Shift+Tab` | Önceki sayfa |
| `Ctrl+S` | Vault'u kaydet |
| `Delete` | Hücreyi veya seçili aralığı temizle |
| Herhangi bir tuş | Seçili hücreyi yazarak düzenle |

---

## Temalar

GridSnap, Ayarlar'dan seçilebilir **11 yerleşik tema** ile gelir. Varsayılan **Carbon** teması, amber aksanlı sıcak bir koyu temadır.

Mevcut temalar: Carbon, Midnight, Ocean, Aurora, Deep Teal, Light, Velvet, Nordic, Rose, Terminal, Slate.

Temalar CSS custom properties (`--theme-*`) kullanır. Özel tema oluşturmak için `src/theme/themes.ts` dosyasına renk tanımlarınızla bir giriş ekleyin — bileşen değişikliği gerekmez.

---

## Güvenlik Modeli

- **Varsayılan olarak şifresiz** — şifre belirlenmeden vault düz metin JSON olarak saklanır
- **İsteğe bağlı vault şifreleme**: AES-256-GCM şifrelemeyi etkinleştirmek için Ayarlar'dan ana şifre belirleyin
- **Sayfa bazlı şifreler**: Her sayfa kendi şifresine sahip olabilir (vault şifresinden bağımsız)
  - Doğrulama token'ını AES-256-GCM + Argon2id ile şifreler — düz metin hash saklanmaz
  - Sayfalar her sekme değişikliğinde yeniden kilitlenir (oturum kalıcılığı yok)
  - 10 başarısız deneme → 2 dakika bekleme süresi, vault'ta kalıcı (yeniden başlatarak atlanamaz)
  - Yalnızca doğru şifre deneme sayacını sıfırlar
- **Anahtar türetme**: Argon2id (64MB bellek, 3 iterasyon, 4 paralellik)
- **Depolama formatı** (şifreli): `[salt 16B | nonce 12B | şifreli metin | tag 16B]`
- **Bellek güvenliği**: Hassas veri temizliği için `zeroize` kullanan Rust arka uç
- **Ağ yok**: uygulama sıfır dış bağlantı yapar

---

## Katkıda Bulunma

Katkılarınızı bekliyoruz! Lütfen:

1. Repo'yu fork'layın
2. Bir feature branch oluşturun (`git checkout -b feature/harika-ozellik`)
3. Değişikliklerinizi commit'leyin
4. Push yapın ve PR açın

---

## Lisans

[MIT](LICENSE)

---

<p align="center">
  <sub>Tauri, React ve Rust ile geliştirildi. Varsayılan olarak şifreli.</sub>
</p>
