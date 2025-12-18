-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  dates JSONB NOT NULL, -- Array of {start: ISO string, end?: ISO string}
  price NUMERIC, -- NULL for unknown, 0 for free, positive for price
  location_name TEXT,
  location_address TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  website_url TEXT,
  social_media JSONB, -- {x?: string, instagram?: string, facebook?: string}
  description TEXT,
  organization_name TEXT,
  poster_image_url TEXT, -- URL to Supabase Storage
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_events_dates ON events USING GIN(dates);
CREATE INDEX IF NOT EXISTS idx_events_location ON events(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at DESC);

-- Enable Row Level Security
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read all events
CREATE POLICY "Users can read all events"
  ON events
  FOR SELECT
  USING (true);

-- Users can only create their own events
CREATE POLICY "Users can create their own events"
  ON events
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own events
CREATE POLICY "Users can update their own events"
  ON events
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can only delete their own events
CREATE POLICY "Users can delete their own events"
  ON events
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

