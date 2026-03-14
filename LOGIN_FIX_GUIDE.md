# 🔧 PANDUAN PERBAIKAN LOGIN - KBMPRIMA

Halaman ini menjelaskan langkah-langkah untuk memperbaiki masalah login di aplikasi KBMPRIMA.

## ✅ Perbaikan yang Sudah Dilakukan

### 1. **Middleware Cookie Handling**

- ✅ Fixed: Cookies sekarang benar-benar disimpan di response
- File: [src/middleware.ts](../src/middleware.ts)

### 2. **Login Redirect Delay**

- ✅ Fixed: Ditambahkan 500ms delay untuk memastikan session initialize
- File: [src/app/login/page.tsx](../src/app/login/page.tsx)

---

## 🔐 Langkah-Langkah Perbaikan DATABASE

Masalah login biasanya terjadi karena **profile user tidak terbuat saat registrasi**. Ikuti langkah ini:

### Step 1: Perbaiki Trigger di Supabase

1. Buka [Supabase Dashboard](https://supabase.com/dashboard)
2. Pilih project KBMPRIMA
3. Buka **SQL Editor** (bagian kiri)
4. Buat **query baru**
5. Copy seluruh isi file: `fix-auth-profiles-trigger.sql`
6. **Jalankan query** (Ctrl+Enter atau tombol Run)

✅ Ini akan:

- Recreate trigger `on_auth_user_created`
- Fix semua RLS policies di tables
- Membuat profile untuk user yang sudah ada tapi belum punya profile

### Step 2: Verifikasi Profiles Table

Setelah menjalankan query di atas, cek apakah trigger bekerja:

```sql
-- Verify the trigger exists and is enabled
SELECT tgname, tgenabled FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass;

-- Check if profiles exist for all users
SELECT
  u.id,
  u.email,
  COALESCE(p.id, 'NO PROFILE') as profile_id,
  COALESCE(p.role, 'N/A') as role
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id;
```

### Step 3: Test Login

1. **Daftar akun baru** atau gunakan akun existing
2. Cek Supabase: Hash database profiles table, pastikan profile ada
3. Cek role: User baru seharusnya memiliki role = 'pending'
4. **Login** dan pastikan bisa masuk ke dashboard

---

## 🚨 Troubleshooting

### Masalah: "Profil Tidak Ditemukan" saat login

**Penyebab:** Profile belum terbuat di table profiles

**Solusi:**

```sql
-- Cek apakah profile ada untuk user yang sedang login
SELECT * FROM public.profiles WHERE email = 'user@email.com';

-- Jika tidak ada, buat manual:
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', ''),
  'pending'
FROM auth.users
WHERE email = 'user@email.com'
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.users.id
  );
```

### Masalah: Login gagal dengan error pesan

1. **Buka browser DevTools** (F12)
2. Tab **Console** - lihat error messages
3. Tab **Network** - lihat request ke Supabase
4. Catat error message dan lakukan troubleshooting

**Common errors:**

- `Invalid credentials` → Email/password salah
- `User already registered` → Email sudah terdaftar
- `NEXT_PUBLIC_SUPABASE_URL not found` → .env.local tidak ada/salah

### Masalah: Stuck di loading spinner

**Penyebab:**

- Trigger tidak berfungsi
- RLS policy terlalu ketat

**Solusi:**

1. Jalankan `fix-auth-profiles-trigger.sql` lagi
2. Restart development server: `npm run dev`
3. Clear browser cache/local storage
4. Coba login dengan incognito/private mode

---

## 📝 Environment Variables

Pastikan `.env.local` ada dan berisi:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_xxxxx
```

Jika tidak ada, `.env.local` ini sudah ada dan benar konfigurasinya.

---

## 🔄 Full Reset (Nuclear Option)

Jika semua di atas tidak berhasil:

1. **Backup data penting** (export profiles, murid, etc)
2. Buka Supabase Dashboard → **Dangerously reset database**
3. Jalankan `supabase-schema.sql` semua
4. Jalankan `fix-auth-profiles-trigger.sql`
5. Restart development server
6. Test registrasi akun baru

---

## 🧪 Test Login Flow

```bash
# 1. Start development server
npm run dev

# 2. Buka http://localhost:3000
# 3. Klik "Registrasi" atau "Masuk"
# 4. Daftar akun baru atau login dengan existing account
# 5. Seharusnya bisa masuk ke /dashboard
```

---

## 📞 Debugging Checklist

- [ ] Supabase backend URL ada di .env.local
- [ ] Supabase API Key ada di .env.local
- [ ] Server sudah direstart setelah perbaikan
- [ ] Browser cache sudah dihapus (F12 → Application → Clear)
- [ ] Trigger `on_auth_user_created` ada dan enabled
- [ ] Profiles table punya profile untuk setiap user
- [ ] RLS policies sudah di-recreate
- [ ] Console browser tidak ada error merah

---

**Jika masih ada masalah, cek console log dan error message di browser DevTools!**
