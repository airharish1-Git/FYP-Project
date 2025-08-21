-- Create call_signals table
CREATE TABLE IF NOT EXISTS call_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tour_id UUID NOT NULL REFERENCES virtual_tours(id) ON DELETE CASCADE,
  signal_data JSONB NOT NULL,
  is_host BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS call_signals_conversation_id_idx ON call_signals(conversation_id);

-- Add RLS policies
ALTER TABLE call_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own call signals"
  ON call_signals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (
        c.property_id IN (
          SELECT id FROM properties WHERE host_id = auth.uid()
        )
        OR c.participant1_id = auth.uid()
        OR c.participant2_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view call signals for their conversations"
  ON call_signals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_id
      AND (
        c.property_id IN (
          SELECT id FROM properties WHERE host_id = auth.uid()
        )
        OR c.participant1_id = auth.uid()
        OR c.participant2_id = auth.uid()
      )
    )
  ); 