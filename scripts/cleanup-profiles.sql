-- Check for duplicate profiles
SELECT email, COUNT(*) as count
FROM public.profiles
GROUP BY email
HAVING COUNT(*) > 1;

-- Remove duplicate profiles (keep the oldest one for each email)
WITH duplicates AS (
    SELECT id, email, 
           ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at ASC) as rn
    FROM public.profiles
)
DELETE FROM public.profiles 
WHERE id IN (
    SELECT id FROM duplicates WHERE rn > 1
);

-- Check for users without profiles
SELECT u.id, u.email
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- Create missing profiles for existing users
INSERT INTO public.profiles (id, email, full_name, is_host)
SELECT 
    u.id, 
    u.email, 
    COALESCE(u.raw_user_meta_data->>'full_name', ''),
    COALESCE((u.raw_user_meta_data->>'is_host')::boolean, false)
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;
