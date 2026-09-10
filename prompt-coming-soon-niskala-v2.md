# Prompt: Coming Soon Mode — Niskala (disesuaikan struktur repo asli)

Copy-paste seluruh isi di bawah ini ke AI agent kamu (Lovable / Claude Code / dsb).

---

## Prompt

Saya punya website Niskala (fashion wanita: homedress, sleepdress, pajamas) — Vite + TypeScript + React + shadcn-ui + Tailwind + Supabase, sudah live di `niskalawear.com`.

Saya ingin menambahkan **"Coming Soon Mode"**: toggle yang saya nyalakan dari database, yang saat aktif akan me-redirect **semua pengunjung** ke halaman coming soon, **kecuali** user yang login dengan role privileged (owner/admin/co-owner). Toggle harus bisa diubah tanpa redeploy.

**PENTING — langkah pertama sebelum menulis kode apa pun:**

Project ini sudah punya beberapa bagian yang relevan, jangan dibuat ulang dari nol:

1. Baca `src/components/ComingSoon.tsx` — komponen ini sudah ada. Cari tahu apakah sudah dipakai di route manapun di `src/App.tsx`, dan seberapa lengkap isinya sekarang.
2. Baca `src/hooks/useAuth.tsx` — ini kemungkinan sudah menyediakan info user yang sedang login dan/atau role-nya. Gunakan hook ini kalau sudah cukup, jangan bikin hook auth baru yang duplikat.
3. Baca migration `supabase/migrations/20260831000000_add_co_owner_and_invite_system.sql` dan migration-migration setelahnya (terutama yang menyentuh RLS/role seperti `20260909000004_rls_policies_v2.sql`) untuk menemukan: nama tabel role (apakah `profiles.role`, `user_roles`, atau lainnya), nama enum/type role yang dipakai, dan value yang tersedia (`owner`, `admin`, `co_owner`, dst). **Gunakan struktur role yang sudah ada ini apa adanya** — jangan buat tabel/enum role baru.
4. Baca `src/pages/admin/Users.tsx` untuk melihat pola query role yang sudah dipakai di project (supaya konsisten).
5. Baca `src/pages/Auth.tsx` untuk tahu path route login yang sebenarnya (dipakai nanti untuk allowlist).
6. Baca `src/App.tsx` untuk memahami struktur routing yang sudah ada sebelum menambahkan gate di atasnya.
7. Lihat isi `src/assets/logo/Logo NISKALA Circle.svg` dan `Logo NISKALA Typografi.svg` — pakai aset logo asli ini di halaman coming soon, jangan bikin logo baru.

Setelah itu, baru implementasikan:

### 1. Database — hanya yang belum ada

- Buat tabel single-row baru `site_settings` (kolom `coming_soon_enabled boolean default false`) **hanya jika belum ada tabel setting sejenis** di migration yang ada.
- RLS: `site_settings` bisa dibaca siapa saja (termasuk anon/belum login, karena flag ini harus dicek sebelum tahu user boleh akses atau tidak), tapi hanya bisa di-`UPDATE` oleh role privileged — pakai function `has_role`/`is_privileged` kalau sudah ada di migration lama, atau buat function baru dengan pola yang sama (security definer) kalau belum ada, mengacu ke enum role yang sudah ditemukan di langkah riset di atas.
- Tulis sebagai migration file baru dengan format nama timestamp yang sama seperti migration lain di folder ini.

### 2. Logic redirect di frontend

- Buat hook `useComingSoonSetting()`: ambil `coming_soon_enabled` dari `site_settings`, subscribe Supabase Realtime supaya semua tab ikut update saat di-toggle dari device lain.
- Untuk info role/privileged user, **pakai ulang `useAuth.tsx`** kalau sudah menyediakan role; kalau belum, tambahkan role ke situ daripada bikin hook terpisah.
- Buat komponen `ComingSoonGate` yang membungkus `<Routes>` di `App.tsx`:
  - `coming_soon_enabled = true` DAN user tidak login atau bukan privileged DAN path saat ini bukan halaman login (dari `src/pages/Auth.tsx`) atau bukan halaman coming soon itu sendiri → redirect ke halaman coming soon.
  - `coming_soon_enabled = true` DAN user privileged mengakses halaman coming soon secara manual → redirect ke `/`.
  - Selama status setting/role masih loading → render blank/spinner singkat, jangan redirect prematur.
- Pasang `ComingSoonGate` di `src/App.tsx` membungkus `<Routes>` yang sudah ada, tanpa mengubah definisi route satu-satu.

### 3. Halaman Coming Soon — enhance `src/components/ComingSoon.tsx` yang sudah ada

Jangan bikin file baru kalau `ComingSoon.tsx` sudah ada — audit isinya dulu, lalu sesuaikan/rapikan supaya:

- Pakai logo asli dari `src/assets/logo/Logo NISKALA Circle.svg` dan/atau `Logo NISKALA Typografi.svg`.
- Headline singkat bernada tenang (contoh: "Ruang istirahatmu, segera hadir."), body copy soal koleksi homedress/sleepdress/pajamas yang sedang disiapkan.
- Badge kecil "Coming Soon" bergaya sama seperti badge "Coming Soon" yang sudah dipakai di `ProductCard.tsx`/halaman Shop — konsisten, jangan bikin gaya badge baru.
- Link sosial media (Instagram, TikTok — pakai komponen ikon `src/components/icons/TikTok.tsx` yang sudah ada untuk TikTok).
- Tanpa form email, tanpa countdown — cukup teks, visual, dan link sosial.
- Styling pakai Tailwind + token warna/font yang sudah didefinisikan di `tailwind.config.ts` (kalau brand color Niskala — krem, emas, terracotta, dusty rose — sudah ada di situ, pakai token itu; kalau belum ada, baru tambahkan).
- Fully responsive, satu animasi masuk yang halus saat load, hormati `prefers-reduced-motion`.

### 4. Toggle switch untuk admin

- Tambahkan `Switch` (dari `src/components/ui/switch.tsx`) berlabel "Mode Coming Soon" di tempat paling masuk akal di area admin (lihat `src/pages/admin/Dashboard.tsx` atau `src/pages/admin/Profile.tsx` — pilih yang paling sesuai dengan pola halaman settings yang sudah ada, atau buat halaman admin settings baru kalau memang belum ada tempat yang cocok).
- Hanya tampilkan toggle ini untuk role privileged.
- Saat di-switch, update `site_settings.coming_soon_enabled` via `src/integrations/supabase/client.ts`.

### 5. Acceptance criteria

- `coming_soon_enabled = false`: semua route berjalan normal seperti sekarang.
- `coming_soon_enabled = true`:
  - Visitor anonim ke route mana pun → redirect ke halaman coming soon.
  - Visitor anonim ke halaman login (`src/pages/Auth.tsx`) → tetap bisa diakses, tidak di-redirect.
  - User login role non-privileged (customer) → tetap di-redirect ke coming soon.
  - User login role privileged (owner/admin/co-owner) → akses semua route normal; kalau ketemu halaman coming soon, dilempar ke `/`.
  - Toggle di admin di-switch → tab lain yang terbuka ikut update tanpa refresh manual (via Realtime).

Di akhir, tolong laporkan:
- File apa saja yang kamu buat/ubah.
- Nama tabel/enum role yang ternyata dipakai (hasil dari riset migration di atas), supaya saya tahu persis apa yang terjadi di database.
- Kalau `ComingSoon.tsx` yang sudah ada ternyata sudah cukup lengkap dan kamu hanya menyambungkannya ke gate tanpa banyak perubahan visual, sebutkan itu juga.

---
