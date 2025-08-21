-- Create storage bucket for property images
INSERT INTO storage.buckets (id, name, public) VALUES ('property-images', 'property-images', true);

-- Create policy to allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'property-images' AND auth.role() = 'authenticated');

-- Create policy to allow public access to images
CREATE POLICY "Public can view images" ON storage.objects
FOR SELECT USING (bucket_id = 'property-images');

-- Create policy to allow users to update their own images
CREATE POLICY "Users can update their own images" ON storage.objects
FOR UPDATE USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policy to allow users to delete their own images
CREATE POLICY "Users can delete their own images" ON storage.objects
FOR DELETE USING (bucket_id = 'property-images' AND auth.uid()::text = (storage.foldername(name))[1]);
