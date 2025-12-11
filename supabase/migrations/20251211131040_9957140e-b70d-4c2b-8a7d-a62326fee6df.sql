-- Fix function search_path for create_yearly_attendance
CREATE OR REPLACE FUNCTION public.create_yearly_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.yearly_attendance (roll_no, present_days, absent_days, percent_present)
  VALUES (NEW.roll_no, 0, 0, 0);
  RETURN NEW;
END;
$$;

-- Fix function search_path for update_yearly_attendance
CREATE OR REPLACE FUNCTION public.update_yearly_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'P' THEN
      UPDATE public.yearly_attendance
      SET present_days = present_days + 1,
          percent_present = CASE 
            WHEN (present_days + 1 + absent_days) > 0 
            THEN ((present_days + 1)::float / (present_days + 1 + absent_days)::float) * 100
            ELSE 0
          END
      WHERE roll_no = NEW.roll_no;
    ELSE
      UPDATE public.yearly_attendance
      SET absent_days = absent_days + 1,
          percent_present = CASE 
            WHEN (present_days + absent_days + 1) > 0 
            THEN (present_days::float / (present_days + absent_days + 1)::float) * 100
            ELSE 0
          END
      WHERE roll_no = NEW.roll_no;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;