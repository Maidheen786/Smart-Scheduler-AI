-- Add theme column to timetables table
ALTER TABLE public.timetables
ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'modern-neon';

-- Comment on the column
COMMENT ON COLUMN public.timetables.theme IS 'Theme ID selected for this timetable';
