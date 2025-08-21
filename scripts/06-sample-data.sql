-- This script adds sample data for testing
-- Note: You'll need to create user accounts through the app first, then update the host_id values

-- Sample properties (replace the host_id with actual user IDs from your auth.users table)
-- You can get user IDs by running: SELECT id, email FROM auth.users;

-- Example insert (uncomment and update with real user IDs after creating accounts):
/*
INSERT INTO public.properties (
    host_id,
    title,
    description,
    property_type,
    address,
    city,
    state,
    country,
    price_per_month,
    bedrooms,
    bathrooms,
    area_sqft,
    max_occupants,
    is_furnished,
    is_pet_friendly,
    is_smoking_allowed,
    is_available,
    amenities,
    images
) VALUES 
(
    'YOUR_USER_ID_HERE', -- Replace with actual user ID
    'Modern Downtown Studio',
    'Beautiful modern studio apartment in the heart of downtown. Perfect for young professionals.',
    'studio',
    '123 Main Street',
    'New York',
    'NY',
    'United States',
    2500,
    0,
    1,
    450,
    1,
    true,
    false,
    false,
    true,
    ARRAY['WiFi', 'AC', 'Kitchen', 'Elevator'],
    ARRAY['/images/modern-room.jpg']
),
(
    'YOUR_USER_ID_HERE', -- Replace with actual user ID
    'Cozy Shared Room Near University',
    'Comfortable shared room perfect for students. Close to campus and public transportation.',
    'shared_room',
    '456 College Ave',
    'Boston',
    'MA',
    'United States',
    800,
    1,
    1,
    300,
    2,
    true,
    true,
    false,
    true,
    ARRAY['WiFi', 'Laundry', 'Study Area', 'Kitchen'],
    ARRAY['/images/shared-room.jpg']
);
*/

-- To use this sample data:
-- 1. Create user accounts through the app
-- 2. Get the user IDs from Supabase dashboard (Authentication > Users)
-- 3. Replace 'YOUR_USER_ID_HERE' with actual UUIDs
-- 4. Uncomment and run the INSERT statements
