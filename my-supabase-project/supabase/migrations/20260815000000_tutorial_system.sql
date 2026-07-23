BEGIN;

-- Tutorial categories (admin can reorder/disable)
CREATE TABLE IF NOT EXISTS public.tutorial_categories (
  id              text PRIMARY KEY,
  title           text NOT NULL,
  description     text,
  icon            text,
  sort_order      int DEFAULT 0,
  is_published    boolean DEFAULT true,
  updated_at      timestamptz DEFAULT now()
);

-- Tutorial articles
CREATE TABLE IF NOT EXISTS public.tutorial_articles (
  id              text PRIMARY KEY, -- 'getting-started/welcome'
  category_id     text NOT NULL REFERENCES public.tutorial_categories(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  sort_order      int DEFAULT 0,
  is_published    boolean DEFAULT true,
  updated_at      timestamptz DEFAULT now()
);

-- Tutorial content steps (admin-editable + optional media)
CREATE TABLE IF NOT EXISTS public.tutorial_content (
  id              text PRIMARY KEY, -- 'getting-started/welcome/0'
  category_id     text NOT NULL,
  article_id      text NOT NULL REFERENCES public.tutorial_articles(id) ON DELETE CASCADE,
  step_index      int NOT NULL,
  text_content    text NOT NULL,
  media_url       text,
  media_type      text CHECK (media_type IS NULL OR media_type IN ('image', 'gif', 'video')),
  media_alt       text,
  is_published    boolean DEFAULT true,
  sort_order      int DEFAULT 0,
  updated_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tutorial_content_article
  ON public.tutorial_content (category_id, article_id, step_index);

CREATE INDEX IF NOT EXISTS idx_tutorial_articles_category
  ON public.tutorial_articles (category_id, sort_order);

-- User read progress
CREATE TABLE IF NOT EXISTS public.tutorial_progress (
  user_id         uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  article_id      text NOT NULL,
  completed       boolean DEFAULT false,
  last_read_at    timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, article_id)
);

-- RLS
ALTER TABLE public.tutorial_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorial_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutorial_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read published tutorials" ON public.tutorial_content;
DROP POLICY IF EXISTS "Anyone can read published categories" ON public.tutorial_categories;
DROP POLICY IF EXISTS "Anyone can read published articles" ON public.tutorial_articles;
DROP POLICY IF EXISTS "Users manage own progress" ON public.tutorial_progress;
DROP POLICY IF EXISTS "Admin can write tutorials" ON public.tutorial_content;
DROP POLICY IF EXISTS "Admin can write categories" ON public.tutorial_categories;
DROP POLICY IF EXISTS "Admin can write articles" ON public.tutorial_articles;

CREATE POLICY "Anyone can read published tutorials" ON public.tutorial_content
  FOR SELECT USING (is_published = true);

CREATE POLICY "Anyone can read published categories" ON public.tutorial_categories
  FOR SELECT USING (is_published = true);

CREATE POLICY "Anyone can read published articles" ON public.tutorial_articles
  FOR SELECT USING (is_published = true);

CREATE POLICY "Users manage own progress" ON public.tutorial_progress
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin can write tutorials" ON public.tutorial_content
  FOR ALL USING (
    auth.role() = 'service_role' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can write categories" ON public.tutorial_categories
  FOR ALL USING (
    auth.role() = 'service_role' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admin can write articles" ON public.tutorial_articles
  FOR ALL USING (
    auth.role() = 'service_role' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    auth.role() = 'service_role' OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Storage bucket for tutorial media (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('tutorial-media', 'tutorial-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public read tutorial media" ON storage.objects;
DROP POLICY IF EXISTS "Admin write tutorial media" ON storage.objects;

CREATE POLICY "Public read tutorial media" ON storage.objects
  FOR SELECT USING (bucket_id = 'tutorial-media');

CREATE POLICY "Admin write tutorial media" ON storage.objects
  FOR ALL USING (
    bucket_id = 'tutorial-media' AND (
      auth.role() = 'service_role' OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  )
  WITH CHECK (
    bucket_id = 'tutorial-media' AND (
      auth.role() = 'service_role' OR
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
  );

COMMIT;
