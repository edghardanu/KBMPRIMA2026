# 🔧 Fix Error: "Error fetching profile: {}"

## ✅ Masalah yang Diperbaiki

Console error: `Error fetching profile: {}`

**Penyebab:**

- RLS policy pada `profiles` table terlalu ketat
- User yang baru dibuat tidak bisa membaca profile mereka sendiri
- Error object tidak memiliki `.code` property dengan struktur yang jelas

## 📋 Solusi yang Diterapkan

### 1. **Improved Error Handling** ✅

File: `src/context/auth-context.tsx`

Sekarang error handling lebih robust:

- Safely mengakses error properties dengan type casting
- Better error logging dengan context info (userId, attempt number)
- Handle case dimana error object kosong atau tidak standard

### 2. **Fixed RLS Policy** ⏳ (Perlu dijalankan)

File: `fix-profiles-rls-policy.sql`

RLS policy baru memungkinkan:

- ✅ User membaca profile mereka sendiri
- ✅ Admin membaca semua profile
- ✅ Guru/Pengurus membaca profile yang relevan
- ✅ Trigger tetap bisa insert tanpa RLS check

## 🚀 Langkah Implementasi

### Step 1: Jalankan SQL di Supabase Dashboard

1. Buka https://supabase.com/dashboard
2. Masuk ke project KBMPRIMA
3. Klik **SQL Editor** di sidebar
4. Klik **New Query**
5. Copy-paste isi dari `fix-profiles-rls-policy.sql`
6. Klik **Run** (tombol ▶️)

### Step 2: Verifikasi RLS Policy

Di SQL Editor, jalankan:

```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles' ORDER BY policyname;
```

Pastikan ada policy:

- `Users can read own profile` ✅
- `Admin can read all profiles` ✅
- `Users can update own profile` ✅
- dll

### Step 3: Clear Browser Cache & Test

1. **Hard refresh browser:**
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Clear localStorage:**

   ```javascript
   // Di Console browser (F12)
   localStorage.clear();
   ```

3. **Test login:**
   - Logout kalau sudah login
   - Login ulang dengan akun orangtua
   - Lihat apakah redirect ke dashboard berhasil

## 📊 Hasil yang Diharapkan

### Before Fix ❌

```
Console Error:
Error fetching profile: {}
User stays in loading state
Tidak bisa redirect ke dashboard
```

### After Fix ✅

```
Console Log:
[auth] User session found for: [email]
Profile fetched successfully
User redirected to dashboard
```

## 🔍 Debugging Tips

Kalau masih error, check di browser console:

### 1. **Lihat detailed error message:**

```
Error fetching profile: {
  code: "PGRST116",
  message: "..."
}
```

### 2. **Cek profile di database:**

```sql
-- Di Supabase SQL Editor
SELECT * FROM public.profiles WHERE id = '[user-id]';
```

### 3. **Cek RLS policy:**

```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### 4. **Test SELECT permission:**

```sql
-- Jalankan sebagai authenticated user
SELECT * FROM public.profiles LIMIT 1;
```

## 📝 Perubahan Code

### `src/context/auth-context.tsx`

**Before:**

```typescript
if (error.code === "PGRST116" && attempts < 3) {
  // error.code bisa undefined jika error object kosong
}
console.error("Error fetching profile:", error); // Muncul kosong
```

**After:**

```typescript
const errorCode = (error as any)?.code;
const errorMessage = (error as any)?.message || JSON.stringify(error);

if (errorCode === "PGRST116" && attempts < 3) {
  // Safe access dengan type casting
}
console.error("Error fetching profile:", {
  code: errorCode,
  message: errorMessage,
  userId,
  attempt: attempts,
}); // Better logging
```

## ✅ Checklist

- [ ] Jalankan SQL script `fix-profiles-rls-policy.sql` di Supabase
- [ ] Verifikasi RLS policy dengan query di atas
- [ ] Code auth-context.tsx sudah updated dengan error handling baru
- [ ] Clear browser cache dan localStorage
- [ ] Test registration dan login berjalan lancar
- [ ] Tidak ada error di console saat fetch profile

## 🆘 Kalau Masih Error?

1. **Screenshot error message** yang muncul di console
2. **Check Supabase logs** (Project Settings → Logs → API Logs)
3. **Verifikasi trigger** sudah berjalan saat signup
4. **Test manual INSERT:**
   ```sql
   INSERT INTO public.profiles (id, email, full_name, role)
   VALUES ('[test-user-id]', 'test@example.com', 'Test User', 'orangtua')
   ON CONFLICT (id) DO NOTHING;
   ```

---

**Dokumentasi dibuat:** March 6, 2026  
**Berkaitan dengan:** Form Murid Sign-up dengan Password Integration
