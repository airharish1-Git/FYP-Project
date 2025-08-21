-- Check if tables exist
SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
) AS profiles_exists;

SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'properties'
) AS properties_exists;

-- Check if storage bucket exists
SELECT EXISTS (
    SELECT FROM storage.buckets
    WHERE id = 'property-images'
) AS storage_bucket_exists;

-- Check if triggers exist
SELECT EXISTS (
    SELECT FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
) AS user_trigger_exists;

-- List all public tables
SELECT tablename 
FROM pg_catalog.pg_tables
WHERE schemaname = 'public';
