-- ============================================
-- CREATE PUBLIC FUNCTION: Get or Create Profile
-- Ini bisa dipanggil oleh authenticated user untuk ensure profile ada
-- ============================================

CREATE OR REPLACE FUNCTION public.get_or_create_profile(
    user_id UUID,
    user_email TEXT,
    user_role TEXT DEFAULT 'pending'
)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) 
SECURITY DEFINER
LANGUAGE SQL
AS $$
    -- First try to return existing profile
    SELECT 
        p.id,
        p.email,
        p.full_name,
        p.role,
        p.created_at,
        p.updated_at
    FROM public.profiles p
    WHERE p.id = user_id
    
    UNION ALL
    
    -- If not found, create it and return
    INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
    VALUES (
        user_id,
        user_email,
        split_part(user_email, '@', 1),
        CASE 
            WHEN user_role NOT IN ('admin', 'pengurus', 'guru', 'orangtua', 'pending') THEN 'pending'
            ELSE user_role
        END,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        updated_at = NOW()
    RETURNING id, email, full_name, role, created_at, updated_at
    WHERE NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = user_id);
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_or_create_profile(UUID, TEXT, TEXT) TO authenticated;

-- Also create simpler version without role parameter
CREATE OR REPLACE FUNCTION public.get_or_create_profile(
    user_id UUID,
    user_email TEXT
)
RETURNS TABLE (
    id UUID,
    email TEXT,
    full_name TEXT,
    role TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
) 
SECURITY DEFINER
LANGUAGE SQL
AS $$
    SELECT * FROM public.get_or_create_profile(user_id, user_email, 'pending');
$$;

GRANT EXECUTE ON FUNCTION public.get_or_create_profile(UUID, TEXT) TO authenticated;
