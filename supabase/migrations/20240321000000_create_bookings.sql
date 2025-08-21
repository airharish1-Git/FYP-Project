-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  move_in_date DATE NOT NULL,
  duration_months INTEGER NOT NULL,
  tenant_name TEXT NOT NULL,
  tenant_phone TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS bookings_conversation_id_idx ON bookings(conversation_id);
CREATE INDEX IF NOT EXISTS bookings_property_id_idx ON bookings(property_id);
CREATE INDEX IF NOT EXISTS bookings_host_id_idx ON bookings(host_id);
CREATE INDEX IF NOT EXISTS bookings_tenant_id_idx ON bookings(tenant_id);

-- Add RLS policies
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookings"
  ON bookings FOR SELECT
  USING (
    auth.uid() = host_id OR
    auth.uid() = tenant_id
  );

CREATE POLICY "Users can create bookings"
  ON bookings FOR INSERT
  WITH CHECK (
    auth.uid() = tenant_id
  );

CREATE POLICY "Hosts can update bookings"
  ON bookings FOR UPDATE
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle booking approval
CREATE OR REPLACE FUNCTION handle_booking_approval()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
    -- Update property status to sold
    UPDATE properties
    SET status = 'sold'
    WHERE id = NEW.property_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking approval
CREATE TRIGGER on_booking_approval
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_booking_approval(); 