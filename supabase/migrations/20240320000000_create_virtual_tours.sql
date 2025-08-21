-- Create virtual_tours table
CREATE TABLE IF NOT EXISTS virtual_tours (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS virtual_tours_conversation_id_idx ON virtual_tours(conversation_id);
CREATE INDEX IF NOT EXISTS virtual_tours_property_id_idx ON virtual_tours(property_id);
CREATE INDEX IF NOT EXISTS virtual_tours_host_id_idx ON virtual_tours(host_id);

-- Add RLS policies
ALTER TABLE virtual_tours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own virtual tours"
  ON virtual_tours FOR SELECT
  USING (
    auth.uid() = host_id OR
    auth.uid() IN (
      SELECT participant1_id FROM conversations WHERE id = conversation_id
      UNION
      SELECT participant2_id FROM conversations WHERE id = conversation_id
    )
  );

CREATE POLICY "Users can create virtual tours"
  ON virtual_tours FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT participant1_id FROM conversations WHERE id = conversation_id
      UNION
      SELECT participant2_id FROM conversations WHERE id = conversation_id
    )
  );

CREATE POLICY "Hosts can update virtual tours"
  ON virtual_tours FOR UPDATE
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_virtual_tours_updated_at
  BEFORE UPDATE ON virtual_tours
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 