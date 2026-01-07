-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'researcher', 'student');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  bio TEXT,
  affiliation TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create research_labels enum
CREATE TYPE public.research_label AS ENUM ('practical_research', 'capstone', 'thesis', 'dissertation', 'other');

-- Create research_strand enum
CREATE TYPE public.research_strand AS ENUM ('STEM', 'HUMSS', 'ABM', 'ICT', 'GAS', 'Other');

-- Create access_level enum
CREATE TYPE public.access_level AS ENUM ('public', 'authenticated', 'restricted');

-- Create researches table
CREATE TABLE public.researches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  abstract TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_url TEXT,
  file_name TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  academic_year TEXT,
  strand research_strand DEFAULT 'Other',
  label research_label DEFAULT 'other',
  access_level access_level NOT NULL DEFAULT 'public',
  abstract_visible BOOLEAN NOT NULL DEFAULT true,
  citation_apa TEXT,
  citation_mla TEXT,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create bookmarks table
CREATE TABLE public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  research_id UUID NOT NULL REFERENCES public.researches(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, research_id)
);

-- Create Q&A questions table
CREATE TABLE public.qa_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  research_id UUID NOT NULL REFERENCES public.researches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Q&A answers table
CREATE TABLE public.qa_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.qa_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create Q&A upvotes table
CREATE TABLE public.qa_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id UUID REFERENCES public.qa_questions(id) ON DELETE CASCADE,
  answer_id UUID REFERENCES public.qa_answers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT upvote_target CHECK (
    (question_id IS NOT NULL AND answer_id IS NULL) OR
    (question_id IS NULL AND answer_id IS NOT NULL)
  ),
  UNIQUE(user_id, question_id),
  UNIQUE(user_id, answer_id)
);

-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  is_read BOOLEAN NOT NULL DEFAULT false,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create search_history table
CREATE TABLE public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.researches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
ON public.profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- User roles policies
CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own role on signup"
ON public.user_roles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Researches policies
CREATE POLICY "Public researches viewable by all"
ON public.researches FOR SELECT
USING (
  access_level = 'public' 
  OR (access_level = 'authenticated' AND auth.uid() IS NOT NULL)
  OR author_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Researchers can insert researches"
ON public.researches FOR INSERT
WITH CHECK (
  auth.uid() = author_id 
  AND (public.has_role(auth.uid(), 'researcher') OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Authors and admins can update researches"
ON public.researches FOR UPDATE
USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authors and admins can delete researches"
ON public.researches FOR DELETE
USING (auth.uid() = author_id OR public.has_role(auth.uid(), 'admin'));

-- Bookmarks policies
CREATE POLICY "Users can view own bookmarks"
ON public.bookmarks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookmarks"
ON public.bookmarks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
ON public.bookmarks FOR DELETE
USING (auth.uid() = user_id);

-- Q&A Questions policies
CREATE POLICY "Questions viewable by authenticated users"
ON public.qa_questions FOR SELECT
USING (auth.uid() IS NOT NULL AND is_deleted = false);

CREATE POLICY "Authenticated users can create questions"
ON public.qa_questions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own questions"
ON public.qa_questions FOR UPDATE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete questions"
ON public.qa_questions FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Q&A Answers policies
CREATE POLICY "Answers viewable by authenticated users"
ON public.qa_answers FOR SELECT
USING (auth.uid() IS NOT NULL AND is_deleted = false);

CREATE POLICY "Authenticated users can create answers"
ON public.qa_answers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own answers"
ON public.qa_answers FOR UPDATE
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete answers"
ON public.qa_answers FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Q&A Upvotes policies
CREATE POLICY "Upvotes viewable by all authenticated"
ON public.qa_upvotes FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create upvotes"
ON public.qa_upvotes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own upvotes"
ON public.qa_upvotes FOR DELETE
USING (auth.uid() = user_id);

-- Notifications policies
CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (true);

-- Search history policies
CREATE POLICY "Users can view own search history"
ON public.search_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert search history"
ON public.search_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own search history"
ON public.search_history FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_researches_updated_at
  BEFORE UPDATE ON public.researches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qa_questions_updated_at
  BEFORE UPDATE ON public.qa_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_qa_answers_updated_at
  BEFORE UPDATE ON public.qa_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'student')
  );
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for research files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('research-files', 'research-files', true);

-- Storage policies
CREATE POLICY "Research files are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'research-files');

CREATE POLICY "Researchers can upload research files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'research-files' 
  AND auth.uid() IS NOT NULL
  AND (public.has_role(auth.uid(), 'researcher') OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Authors can update own files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'research-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Authors and admins can delete files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'research-files' 
  AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;