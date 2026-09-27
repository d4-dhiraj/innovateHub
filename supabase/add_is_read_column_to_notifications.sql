-- Add is_read column to existing notifications table
-- This fixes the column name from 'read' to 'is_read' for better naming convention

-- First, check if the column exists and rename it if it's called 'read'
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'read'
    ) THEN
        -- Rename the existing 'read' column to 'is_read'
        ALTER TABLE notifications RENAME COLUMN read TO is_read;
    ELSE IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'notifications' 
        AND column_name = 'is_read'
    ) THEN
        -- Add the is_read column if it doesn't exist
        ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT FALSE;
    END IF;
    END IF;
END $$;

-- Update the comment for the column
COMMENT ON COLUMN notifications.is_read IS 'Whether the user has read this notification';

-- Create index for is_read if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- Update existing records to have is_read = FALSE if they were NULL
UPDATE notifications 
SET is_read = FALSE 
WHERE is_read IS NULL;
