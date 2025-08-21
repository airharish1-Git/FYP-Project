-- Add status column to properties table
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'available' 
CHECK (status IN ('available', 'sold', 'pending'));

-- Update existing properties to have 'available' status
UPDATE public.properties 
SET status = 'available' 
WHERE status IS NULL; 