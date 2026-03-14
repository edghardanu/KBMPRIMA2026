# PANDUAN: Perbaiki Form Pendaftaran yang Stuck

## 🔍 Gejala

- Form tidak merespons saat di-submit
- Loading button terus berputar
- Console menampilkan error tentang RLS atau timeout
- Data tidak tersimpan di database

## 🚀 Solusi Cepat (Langkah 1-2 Menit)

### **Langkah 1: Buka Supabase Dashboard**

1. Buka [https://supabase.com](https://supabase.com) → Login
2. Pilih project KBMPRIMA
3. Pergi ke **SQL Editor**

### **Langkah 2: Jalankan Script FIX_REGISTRATION_RLS.sql**

1. Copy seluruh isi file `FIX_REGISTRATION_RLS.sql`
2. Paste di SQL Editor
3. Klik **Run** ✓
4. Tunggu sampai selesai (timeout OK jika ada warning)

### **Langkah 3: Jalankan Script SETUP_AUTH_TRIGGERS.sql**

1. Copy seluruh isi file `SETUP_AUTH_TRIGGERS.sql`
2. Paste di SQL Editor
3. Klik **Run** ✓
4. Tunggu sampai selesai

### **Langkah 4: Test Form**

1. Buka form pendaftaran
2. Isi semua data dengan benar
3. Klik **Kirimkan Data Pendaftaran**
4. Lihat console (F12 → Console) untuk log progress
5. Tunggu sampai redirect ke dashboard

---

## 📊 Verifikasi & Debugging

### **Jika Masih Stuck, Cek Console Log**

Buka browser Console (tekan `F12` → pilih tab **Console**), maka akan terlihat:

```
Step 1: Creating auth account for test@example.com
Step 1 ✓ Auth created: 550e8400-e29b-41d4-a716-446655440000
Step 2: Creating profile for 550e8400-e29b-41d4-a716-446655440000
Step 2 ✓ Profile created
Step 3: Creating murid record
Step 3 ✓ Murid created: 660e8400-e29b-41d4-a716-446655440001
Step 4: Linking murid with orangtua
Step 4 ✓ Link created
Step 5: Auto-logging in user
Step 5 ✓ User logged in
ALL STEPS COMPLETED ✓
```

### **Jika Ada Error, Catat Error Message**

Contoh error yang mungkin muncul:

#### **Error: "RLS policy... denied"**

```
Solution: Jalankan FIX_REGISTRATION_RLS.sql
```

#### **Error: "Password is too long"**

```
Solution: Password harus kurang dari 72 karakter (format change saja)
```

#### **Error: "User already exists"**

```
Solution: Email sudah terdaftar sebelumnya, gunakan email berbeda
```

#### **Error: "Check constraint... failed"**

```
Solution: Mungkin ada field yang tidak sesuai schema, cek tabel definition
```

---

## 🔧 Troubleshooting Manual

### **1. Cek RLS Policies**

Jalankan query ini di Supabase SQL Editor:

```sql
-- Lihat semua policies
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'murid', 'murid_orangtua')
ORDER BY tablename, cmd;
```

Harusnya output menampilkan:

- ✅ profiles: INSERT policy untuk authenticated users
- ✅ murid: INSERT policy untuk authenticated users
- ✅ murid_orangtua: INSERT policy untuk authenticated users

### **2. Cek Trigger**

Jalankan query ini:

```sql
-- Lihat triggers di auth.users
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE event_object_table like 'users';
```

Harusnya ada trigger: `on_auth_user_created`

### **3. Test Insert Manual**

Jalankan di SQL Editor dengan minimal permissions:

```sql
-- Test 1: Insert murid (tanpa auth, untuk test)
-- NOTE: Ini akan fail jika RLS policy tidak allow
INSERT INTO public.murid (nama, jenjang_id, kelas_id, whatsapp_ortu, is_active)
VALUES ('Test Siswa', '550e8400-e29b-41d4-a716-446655440000', NULL, '081234567890', true);

-- Jika sukses, maka database connection OK
-- Jika error, maka ada masalah dengan RLS atau schema
```

### **4. Cek Struktur Tabel**

Lihat schema tabel untuk pastikan semua kolom ada:

```sql
-- Lihat struktur profiles
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- Lihat struktur murid
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'murid'
ORDER BY ordinal_position;

-- Lihat struktur murid_orangtua
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'murid_orangtua'
ORDER BY ordinal_position;
```

---

## 📝 Checklist Debugging

- [ ] Browser console menampilkan "Step 1 ✓ Auth created"
  - Jika tidak: ada masalah dengan email atau password
  - Solusi: Cek format email, pastikan password >= 6 karakter

- [ ] Browser console menampilkan "Step 2 ✓ Profile created"
  - Jika tidak: RLS policy profiles tidak allow INSERT
  - Solusi: Jalankan `FIX_REGISTRATION_RLS.sql`

- [ ] Browser console menampilkan "Step 3 ✓ Murid created"
  - Jika tidak: RLS policy murid tidak allow INSERT
  - Solusi: Jalankan `FIX_REGISTRATION_RLS.sql`

- [ ] Browser console menampilkan "ALL STEPS COMPLETED ✓"
  - Jika ada: Registrasi seharusnya berhasil
  - Jika tidak: Ada step yang belum selesai, lihat error message

---

## 🔐 Keamanan Setelah Fix

Setelah menjalankan script, verifikasi keamanan:

```sql
-- Cek: Hanya authenticated users yang bisa insert profiles
SELECT policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'INSERT';
-- Harusnya: "anonymous" TIDAK ada di roles, hanya "authenticated"

-- Cek: Trigger berjalan otomatis
SELECT COUNT(*) as profile_count
FROM public.profiles
WHERE created_at > NOW() - INTERVAL '1 hour';
-- Harusnya: Ada profile baru yang dibuat otomatis via trigger
```

---

## 📞 Jika Error Masih Berlanjut

1. **Screenshot error message** yang ada di browser console
2. **Catat email** yang Anda coba gunakan
3. **Cek logs Supabase:**
   - Supabase Dashboard → Logs → Auth Logs
   - Lihat error code yang spesifik

4. **Cek Supabase Status:**
   - Buka https://status.supabase.com
   - Pastikan tidak ada outage

5. **Clear Browser Data:**
   - Tekan F12 → Application → Clear Site Data
   - Refresh halaman dan coba lagi

---

## 📋 Ringkasan Fix

| Problem                    | Solusi                            | Status |
| -------------------------- | --------------------------------- | ------ |
| RLS policy blocks INSERT   | Jalankan FIX_REGISTRATION_RLS.sql | ✅     |
| Profile tidak auto-created | Jalankan SETUP_AUTH_TRIGGERS.sql  | ✅     |
| Form loading stuck         | Improved error logging            | ✅     |
| Better error messages      | Added detailed console logs       | ✅     |

---

**Versi:** 1.0  
**Dibuat:** 6 Maret 2026  
**Status:** Ready to Use
