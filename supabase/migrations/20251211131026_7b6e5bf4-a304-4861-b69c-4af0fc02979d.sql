-- Students table with roll_no as primary key
CREATE TABLE public.students (
  roll_no SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  class TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Parents detail table
CREATE TABLE public.parents_detail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_no INTEGER NOT NULL REFERENCES public.students(roll_no) ON DELETE CASCADE,
  parent_name TEXT NOT NULL,
  address TEXT,
  contact TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily attendance table
CREATE TABLE public.daily_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roll_no INTEGER NOT NULL REFERENCES public.students(roll_no) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('P', 'A')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(roll_no, date)
);

-- Yearly attendance table
CREATE TABLE public.yearly_attendance (
  roll_no INTEGER PRIMARY KEY REFERENCES public.students(roll_no) ON DELETE CASCADE,
  present_days INTEGER DEFAULT 0,
  absent_days INTEGER DEFAULT 0,
  percent_present FLOAT DEFAULT 0
);

-- Function to auto-create yearly attendance record when student is added
CREATE OR REPLACE FUNCTION public.create_yearly_attendance()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.yearly_attendance (roll_no, present_days, absent_days, percent_present)
  VALUES (NEW.roll_no, 0, 0, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create yearly attendance on student insert
CREATE TRIGGER on_student_created
  AFTER INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.create_yearly_attendance();

-- Function to update yearly attendance when daily attendance is marked
CREATE OR REPLACE FUNCTION public.update_yearly_attendance()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Trigger to update yearly attendance
CREATE TRIGGER on_attendance_marked
  AFTER INSERT ON public.daily_attendance
  FOR EACH ROW
  EXECUTE FUNCTION public.update_yearly_attendance();

-- Admin profiles table for authentication
CREATE TABLE public.admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies - Disabled as per requirement (public access via API)
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parents_detail ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yearly_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- Public read/write policies for authenticated users
CREATE POLICY "Authenticated users can manage students" ON public.students FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage parents" ON public.parents_detail FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage daily attendance" ON public.daily_attendance FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Authenticated users can manage yearly attendance" ON public.yearly_attendance FOR ALL USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can read own profile" ON public.admin_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.admin_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Function to create admin profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_admin()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.admin_profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for admin profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_admin();