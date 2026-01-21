-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporting_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reported_event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  event_creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_reported_event_id ON reports(reported_event_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reporting_user_id ON reports(reporting_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_event_creator_id ON reports(event_creator_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Unique constraint to prevent duplicate reports from the same user for the same event
-- Note: This allows multiple anonymous reports (NULL reporting_user_id) since NULL != NULL in unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS idx_reports_unique_user_event 
  ON reports(reported_event_id, reporting_user_id)
  WHERE reporting_user_id IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can create reports (INSERT)
CREATE POLICY "Users can create reports"
  ON reports
  FOR INSERT
  WITH CHECK (true); -- Allow anonymous reports

-- Users can read their own reports (SELECT)
CREATE POLICY "Users can read their own reports"
  ON reports
  FOR SELECT
  USING (auth.uid() = reporting_user_id OR reporting_user_id IS NULL);

-- No UPDATE/DELETE policies - admin-only via database

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
