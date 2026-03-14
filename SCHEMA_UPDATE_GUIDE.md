# 🔄 Supabase Schema Update - KBM Prima

## 📋 Ringkasan Perubahan

### **Fitur Baru**

✅ **Murid Forms Table** - Untuk registrasi murid dengan token deadline  
✅ **Improved Trigger** - Auto-create profile dari auth.users dengan role dari metadata  
✅ **Get or Create Profile Function** - Fallback untuk memastikan profile ada  
✅ **Better RLS Policies** - Permissive read, auth required untuk write  
✅ **Performance Indexes** - Index untuk query optimization

### **Perbaikan**

✅ Handle password-based authentication (role dari metadata)  
✅ Graceful profile creation fallback  
✅ RLS compatible dengan form-murid sign-up  
✅ Support untuk murid_forms dengan deadline token

---

## 🚀 Cara Implementasi

### **Step 1: Backup Current Schema (Optional)**

Jika sudah punya data, backup dulu schema yang sekarang di Supabase SQL Editor dengan copy-paste current schema.

### **Step 2: Run Updated Schema**

**Option A: Replace Everything (Fresh Start)**

1. Buka Supabase Dashboard → SQL Editor
2. **New Query**
3. Copy-paste seluruh isi `supabase-schema-updated.sql`
4. Jalankan dengan klik **Run**

**Option B: Update Existing (Preserve Data)**

1. Di SQL Editor, jalankan bagian-bagian ini secara terpisah:

```sql
-- Tambah table murid_forms
CREATE TABLE IF NOT EXISTS public.murid_forms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  token TEXT NOT NULL UNIQUE,
  deadline TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Update trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_full_name TEXT;
    user_role TEXT;
BEGIN
    user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'User');
    user_role := COALESCE((NEW.raw_user_meta_data->>'role'), 'pending');

    IF user_role NOT IN ('admin', 'pengurus', 'guru', 'orangtua', 'pending') THEN
        user_role := 'pending';
    END IF;

    INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
    VALUES (NEW.id, NEW.email, user_full_name, user_role, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        role = COALESCE(EXCLUDED.role, public.profiles.role),
        updated_at = NOW();

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
```

### **Step 3: Verify Schema**

Di SQL Editor, jalankan verification query:

```sql
-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check trigger
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgrelid = 'public.profiles'::regclass;

-- Check policies
SELECT policyname, cmd
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;
```

---

## 📊 Schema Overview

### **Core Tables**

| Table            | Purpose                                 | RLS                               |
| ---------------- | --------------------------------------- | --------------------------------- |
| `profiles`       | User accounts (linked to auth.users)    | ✅ Authenticated read, auth write |
| `jenjang`        | Education levels (TK, PAUD, etc)        | ✅ Readable by all, admin write   |
| `kelas`          | Classes per jenjang                     | ✅ Readable by all, admin write   |
| `murid`          | Students                                | ✅ Readable by all, admin write   |
| `murid_forms`    | **NEW** - Registration forms with token | ✅ Public read, admin write       |
| `murid_orangtua` | Parent-child link                       | ✅ Smart permissions              |

### **Transaction Tables**

| Table           | Purpose                   | RLS                             |
| --------------- | ------------------------- | ------------------------------- |
| `absensi`       | Attendance records        | ✅ Guru/admin write             |
| `materi`        | Learning materials        | ✅ Guru/admin manage            |
| `target_materi` | Student material progress | ✅ Guru/admin manage            |
| `kendala`       | Issues/challenges         | ✅ Guru insert, Pengurus update |
| `saran`         | Suggestions               | ✅ Guru insert, Pengurus update |

---

## 🔑 Key Features

### **1. Auto Profile Creation**

```typescript
// Saat signUp dengan metadata
const { data, error } = await supabase.auth.signUp({
  email: "ortu@example.com",
  password: "123456",
  options: {
    data: {
      role: "orangtua",
      full_name: "Nama Orang Tua",
    },
  },
});
// ✅ Trigger otomatis buat profile dengan role
```

### **2. Fallback Profile Creation**

Jika trigger gagal, ada function `get_or_create_profile()` yang bisa dipanggil dari client:

```typescript
const { data } = await supabase.rpc("get_or_create_profile", {
  user_id: userId,
  user_email: userEmail,
  user_role: "orangtua",
});
```

### **3. Murid Forms**

Untuk registrasi murid dengan token dan deadline:

```sql
INSERT INTO public.murid_forms (token, deadline)
VALUES ('abc123token', NOW() + INTERVAL '30 days');
```

Form-murid bisa validate token sebelum buka form.

### **4. Smart RLS**

- **Profiles**: User read own, admin read all
- **Jenjang/Kelas/Murid**: Readable by all, admin only manage
- **Absensi**: Guru bisa insert/update
- **Kendala/Saran**: Guru insert, Pengurus update

---

## ✅ Testing Checklist

After running schema:

- [ ] Signup baru user → profile otomatis dibuat
- [ ] Profile punya role sesuai yang dikirim
- [ ] Login user bisa access dashboard
- [ ] RLS policy allow authenticated read
- [ ] Trigger working saat auth user created
- [ ] murid_forms table ada dan bisa insert token
- [ ] Indexes created untuk performance

---

## 🔄 Migration dari Old Schema

Jika punya data existing:

1. **Backup data profiles:**

```sql
CREATE TABLE profiles_backup AS SELECT * FROM public.profiles;
```

2. **Update trigger saja** (jangan drop table)
3. **Add murid_forms table**
4. **Update RLS policies** (drop old, create new)
5. **Recreate indexes**

---

## 📝 Notes

- **SECURITY DEFINER functions** untuk trigger dan get_or_create_profile bisa bypass RLS
- **IF NOT EXISTS** pada CREATE TABLE untuk safety (idempotent)
- **ON CONFLICT** pada INSERT untuk handle duplikat
- **Indexes** sudah added untuk common queries (jenjang, kelas, murid_id, etc)

---

## 🆘 Troubleshooting

### Error: "Trigger already exists"

→ Ada `DROP TRIGGER IF EXISTS` di script, pastikan dijalankan

### Error: "RLS policy violated"

→ Cek policy di dashboard Supabase, recreate policy sesuai schema baru

### Profile tidak terbuat saat signUp

→ Check trigger logs di Supabase → Functions → handle_new_user → Logs

### Mirid form tidak bisa di-read

→ RLS di murid_forms allow anon+authenticated SELECT, check policy

---

**Last Updated:** March 6, 2026  
**For Project:** KBM Prima - Monitoring Pembelajaran
