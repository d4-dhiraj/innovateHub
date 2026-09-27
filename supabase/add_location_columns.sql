-- Add latitude and longitude columns to problems table
ALTER TABLE problems 
ADD COLUMN latitude FLOAT,
ADD COLUMN longitude FLOAT;

-- Add comments to the columns
COMMENT ON COLUMN problems.latitude IS 'Latitude coordinate of the problem location';
COMMENT ON COLUMN problems.longitude IS 'Longitude coordinate of the problem location';

-- Make location optional since we'll use lat/long now
ALTER TABLE problems ALTER COLUMN location DROP NOT NULL;
