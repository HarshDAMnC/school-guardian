-- Remove auto-increment default from roll_no column
ALTER TABLE public.students ALTER COLUMN roll_no DROP DEFAULT;

-- Drop the sequence since we no longer need it
DROP SEQUENCE IF EXISTS students_roll_no_seq;