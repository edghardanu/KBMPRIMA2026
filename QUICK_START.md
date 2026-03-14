# 🚀 QUICK START: Perbaikan Registrasi Murid

**Estimasi waktu: 5 menit**

---

## 1️⃣ SETUP SUPABASE (2 menit)

### Step 1.1: Disable Email Confirmation

- Login Supabase Dashboard
- **Authentication** → **Email** → **Confirm email** → **OFF**
- Save

**Why?** Email confirmation akan membuat proses stuck

### Step 1.2: Run SQL Script

- **SQL Editor** → **New Query**
- Copy seluruh isi: `COMPLETE_RLS_FIX.sql`
- Click **Run** (Ctrl+Enter)
- Tunggu sampai selesai (tidak ada error)

**Expected:** Verification queries di bawah menampilkan results

---

## 2️⃣ TEST REGISTRASI (2 menit)

### Step 2.1: Open Form

- Buka form registrasi dengan token yang valid
- Tekan **F12** → **Console** tab

### Step 2.2: Isi Form

```
Nama Siswa:        Budi
Nama Orang Tua:    Ibu Ani
Email:             ibuani@example.com  ← UNIQUE email!
Kata Sandi:        123456789
Jenjang/Kelas:     [Select any]
Lainnya:           [Isi apa saja]
```

### Step 2.3: Submit & Watch Console

- Klik **DAFTAR**
- Lihat console logs
- Expected: Melihat ✅ di setiap step

```
✅ Step 1 Success: User created
✅ Step 2 Success: Profile verified
✅ Step 3 Success: Murid record created
✅ Step 4 Success: Murid linked with parent
🎉 ALL STEPS COMPLETED
```

### Step 2.4: Success Alert

- Sweet Alert muncul → Klik **Pergi ke Login**
- Redirect ke halaman login

---

## 3️⃣ VERIFY DATA (1 menit)

### Step 3.1: Cek 4 hal di Supabase Dashboard

**Query 1: Check auth.users**

```sql
SELECT id, email, created_at
FROM auth.users
WHERE email = 'ibuani@example.com';
```

**Query 2: Check public.profiles**

```sql
SELECT id, email, full_name, role
FROM public.profiles
WHERE email = 'ibuani@example.com';
```

**Query 3: Check public.murid**

```sql
SELECT id, nama, alamat
FROM public.murid
WHERE nama = 'Budi';
```

**Query 4: Check murid_orangtua link**

```sql
SELECT mo.* FROM public.murid_orangtua mo
LIMIT 1;
```

### Step 3.2: Expected Result

- ✅ Query 1: 1 row (user ada)
- ✅ Query 2: 1 row (profile ada, role = orangtua)
- ✅ Query 3: 1 row (murid ada)
- ✅ Query 4: 1 row (link ada)

---

## ❌ Jika Ada Masalah

**Tidak ada user di auth.users?**

- Cek console error di Step 1
- Pastikan email tidak duplikat
- Pastikan Email Confirmation disabled

**User ada tapi profile kosong?**

- Run `DIAGNOSTIC_REALTIME.sql` di Supabase
- Lihat Section 2.3: "Missing profiles" (trigger tidak fire)
- Cek Section 4: RLS policies

**Error di Step 3 (murid)?**

- Run `DIAGNOSTIC_REALTIME.sql`
- Lihat Section 3: Murid records
- Cek RLS policy apakah blok

**Form stuck loading?**

- F12 Console - lihat di mana error
- Ganti email (yang sebelumnya mungkin sudah ada)
- Coba lagi

---

## 📖 Untuk Info Lebih Lanjut

- **Full Guide**: Lihat `REGISTRASI_MURID_LENGKAP.md`
- **SQL Scripts**: `COMPLETE_RLS_FIX.sql`, `DIAGNOSTIC_REALTIME.sql`
- **Form Code**: `src/app/form-murid/page.tsx`

---

**Done?** Data sudah tersimpan dari auth.users → profiles → murid → murid_orangtua! 🎉
