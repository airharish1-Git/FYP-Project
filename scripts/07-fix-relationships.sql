-- Drop existing foreign key constraints if they exist
ALTER TABLE public.properties DROP CONSTRAINT IF EXISTS properties_host_id_fkey;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_property_id_fkey;
ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS reviews_reviewer_id_fkey;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_property_id_fkey;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_tenant_id_fkey;
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_host_id_fkey;
ALTER TABLE public.inquiries DROP CONSTRAINT IF EXISTS inquiries_property_id_fkey;
ALTER TABLE public.inquiries DROP CONSTRAINT IF EXISTS inquiries_sender_id_fkey;
ALTER TABLE public.inquiries DROP CONSTRAINT IF EXISTS inquiries_recipient_id_fkey;
ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_user_id_fkey;
ALTER TABLE public.favorites DROP CONSTRAINT IF EXISTS favorites_property_id_fkey;

-- Recreate foreign key constraints with proper names
ALTER TABLE public.properties 
ADD CONSTRAINT properties_host_id_fkey 
FOREIGN KEY (host_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.reviews 
ADD CONSTRAINT reviews_property_id_fkey 
FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE public.reviews 
ADD CONSTRAINT reviews_reviewer_id_fkey 
FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_property_id_fkey 
FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_host_id_fkey 
FOREIGN KEY (host_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.inquiries 
ADD CONSTRAINT inquiries_property_id_fkey 
FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

ALTER TABLE public.inquiries 
ADD CONSTRAINT inquiries_sender_id_fkey 
FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.inquiries 
ADD CONSTRAINT inquiries_recipient_id_fkey 
FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.favorites 
ADD CONSTRAINT favorites_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.favorites 
ADD CONSTRAINT favorites_property_id_fkey 
FOREIGN KEY (property_id) REFERENCES public.properties(id) ON DELETE CASCADE;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
