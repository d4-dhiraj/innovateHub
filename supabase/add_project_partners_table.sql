-- Create project_partners table to track industry collaboration interests
CREATE TABLE project_partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  problem_id UUID NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  industry_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  collaboration_type VARCHAR(100) NOT NULL CHECK (collaboration_type IN ('Mentorship', 'Funding', 'Prototyping Support', 'Technology Transfer')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'interested', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(problem_id, industry_id) -- Prevent duplicate interest from same industry
);

-- Add comments
COMMENT ON TABLE project_partners IS 'Tracks industry organizations interested in collaborating on specific projects';
COMMENT ON COLUMN project_partners.problem_id IS 'The problem/project the industry is interested in';
COMMENT ON COLUMN project_partners.industry_id IS 'The industry user profile expressing interest';
COMMENT ON COLUMN project_partners.collaboration_type IS 'Type of collaboration offered: Mentorship, Funding, Prototyping Support, or Technology Transfer';
COMMENT ON COLUMN project_partners.status IS 'Partnership status: pending, interested, accepted, or declined';
COMMENT ON COLUMN project_partners.created_at IS 'When the interest was expressed';

-- Create index for faster queries
CREATE INDEX idx_project_partners_problem_id ON project_partners(problem_id);
CREATE INDEX idx_project_partners_industry_id ON project_partners(industry_id);
CREATE INDEX idx_project_partners_status ON project_partners(status);
