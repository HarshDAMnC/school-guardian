-- Add is_enrolled column to students table
ALTER TABLE public.students 
ADD COLUMN is_enrolled boolean NOT NULL DEFAULT false;

-- Add identifier_code column for fingerprint ID
ALTER TABLE public.students 
ADD COLUMN identifier_code integer;