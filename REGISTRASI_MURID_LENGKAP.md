## 🔧 PANDUAN LENGKAP: Perbaikan Registrasi Murid

Dokumen ini berisi langkah-langkah untuk memastikan data registrasi murid berhasil tersimpan ke database.

---

## 📋 CHECKLIST SEBELUM TESTING

### Step 1: Konfigurasi Supabase Project

**PENTING: Disable Email Confirmation (jika belum)**

1. Login ke [Supabase Dashboard](https://app.supabase.com)
2. Pilih project Anda
3. Pergi ke **Authentication** → **Providers** → **Email**
4. Scroll ke bawah, cari **Confirm email**
5. Pastikan toggle **OFF** (untuk testing)
6. Klik **Save**

```
Alasan: Email confirmation akan membuat user stuck di state "unconfirmed"
yang bisa memicu error di step berikutnya. Disable untuk testing.
```

**Cek Auto Confirm**

- Setting ini juga bisa di **Settings** → **Auth** → **Email Auth** → **Autoconfirm**
- Pastikan tidak ada yang menghalangi email confirmation flow

---

### Step 2: Jalankan SQL Script di Supabase

1. Login ke Supabase Dashboard
2. Buka **SQL Editor**
3. Klik **New Query**
4. Copy-paste seluruh isi file: `COMPLETE_RLS_FIX.sql`
5. Klik **Run** button (atau Ctrl+Enter)
6. Tunggu sampai sukses (tidak ada error messages)

**Yang dilakukan script ini:**

- ✅ Drop dan recreate trigger function `handle_new_user()`
- ✅ Recreate trigger `on_auth_user_created`
- ✅ Fix RLS policies pada 3 tables: profiles, murid, murid_orangtua
- ✅ Grant permissions yang tepat ke trigger
- ✅ Verification queries untuk cek status

**Expected Output Verification:**

```
Step 4: Fix RLS on murid table
Step 5: Fix RLS on murid_orangtua table
VERIFICATION & TESTING
1. Verify trigger is active
2. Verify all RLS policies
... (banyak rows results)
```

❌ Jika ada error, lihat di section "❌ TROUBLESHOOTING"

---

## 🧪 TESTING REGISTRASI

### Cara 1: Manual Test via Browser (Proses Lengkap)

**Step 1: Siapkan Browser DevTools**

```
1. Buka form registrasi dengan token yang valid
2. Tekan F12 → Tab "Console"
3. Biarkan tetap terbuka saat test
```

**Step 2: Isi Form dengan Data Test**

```
Nama Siswa:        "Ahmad Rizki"
Nama Orang Tua:    "Ibu Siti"
Email:             "test.parent@example.com"  ← UNIQUE email setiap test!
Kata Sandi:        "TestPassword123"
Konfirmasi Sandi:  "TestPassword123"
Jenjang:           [Pilih salah satu]
Kelas:             [Pilih salah satu]
Tanggal Lahir:     [Isi atau kosong]
Alamat:            "Jl. Testing 123"
WhatsApp:          "081234567890"
```

**Step 3: Klik Tombol "DAFTAR"**

- Form akan mulai **loading** (button berubah jadi loading indicator)
- **Lihat console** untuk melihat progress

**Step 4: Analisis Console Output**

Expected console output jika berhasil:

```
📝 Step 1: Creating auth account for test.parent@example.com
✅ Step 1 Success: User created with ID: [long-uuid]
⏳ Step 2: Waiting for trigger to create profile...
✅ Step 2 Success: Profile verified: {id: "...", email: "...", role: "orangtua"}
📝 Step 3: Creating murid record...
✅ Step 3 Success: Murid record created: [murid-uuid]
📝 Step 4: Linking murid with parent...
✅ Step 4 Success: Murid linked with parent
🎉 ALL STEPS COMPLETED SUCCESSFULLY!
```

Jika ada ❌ atau ⚠️, catat error message untuk troubleshooting.

**Step 5: Setelah Success**

- Sweet Alert akan muncul dengan pesan "Registrasi Berhasil"
- Klik tombol "Pergi ke Login"
- Form akan redirect ke halaman login
- User sudah bisa login dengan email + password yang didaftarkan

---

### Cara 2: Verifikasi Data di Supabase Dashboard

Setelah test registrasi, verifikasi data tersimpan:

**1. Cek auth.users**

```sql
SELECT
  id,
  email,
  created_at,
  raw_user_meta_data->>'role' as role_metadata
FROM auth.users
WHERE email = 'test.parent@example.com'
LIMIT 5;
```

Expected result:

```
id                          | email                   | created_at         | role_metadata
UUID123-456...              | test.parent@example.com | 2024-03-06 10:30.. | orangtua
```

**2. Cek public.profiles**

```sql
SELECT
  id,
  email,
  full_name,
  role,
  created_at
FROM public.profiles
WHERE email = 'test.parent@example.com';
```

Expected result:

```
id                          | email                   | full_name  | role     | created_at
UUID123-456...              | test.parent@example.com | Ibu Siti   | orangtua | 2024-03-06 10:30..
```

**3. Cek public.murid**

```sql
SELECT
  id,
  nama,
  jenjang_id,
  kelas_id,
  alamat,
  is_active,
  created_at
FROM public.murid
WHERE nama = 'Ahmad Rizki';
```

Expected result:

```
id                          | nama          | jenjang_id | kelas_id | alamat            | is_active | created_at
UUID789-012...              | Ahmad Rizki   | UUID...    | UUID...  | Jl. Testing 123   | true      | 2024-03-06 10:30..
```

**4. Cek public.murid_orangtua (linking)**

```sql
SELECT
  id,
  murid_id,
  orangtua_id,
  created_at
FROM public.murid_orangtua
WHERE orangtua_id = '[UUID dari step 1 dan 2]';
```

Expected result:

```
id                          | murid_id               | orangtua_id        | created_at
UUIDAbc-Def...              | UUID789-012...(murid)  | UUID123-456...(parent) | 2024-03-06 10:30..
```

---

## ✅ CHECKLIST SUKSES

Setelah test, pastikan semua item ✅:

- ✅ Script COMPLETE_RLS_FIX.sql sudah dijalankan di Supabase
- ✅ Tidak ada error saat menjalankan script
- ✅ Email Confirmation DISABLED di Supabase Auth settings
- ✅ Form registrasi bisa disubmit tanpa stuck
- ✅ Console menunjukkan ALL STEPS COMPLETED
- ✅ Sweet Alert success muncul
- ✅ User data ada di auth.users
- ✅ Profile ada di public.profiles dengan role 'orangtua'
- ✅ Murid data ada di public.murid
- ✅ Link ada di public.murid_orangtua
- ✅ User bisa login di halaman login dengan email + password

---

## ❌ TROUBLESHOOTING

### Error: "Gagal membuat akun - user tidak ditemukan"

**Diagnosis:**

- `authData.user` tidak ada atau undefined setelah signUp()
- Kemungkinan email sudah terdaftar atau ada validasi email yang gagal

**Fix:**

1. Gunakan **unique email** setiap test (tambah timestamp: `test+${Date.now()}@example.com`)
2. Pastikan Email Confirmation **disabled** di Supabase Auth settings
3. Cek di Supabase Dashboard apakah user sudah ada di auth.users

---

### Error: "Gagal menyimpan data murid: policy"

**Diagnosis:**

- RLS policy pada `murid` table masih blocking insert
- User tidak memiliki permission untuk insert

**Fix:**

1. Run `COMPLETE_RLS_FIX.sql` lagi (pastikan no errors)
2. Verify RLS policies:

```sql
SELECT tablename, policyname, permissive
FROM pg_policies
WHERE tablename = 'murid'
ORDER BY policyname;
```

Harusnya ada policy dengan nama `Authenticated can insert murid` yang `PERMISSIVE`.

3. Jika masih gagal, drop semua policies dan run script lagi:

```sql
ALTER TABLE public.murid DISABLE ROW LEVEL SECURITY;
```

Lalu run COMPLETE_RLS_FIX.sql

---

### Error: "console shows but form never completes"

**Diagnosis:**

- Form stuck loading, tidak ada error message
- Kemungkinan issue pada Step 2, 3, atau 4

**Fix:**

1. Buka browser DevTools Console (F12)
2. Lihat console output - di mana ada ❌?
3. Copy error message lengkap
4. Cek di Supabase Dashboard apakah partial data tersimpan:
   - User ada di auth.users? ✅ = Step 1 sukses
   - Profile ada di profiles? ✅ = Trigger fired sukses
   - Murid ada di murid? ✅ = Step 3 stuck
   - Link ada? ✅ = Step 4 stuck

---

### Error: "Profile tidak ditemukan"

**Diagnosis:**

- Trigger tidak fire atau profile insert gagal
- RLS policy pada `profiles` table masih issue

**Fix:**

1. Cek apakah trigger exists:

```sql
SELECT trigger_name, tgisinternal
FROM pg_triggers
WHERE tgrelid = 'auth.users'::regclass;
```

Column `trigger_name` harusnya `on_auth_user_created`

2. Jika trigger tidak ada, jalankan ulang COMPLETE_RLS_FIX.sql

3. Cek function exists:

```sql
SELECT proname FROM pg_proc WHERE proname = 'handle_new_user';
```

---

### Error: "Column X does not exist"

**Diagnosis:**

- Form mengirim field yang tidak ada di table
- Schema mismatch antara form dan database

**Fix:**

1. Verify schema murid_table:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'murid'
ORDER BY ordinal_position;
```

2. Semua field yang dikirim form harus ada di table:
   - `nama` ✅
   - `jenjang_id` ✅
   - `kelas_id` ✅
   - `tanggal_lahir` ✅
   - `alamat` ✅
   - `whatsapp_ortu` ✅
   - `is_active` ✅

Jika ada field tidak sesuai, update form atau database sesuai kebutuhan.

---

## 📊 DATABASE SCHEMA REFERENCE

```
auth.users (Supabase managed)
├── id (UUID)
├── email
├── raw_user_meta_data (JSON)
│   ├── full_name: "Ibu Siti"
│   └── role: "orangtua"
└── created_at

public.profiles (AUTO-CREATED BY TRIGGER)
├── id (UUID, FK to auth.users.id)
├── email
├── full_name
├── role: 'orangtua' | 'admin' | 'pengurus' | 'guru'
└── created_at

public.murid (USER REGISTERED)
├── id (UUID)
├── nama: "Ahmad Rizki"
├── jenjang_id (UUID, FK to jenjang)
├── kelas_id (UUID, FK to kelas)
├── tanggal_lahir
├── alamat
├── whatsapp_ortu
├── is_active: true/false
└── created_at

public.murid_orangtua (LINKING TABLE)
├── id (UUID)
├── murid_id (UUID, FK to murid)
├── orangtua_id (UUID, FK to profiles/auth.users)
└── created_at
```

---

## 🚀 NEXT STEPS (Setelah Success)

Setelah verifikasi semuanya berhasil:

1. **Production Setup:**
   - Enable Email Confirmation di Supabase Auth
   - Configure email templates untuk confirmasi
   - Setup email provider (SendGrid, Resend, dll)

2. **Enhanced Features:**
   - Add email confirmation verification di form
   - Add phone verification untuk WhatsApp
   - Add user profile page untuk edit data

3. **Testing:**
   - Test registration flow dengan berbagai data
   - Test multi-user registration untuk conflict handling
   - Test password reset flow

---

## 📞 QUICK REFERENCE

**Quick Diagnostic Queries:**

```sql
-- Cek trigger active
SELECT COUNT(*) FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Cek recent users (last 10 registrations)
SELECT id, email, created_at FROM auth.users
ORDER BY created_at DESC LIMIT 10;

-- Cek missing profiles (users in auth but not in profiles)
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Cek unlinked murid (murid without orangtua)
SELECT m.id, m.nama
FROM public.murid m
LEFT JOIN public.murid_orangtua mo ON mo.murid_id = m.id
WHERE mo.id IS NULL;
```

**Quick Reset (jika perlu start fresh):**

```sql
-- Delete recent test data
DELETE FROM public.murid_orangtua
WHERE created_at > NOW() - INTERVAL '1 hour';

DELETE FROM public.murid
WHERE created_at > NOW() - INTERVAL '1 hour';

DELETE FROM public.profiles
WHERE created_at > NOW() - INTERVAL '1 hour';

-- Delete from auth via Supabase, cek SQL documentation
```

---

**Last Updated:** 2024-03-06
**Status:** Ready for Production Testing
