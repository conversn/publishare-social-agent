-- Authors Management System for Publishare
-- Allows users to have multiple authors under their account

-- ========================================
-- 1. CREATE AUTHORS TABLE
-- ========================================

CREATE TABLE public.authors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  bio TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'author' CHECK (role IN ('author', 'editor', 'contributor', 'admin')),
  is_active BOOLEAN DEFAULT true,
  permissions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique author names per user
  UNIQUE(user_id, name)
);

-- ========================================
-- 2. UPDATE ARTICLES TABLE TO USE AUTHORS
-- ========================================

-- Add author_id to articles (keeping user_id for ownership)
ALTER TABLE articles ADD COLUMN author_id UUID REFERENCES public.authors(id);
CREATE INDEX idx_articles_author_id ON articles(author_id);

-- Update articles to have both user_id (owner) and author_id (writer)
-- user_id = account owner, author_id = actual writer
COMMENT ON COLUMN articles.user_id IS 'Account owner who owns this content';
COMMENT ON COLUMN articles.author_id IS 'Specific author who wrote this content';

-- ========================================
-- 3. CREATE AUTHOR INVITATIONS TABLE
-- ========================================

CREATE TABLE public.author_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_name TEXT NOT NULL,
  role TEXT DEFAULT 'author' CHECK (role IN ('author', 'editor', 'contributor', 'admin')),
  permissions JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 4. CREATE AUTHOR COLLABORATIONS TABLE
-- ========================================

CREATE TABLE public.author_collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.authors(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'contributor' CHECK (role IN ('primary', 'contributor', 'reviewer', 'editor')),
  contribution_type TEXT DEFAULT 'writing' CHECK (contribution_type IN ('writing', 'editing', 'research', 'review')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique author per article collaboration
  UNIQUE(article_id, author_id)
);

-- ========================================
-- 5. CREATE AUTHOR PERMISSIONS SYSTEM
-- ========================================

CREATE TABLE public.author_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.authors(id) ON DELETE CASCADE,
  permission_type TEXT NOT NULL CHECK (permission_type IN (
    'create_articles', 'edit_articles', 'delete_articles', 'publish_articles',
    'manage_authors', 'view_analytics', 'manage_settings', 'manage_billing'
  )),
  granted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique permission per author
  UNIQUE(author_id, permission_type)
);

-- ========================================
-- 6. ENABLE ROW LEVEL SECURITY
-- ========================================

ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE author_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE author_collaborations ENABLE ROW LEVEL SECURITY;
ALTER TABLE author_permissions ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 7. CREATE RLS POLICIES
-- ========================================

-- Authors policies
CREATE POLICY "Users can view their own authors" ON authors
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own authors" ON authors
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own authors" ON authors
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own authors" ON authors
  FOR DELETE USING (auth.uid()::text = user_id);

-- Author invitations policies
CREATE POLICY "Users can view their own invitations" ON author_invitations
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert their own invitations" ON author_invitations
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own invitations" ON author_invitations
  FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own invitations" ON author_invitations
  FOR DELETE USING (auth.uid()::text = user_id);

-- Author collaborations policies (users can see collaborations on their articles)
CREATE POLICY "Users can view collaborations on their articles" ON author_collaborations
  FOR SELECT USING (
    auth.uid()::text = (
      SELECT user_id FROM articles WHERE id = author_collaborations.article_id
    )
  );

CREATE POLICY "Users can manage collaborations on their articles" ON author_collaborations
  FOR ALL USING (
    auth.uid()::text = (
      SELECT user_id FROM articles WHERE id = author_collaborations.article_id
    )
  );

-- Author permissions policies
CREATE POLICY "Users can view permissions for their authors" ON author_permissions
  FOR SELECT USING (
    auth.uid()::text = (
      SELECT user_id FROM authors WHERE id = author_permissions.author_id
    )
  );

CREATE POLICY "Users can manage permissions for their authors" ON author_permissions
  FOR ALL USING (
    auth.uid()::text = (
      SELECT user_id FROM authors WHERE id = author_permissions.author_id
    )
  );

-- ========================================
-- 8. CREATE HELPER FUNCTIONS
-- ========================================

-- Function to create default author for new users
CREATE OR REPLACE FUNCTION create_default_author_for_user(user_uuid UUID, user_email TEXT, user_name TEXT)
RETURNS UUID AS $$
DECLARE
  author_id UUID;
BEGIN
  INSERT INTO authors (user_id, name, email, role, permissions)
  VALUES (
    user_uuid,
    COALESCE(user_name, 'Primary Author'),
    user_email,
    'admin',
    '{"create_articles": true, "edit_articles": true, "delete_articles": true, "publish_articles": true, "manage_authors": true, "view_analytics": true, "manage_settings": true, "manage_billing": true}'::jsonb
  )
  RETURNING id INTO author_id;
  
  RETURN author_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's authors with permissions
CREATE OR REPLACE FUNCTION get_user_authors(user_uuid TEXT)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  bio TEXT,
  avatar_url TEXT,
  role TEXT,
  is_active BOOLEAN,
  permissions JSONB,
  article_count BIGINT,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.name,
    a.email,
    a.bio,
    a.avatar_url,
    a.role,
    a.is_active,
    a.permissions,
    COUNT(DISTINCT art.id)::BIGINT as article_count,
    a.created_at
  FROM authors a
  LEFT JOIN articles art ON art.author_id = a.id
  WHERE a.user_id = user_uuid::UUID
  GROUP BY a.id, a.name, a.email, a.bio, a.avatar_url, a.role, a.is_active, a.permissions, a.created_at
  ORDER BY a.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if author has permission
CREATE OR REPLACE FUNCTION author_has_permission(author_uuid UUID, permission_type TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  has_permission BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM author_permissions 
    WHERE author_id = author_uuid 
    AND permission_type = author_has_permission.permission_type 
    AND granted = true
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to invite new author
CREATE OR REPLACE FUNCTION invite_author(
  user_uuid UUID,
  invited_email TEXT,
  invited_name TEXT,
  author_role TEXT DEFAULT 'author',
  author_permissions JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  invitation_id UUID;
  invitation_token TEXT;
BEGIN
  -- Generate secure token
  invitation_token := encode(gen_random_bytes(32), 'hex');
  
  INSERT INTO author_invitations (
    user_id, 
    invited_email, 
    invited_name, 
    role, 
    permissions, 
    token, 
    expires_at
  )
  VALUES (
    user_uuid,
    invited_email,
    invited_name,
    author_role,
    author_permissions,
    invitation_token,
    NOW() + INTERVAL '7 days'
  )
  RETURNING id INTO invitation_id;
  
  RETURN invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept author invitation
CREATE OR REPLACE FUNCTION accept_author_invitation(invitation_token TEXT)
RETURNS UUID AS $$
DECLARE
  invitation_record RECORD;
  new_author_id UUID;
BEGIN
  -- Get invitation details
  SELECT * INTO invitation_record 
  FROM author_invitations 
  WHERE token = invitation_token 
  AND status = 'pending' 
  AND expires_at > NOW();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invitation token';
  END IF;
  
  -- Create the author
  INSERT INTO authors (
    user_id, 
    name, 
    email, 
    role, 
    permissions
  )
  VALUES (
    invitation_record.user_id,
    invitation_record.invited_name,
    invitation_record.invited_email,
    invitation_record.role,
    invitation_record.permissions
  )
  RETURNING id INTO new_author_id;
  
  -- Update invitation status
  UPDATE author_invitations 
  SET status = 'accepted', accepted_at = NOW()
  WHERE id = invitation_record.id;
  
  -- Create default permissions if none specified
  IF invitation_record.permissions = '{}'::jsonb THEN
    INSERT INTO author_permissions (author_id, permission_type, granted)
    VALUES 
      (new_author_id, 'create_articles', true),
      (new_author_id, 'edit_articles', true),
      (new_author_id, 'view_analytics', true);
  ELSE
    -- Insert specified permissions
    INSERT INTO author_permissions (author_id, permission_type, granted)
    SELECT 
      new_author_id,
      key::TEXT,
      value::BOOLEAN
    FROM jsonb_each(invitation_record.permissions);
  END IF;
  
  RETURN new_author_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 9. UPDATE EXISTING TRIGGER
-- ========================================

-- Update the user creation trigger to also create a default author
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  default_author_id UUID;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    'user'
  );
  
  -- Create default author
  SELECT create_default_author_for_user(new.id, new.email, new.raw_user_meta_data->>'full_name')
  INTO default_author_id;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 10. CREATE VIEWS FOR DASHBOARD
-- ========================================

-- View for user's author dashboard
CREATE OR REPLACE VIEW user_authors_dashboard AS
SELECT 
  u.id as user_id,
  p.full_name as user_name,
  p.email as user_email,
  COUNT(DISTINCT a.id) as total_authors,
  COUNT(DISTINCT CASE WHEN a.is_active = true THEN a.id END) as active_authors,
  COUNT(DISTINCT art.id) as total_articles,
  COUNT(DISTINCT CASE WHEN art.status = 'published' THEN art.id END) as published_articles,
  MAX(art.created_at) as last_article_created
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
LEFT JOIN authors a ON a.user_id = u.id
LEFT JOIN articles art ON art.author_id = a.id
GROUP BY u.id, p.full_name, p.email;

-- View for author analytics
CREATE OR REPLACE VIEW author_analytics AS
SELECT 
  a.id as author_id,
  a.name as author_name,
  a.user_id,
  COUNT(DISTINCT art.id) as total_articles,
  COUNT(DISTINCT CASE WHEN art.status = 'published' THEN art.id END) as published_articles,
  COUNT(DISTINCT CASE WHEN art.status = 'draft' THEN art.id END) as draft_articles,
  COALESCE(SUM(CAST(art.meta_description AS INTEGER)), 0) as total_views,
  COALESCE(AVG(CAST(art.seo_score AS NUMERIC)), 0) as avg_engagement_rate,
  MAX(art.created_at) as last_article_created,
  COUNT(DISTINCT ac.article_id) as collaboration_count
FROM authors a
LEFT JOIN articles art ON art.author_id = a.id
LEFT JOIN author_collaborations ac ON ac.author_id = a.id
GROUP BY a.id, a.name, a.user_id;

-- ========================================
-- 11. CREATE INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX idx_authors_user_id ON authors(user_id);
CREATE INDEX idx_authors_email ON authors(email);
CREATE INDEX idx_author_invitations_user_id ON author_invitations(user_id);
CREATE INDEX idx_author_invitations_token ON author_invitations(token);
CREATE INDEX idx_author_invitations_status ON author_invitations(status);
CREATE INDEX idx_author_collaborations_article_id ON author_collaborations(article_id);
CREATE INDEX idx_author_collaborations_author_id ON author_collaborations(author_id);
CREATE INDEX idx_author_permissions_author_id ON author_permissions(author_id);
CREATE INDEX idx_author_permissions_type ON author_permissions(permission_type);

-- ========================================
-- 12. MIGRATION FOR EXISTING DATA
-- ========================================

-- Function to migrate existing articles to use authors
CREATE OR REPLACE FUNCTION migrate_existing_articles_to_authors()
RETURNS void AS $$
DECLARE
  user_record RECORD;
  default_author_id UUID;
BEGIN
  -- For each user with articles but no authors, create a default author
  FOR user_record IN 
    SELECT DISTINCT a.user_id 
    FROM articles a 
    LEFT JOIN authors auth ON auth.user_id = a.user_id 
    WHERE auth.id IS NULL AND a.user_id IS NOT NULL
  LOOP
    -- Create default author for this user
    SELECT create_default_author_for_user(
      user_record.user_id, 
      (SELECT email FROM profiles WHERE id = user_record.user_id),
      (SELECT full_name FROM profiles WHERE id = user_record.user_id)
    ) INTO default_author_id;
    
    -- Update articles to use the default author
    UPDATE articles 
    SET author_id = default_author_id 
    WHERE user_id = user_record.user_id AND author_id IS NULL;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute migration
SELECT migrate_existing_articles_to_authors();
