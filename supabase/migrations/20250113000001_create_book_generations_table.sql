-- ========================================
-- Book Generations Database Schema
-- ========================================
-- 
-- Purpose: Store generated nonfiction books from the nonfiction-book-writer edge function
-- 
-- ========================================

-- ========================================
-- 1. CREATE BOOK_GENERATIONS TABLE
-- ========================================

-- Drop table if it exists (to avoid conflicts from previous attempts)
DROP TABLE IF EXISTS book_generations CASCADE;

CREATE TABLE book_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Book Metadata
  title VARCHAR(500) NOT NULL,
  total_words INTEGER DEFAULT 0,
  chapters INTEGER DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'generating', -- 'generating' | 'completed' | 'failed'
  
  -- Content
  content TEXT, -- Full markdown content of the book
  chapter_list JSONB, -- Array of {number, title, word_count, content}
  
  -- Generation Progress
  current_chapter INTEGER DEFAULT 0,
  checkpoint_data JSONB, -- Store intermediate state for recovery
  
  -- Source Information
  source_type VARCHAR(50), -- 'markdown_file' | 'blog_post' | 'url' | etc.
  source_content TEXT, -- Original source content (optional, for reference)
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- ========================================
-- 2. CREATE INDEXES
-- ========================================

CREATE INDEX idx_book_generations_status ON book_generations(status);
CREATE INDEX idx_book_generations_created_at ON book_generations(created_at DESC);
CREATE INDEX idx_book_generations_title ON book_generations(title);

-- ========================================
-- 3. CREATE UPDATED_AT TRIGGER
-- ========================================

CREATE OR REPLACE FUNCTION update_book_generations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_book_generations_updated_at
  BEFORE UPDATE ON book_generations
  FOR EACH ROW
  EXECUTE FUNCTION update_book_generations_updated_at();

-- ========================================
-- 4. GRANT PERMISSIONS
-- ========================================

-- Allow service role full access
ALTER TABLE book_generations ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role can manage book_generations"
  ON book_generations
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ========================================
-- 5. COMMENTS
-- ========================================

COMMENT ON TABLE book_generations IS 'Stores generated nonfiction books from the nonfiction-book-writer edge function';
COMMENT ON COLUMN book_generations.chapter_list IS 'JSONB array of chapter objects: [{number, title, word_count, content}]';
COMMENT ON COLUMN book_generations.checkpoint_data IS 'Intermediate state for recovery during long-running generation jobs';
COMMENT ON COLUMN book_generations.status IS 'Generation status: generating, completed, or failed';


