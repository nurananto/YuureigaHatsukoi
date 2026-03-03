# Moshimo, Yuurei ga Hatsukoi o Shitara

> Aku adalah Sōta. Cowok SMA otaku introvert tanpa pengalaman cinta… ya, dulu sih begitu. Apa? Kau pikir aku sudah kehilangan perjaka dan berubah jadi anak gaul? Bukan, bukan itu. Bukan lagi 'cowok SMA' — karena sekarang aku sudah jadi hantu. Dengan kata lain, aku adalah mantan manusia… seorang otaku introvert perjaka yang sudah meninggal. Aku hampir tidak ingat apa pun tentang kehidupan sebelumnya, dan satu-satunya hal yang tersisa di ingatanku hanyalah fakta bahwa aku masih perjaka. Mungkin itu adalah penyesalan terakhirku. Dan entah bagaimana, saat tersadar, aku tidak bisa keluar dari sekolah khusus perempuan ini — aku terperangkap, jadi semacam jiwari rei (hantu terikat tempat). Jujur, aku benar-benar bingung waktu itu. Tapi meski saat hidup aku ini cowok introvert yang terlalu takut buat ngomong ke cewek… kalau sudah jadi hantu, aku bisa lihat berbagai macam penampilan cewek — yang begini, yang begitu — tanpa batas! Ada rasa bersalah sih… tapi jadi hantu juga nggak buruk-buruk amat! Tapi belum lama kemudian, aku melihat gantungan kunci karakter favoritku jatuh di dalam sekolah. Aku pun hendak memungutnya, dan— 'Kenapa ada laki-laki… di sekolah khusus perempuan…?' Dia itu cewek yang manis, baik hati, mudah akrab dengan siapa saja, populer… dan satu-satunya yang bisa melihat keberadaanku sebagai hantu serta peduli padaku. Dan aku pun jatuh cinta pada seorang gadis… yang jelas berada di luar jangkauanku.

---

## Info

| | |
|---|---|
| Judul | Moshimo, Yuurei ga Hatsukoi o Shitara |
| Judul Alternatif | もしも、幽霊が初恋をしたら |
| Author | Shichifuku Sayuri |
| Tipe | Webtoon (Berwarna) |
| Genre | Shounen · Comedy · Drama · Romance · Horror · Mystery · Ghost |

## Link

- [MangaDex](https://mangadex.org/title/832a0bcb-f58a-4118-9130-43c03d289a8d/moshimo-yuurei-ga-hatsukoi-o-shitara)
- [Raw](https://bookwalker.jp/series/494400/)

---

## Struktur

```
YuureigaHatsukoi/
├── manga-config.json     # Metadata manga
├── manga.json            # Data chapter (auto-generated)
├── manga-automation.js   # Script automation
├── encrypt-manifest.js   # Script enkripsi manifest
├── daily-views.json      # Data views harian
└── <chapter>/
    └── manifest.json     # Daftar halaman (encrypted)
```

## Automation

Semua proses berjalan otomatis via GitHub Actions:

1. Push chapter baru (folder + manifest.json)
2. `encrypt-manifest.yml` — enkripsi manifest
3. `manga-automation.yml` — regenerate manga.json
4. Trigger rebuild ke website utama
5. `sync-cover.yml` — sinkronisasi cover dari website

---

Bagian dari [Nurananto Scanlation](https://nuranantoscans.my.id)