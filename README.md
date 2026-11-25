# ArctaBooth

ArctaBooth adalah aplikasi photobooth berbasis web yang awalnya dikembangkan sebagai proyek pribadi untuk mengisi waktu liburan sekolah. Pengguna dapat mengambil foto melalui kamera, memilih template, menyusun hasil foto, dan menerima tautan hasil sesi.

## Cara penggunaan

1. Pilih template bawaan atau unggah template sendiri (maksimal 12 MB). Waktu pemilihan tersedia selama 2 menit.
2. Ambil foto secara manual selama sesi 5 menit. Foto yang diterima disimpan ke galeri dan dapat ditempatkan pada slot template.
3. Gunakan waktu finishing 2 menit untuk mengatur foto, mengganti isi slot, dan memilih filter.
4. Aplikasi menyiapkan hasil foto, GIF dan video sesuai kemampuan browser. Setelah penyimpanan berhasil, tautan folder Google Drive dapat dibagikan melalui QR atau email.

## Teknologi

- Next.js 14, React 18, TypeScript, Tailwind CSS 3.
- Browser Camera API dan Canvas untuk pengambilan serta komposisi foto.
- html2canvas dan gifenc untuk pembuatan media.
- Vercel Blob sebagai penyimpanan perantara, Google Drive sebagai tujuan penyimpanan sesi, dan Resend untuk pengiriman email.

## Pengembangan lokal

Gunakan Node.js yang kompatibel dengan Next.js 14 dan akses kamera melalui localhost atau HTTPS.

```sh
npm ci
npm run dev
```

Buka http://localhost:3000. Untuk build production, jalankan `npm run build` dan `npm run start`.

## Konfigurasi integrasi

Simpan konfigurasi berikut pada environment server lokal atau Vercel, tanpa memasukkan nilainya ke Git:

| Variable | Kegunaan |
| --- | --- |
| `BLOB_READ_WRITE_TOKEN` | Upload media ke Vercel Blob |
| `GOOGLE_CLIENT_ID` | OAuth Google |
| `GOOGLE_CLIENT_SECRET` | Rahasia OAuth Google |
| `GOOGLE_REFRESH_TOKEN` | Pembaruan token akses server |
| `GOOGLE_DRIVE_PARENT_FOLDER_ID` | Folder induk hasil sesi |
| `RESEND_API_KEY` | Pengiriman email |
| `RESEND_FROM_EMAIL` | Alamat pengirim yang sesuai konfigurasi Resend |

Integrasi penyimpanan dan email membutuhkan konfigurasi yang valid. Pengiriman email ke pengguna umum memerlukan pengaturan pengirim yang sesuai. Keberhasilan deployment atau pengiriman media tidak diverifikasi dalam pembaruan dokumentasi ini.

## Struktur aplikasi

- `app/page.tsx`: alur sesi, pengaturan template, finishing, dan pengiriman hasil.
- `app/api/templates/`: daftar template bawaan.
- `app/api/sessions/`: upload media, pembuatan folder Drive, dan email.
- `components/`: komponen kamera, galeri, dan antarmuka.
- `lib/`: template, filter, dan analisis frame.

## Privasi dan pengembangan lanjutan

Folder hasil sesi saat ini dibagikan dengan izin siapa pun yang memiliki tautan. Vercel Blob juga menggunakan URL publik sebagai penyimpanan perantara. Gunakan data uji non-sensitif sampai persetujuan berbagi, pembatasan akses, kuota, penghapusan file perantara dan kebijakan retensi tervalidasi.

Pengujian lanjutan perlu mencakup pemetaan slot 6/8 foto (termasuk urutan terbalik pada kolom kanan), koreksi geometri template, overlay dekorasi di atas foto, galeri dengan lebih banyak foto daripada slot, finalisasi saat timer habis, GIF per pengambilan dan video tanpa audio, kompatibilitas kamera, penghentian rekaman, pemulihan saat upload gagal, aksesibilitas, serta validitas tautan QR. Ini adalah target verifikasi, bukan klaim bahwa seluruhnya sudah lulus.

README ini merangkum implementasi yang diperiksa dan target pengembangan dari spesifikasi sebelumnya.
