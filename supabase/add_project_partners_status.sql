-- Add status column to project_partners table if it doesn't exist
ALTER TABLE project_partners 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'interested', 'accepted', 'declined'));

-- Add comment for the new column
COMMENT ON COLUMN project_partners.status IS 'Partnership status: pending, accepted, or declined';

-- Create index for status if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_project_partners_status ON project_partners(status);

-- Update existing records to have 'pending' status
UPDATE project_partners 
SET status = 'pending' 
WHERE status IS NULL;
