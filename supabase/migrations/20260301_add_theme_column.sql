-- Add theme column to timetables table
ALTER TABLE public.timetables
ADD COLUMN theme TEXT DEFAULT 'modern-neon';
