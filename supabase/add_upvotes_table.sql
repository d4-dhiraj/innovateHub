-- Create table to track user upvotes
CREATE TABLE IF NOT EXISTS problem_upvotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(problem_id, user_id) -- Prevent duplicate upvotes
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_problem_upvotes_problem_id ON problem_upvotes(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_upvotes_user_id ON problem_upvotes(user_id);

-- Enable RLS
ALTER TABLE problem_upvotes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own upvotes
CREATE POLICY "Users can read own upvotes"
  ON problem_upvotes FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own upvotes
CREATE POLICY "Users can insert own upvotes"
  ON problem_upvotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own upvotes
CREATE POLICY "Users can delete own upvotes"
  ON problem_upvotes FOR DELETE
  USING (auth.uid() = user_id);
