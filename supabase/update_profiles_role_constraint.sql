-- Drop the existing role check constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Add a new role check constraint that includes industry
ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('citizen', 'university', 'admin', 'industry'));

-- Verify the constraint was added correctly
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'profiles'::regclass 
AND conname = 'profiles_role_check';
