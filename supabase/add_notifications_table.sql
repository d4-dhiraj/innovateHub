-- Create notifications table to track user notifications
-- Note: If this table already exists without the is_read column, run add_is_read_column_to_notifications.sql

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  problem_id UUID REFERENCES problems(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE notifications IS 'Stores notifications for users about their problems and partnerships';
COMMENT ON COLUMN notifications.user_id IS 'The user who should receive this notification';
COMMENT ON COLUMN notifications.problem_id IS 'Optional: the problem this notification relates to';
COMMENT ON COLUMN notifications.message IS 'The notification message content';
COMMENT ON COLUMN notifications.type IS 'Notification type for styling: info, success, warning, error';
COMMENT ON COLUMN notifications.is_read IS 'Whether the user has read this notification';
COMMENT ON COLUMN notifications.created_at IS 'When the notification was created';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_problem_id ON notifications(problem_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
