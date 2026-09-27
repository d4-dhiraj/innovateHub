-- Add organization name and type columns to profiles table for industry users
ALTER TABLE profiles 
ADD COLUMN org_name VARCHAR(255),
ADD COLUMN org_type VARCHAR(100);

-- Add comments to the columns
COMMENT ON COLUMN profiles.org_name IS 'Organization name for industry users';
COMMENT ON COLUMN profiles.org_type IS 'Organization type for industry users (Startup, MSME, CSR Organization, Research Lab, Large Enterprise)';
