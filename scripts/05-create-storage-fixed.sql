-- Create storage bucket for property images (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('property-images', 'property-images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload property images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'property-images');

-- Create policy to allow public access to view images
CREATE POLICY "Public can view property images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'property-images');

-- Create policy to allow users to update their own images
CREATE POLICY "Users can update their own property images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow users to delete their own images
CREATE POLICY "Users can delete their own property images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);
