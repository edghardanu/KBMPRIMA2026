# 🔧 Fix RLS Policy untuk Form Murid - Sign Up

## ✅ Masalah yang Diperbaiki
- Error: `new row violates row-level security policy for table "profiles"`
- Solusi: Menggunakan **metadata di auth.users** dan biarkan **trigger otomatis** membuat profile

## 📋 Langkah-Langkah Implementasi

### 1. **Jalankan SQL Script di Supabase**

Buka Supabase Dashboard:
1. Masuk ke project KBMPRIMA
2. Klik **SQL Editor** di sidebar
3. Klik **New Query**
4. Copy isi file `fix-profiles-rls-signup.sql` ke editor
5. Klik **Run** (tombol ▶️)

### 2. **Verifikasi Hasilnya**

Jalankan query ini untuk memastikan trigger berfungsi:
```sql
SELECT tgname, tgenabled 
FROM pg_trigger 
WHERE tgrelid = 'auth.users'::regclass;
```

Pastikan ada trigger `on_auth_user_created` dengan status enabled.

### 3. **Test Registration**

- Buka form pendaftaran murid
- Isi semua field termasuk email dan password
- Klik submit

Seharusnya:
- ✅ Akun dibuat di Supabase Auth
- ✅ Profile otomatis dibuat dengan role `orangtua`
- ✅ Murid data disimpan
- ✅ Link murid-orangtua dibuat
- ✅ User langsung login dan redirect ke dashboard

## 🔑 Bagaimana Ini Bekerja

### Sebelum (Error):
1. Trigger membuat profile dengan role `'pending'`
2. Form mencoba insert profile lagi dengan role `'orangtua'`
3. RLS policy menolak karena user belum authenticated ❌

### Sesudah (✅ Berhasil):
1. Form kirim role & full_name via metadata di `options.data`
2. `signUp()` membuat user di auth.users
3. Trigger `handle_new_user()` otomatis membuat profile dengan role dari metadata
4. Form hanya insert data murid & link - tidak perlu manual insert profile suatu

## 📝 Perubahan Kode

### File: `src/app/form-murid/page.tsx`

```typescript
// Kirim metadata saat signUp
const { data: authData, error: authError } = await supabase.auth.signUp({
    email: emailOrangTua,
    password: passwordOrtu,
    options: {
        data: {
            role: 'orangtua',
            full_name: '(Orang Tua)'
        }
    }
});

// Trigger akan otomatis membuat profile
// Tidak perlu manual insert!
```

## 🚨 Troubleshooting

### Error masih muncul?

1. **Pastikan SQL script sudah dijalankan** di Supabase
2. **Clear browser cache** dan reload
3. **Cek auth.users** apakah sudah ada user baru
4. **Cek profiles table** apakah profile sudah dibuat dengan role yang benar

### Lihat logs di Supabase:
- SQL Editor → Functions → `handle_new_user` → Logs
- Auth → Users → (cari user baru) → Metadata

## ✅ Checklist

- [ ] SQL script `fix-profiles-rls-signup.sql` sudah dijalankan
- [ ] Trigger `on_auth_user_created` ada dan enabled
- [ ] Test form sign up berjalan lancar
- [ ] User baru bisa login otomatis setelah registrasi
- [ ] Profile dibuat dengan role `orangtua`
