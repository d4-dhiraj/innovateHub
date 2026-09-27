-- Add after_photo_url column to problems table
-- Run this in your Supabase SQL Editor

ALTER TABLE problems 
ADD COLUMN after_photo_url TEXT;

-- Add comment to the column
COMMENT ON COLUMN problems.after_photo_url IS 'URL of the after photo showing the resolved state of the problem';

-- Add upvote_count column to problems table
ALTER TABLE problems 
ADD COLUMN upvote_count INTEGER DEFAULT 0;

-- Add comment to the column
COMMENT ON COLUMN problems.upvote_count IS 'Number of upvotes from citizens for this problem';