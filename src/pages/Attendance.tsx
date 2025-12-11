import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Save, Loader2, CalendarDays, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';

interface Student {
  roll_no: number;
  name: string;
  class: string;
}

interface AttendanceRecord {
  roll_no: number;
  status: 'P' | 'A';
}

interface WhatsAppStatus {
  roll_no: number;
  status: 'sending' | 'sent' | 'failed';
  message?: string;
}

export default function Attendance() {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Map<number, 'P' | 'A'>>(new Map());
  const [existingAttendance, setExistingAttendance] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<Map<number, WhatsAppStatus>>(new Map());
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch all students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .order('roll_no');

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

      // Fetch today's attendance
      const { data: attendanceData, error: attendanceError } = await supabase
        .from('daily_attendance')
        .select('roll_no, status')
        .eq('date', today);

      if (attendanceError) throw attendanceError;

      const attendanceMap = new Map<number, 'P' | 'A'>();
      const existingSet = new Set<number>();
      
      attendanceData?.forEach((record) => {
        attendanceMap.set(record.roll_no, record.status as 'P' | 'A');
        existingSet.add(record.roll_no);
      });

      // Set default to 'P' for students without attendance
      studentsData?.forEach((student) => {
        if (!attendanceMap.has(student.roll_no)) {
          attendanceMap.set(student.roll_no, 'P');
        }
      });

      setAttendance(attendanceMap);
      setExistingAttendance(existingSet);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateAttendance = (rollNo: number, status: 'P' | 'A') => {
    const newAttendance = new Map(attendance);
    newAttendance.set(rollNo, status);
    setAttendance(newAttendance);
  };

  const sendWhatsAppNotification = async (student: Student, parentContact: string) => {
    try {
      setWhatsappStatus(prev => {
        const newMap = new Map(prev);
        newMap.set(student.roll_no, { roll_no: student.roll_no, status: 'sending' });
        return newMap;
      });

      const { data, error } = await supabase.functions.invoke('send-whatsapp', {
        body: {
          studentName: student.name,
          rollNo: student.roll_no,
          contact: parentContact,
        },
      });

      if (error) throw error;

      setWhatsappStatus(prev => {
        const newMap = new Map(prev);
        newMap.set(student.roll_no, { 
          roll_no: student.roll_no, 
          status: 'sent',
          message: 'WhatsApp notification sent' 
        });
        return newMap;
      });
    } catch (error: any) {
      setWhatsappStatus(prev => {
        const newMap = new Map(prev);
        newMap.set(student.roll_no, { 
          roll_no: student.roll_no, 
          status: 'failed',
          message: error.message || 'Failed to send notification' 
        });
        return newMap;
      });
    }
  };

  const saveAttendance = async () => {
    setSaving(true);
    try {
      const newRecords: AttendanceRecord[] = [];
      const absentStudents: Student[] = [];

      for (const [rollNo, status] of attendance.entries()) {
        // Only save if not already saved today
        if (!existingAttendance.has(rollNo)) {
          newRecords.push({ roll_no: rollNo, status });
          if (status === 'A') {
            const student = students.find(s => s.roll_no === rollNo);
            if (student) absentStudents.push(student);
          }
        }
      }

      if (newRecords.length === 0) {
        toast({ title: 'Info', description: 'All attendance already saved for today' });
        setSaving(false);
        return;
      }

      // Insert attendance records
      const attendanceRecords = newRecords.map(r => ({
        roll_no: r.roll_no,
        status: r.status,
        date: today,
      }));

      const { error } = await supabase.from('daily_attendance').insert(attendanceRecords);
      if (error) throw error;

      toast({ 
        title: 'Success', 
        description: `Attendance saved for ${newRecords.length} students. Yearly stats updated automatically.` 
      });

      // Send WhatsApp notifications for absent students
      if (absentStudents.length > 0) {
        for (const student of absentStudents) {
          // Get parent contact
          const { data: parentData } = await supabase
            .from('parents_detail')
            .select('contact')
            .eq('roll_no', student.roll_no)
            .maybeSingle();

          if (parentData?.contact) {
            sendWhatsAppNotification(student, parentData.contact);
          } else {
            setWhatsappStatus(prev => {
              const newMap = new Map(prev);
              newMap.set(student.roll_no, { 
                roll_no: student.roll_no, 
                status: 'failed',
                message: 'No parent contact found' 
              });
              return newMap;
            });
          }
        }
      }

      // Refresh to show saved state
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const getStatusBadge = (rollNo: number) => {
    const wsStatus = whatsappStatus.get(rollNo);
    if (!wsStatus) return null;

    return (
      <span className={`ml-2 inline-flex items-center gap-1 text-xs ${
        wsStatus.status === 'sending' ? 'text-warning' :
        wsStatus.status === 'sent' ? 'text-success' : 'text-destructive'
      }`}>
        <MessageCircle className="h-3 w-3" />
        {wsStatus.status === 'sending' ? 'Sending...' :
         wsStatus.status === 'sent' ? 'Sent' : 'Failed'}
      </span>
    );
  };

  return (
    <DashboardLayout>
      <div className="page-header flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Daily Attendance</h1>
          <p className="page-description flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <Button onClick={saveAttendance} disabled={saving || loading} className="shrink-0">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Attendance
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Mark Attendance</CardTitle>
          <p className="text-sm text-muted-foreground">
            Select Present (P) or Absent (A) for each student. Absent students will receive WhatsApp notifications.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : students.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center text-center">
              <p className="text-lg font-medium">No students found</p>
              <p className="text-muted-foreground">Add students first to mark attendance</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Roll No</th>
                    <th>Name</th>
                    <th>Class</th>
                    <th>Status</th>
                    <th>Notification</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.roll_no} className="animate-fade-in">
                      <td className="font-medium">{student.roll_no}</td>
                      <td>{student.name}</td>
                      <td>{student.class}</td>
                      <td>
                        {existingAttendance.has(student.roll_no) ? (
                          <span className={`status-badge ${attendance.get(student.roll_no) === 'P' ? 'present' : 'absent'}`}>
                            {attendance.get(student.roll_no) === 'P' ? 'Present' : 'Absent'}
                            <span className="ml-1 text-[10px] opacity-70">(saved)</span>
                          </span>
                        ) : (
                          <Select
                            value={attendance.get(student.roll_no) || 'P'}
                            onValueChange={(value) => updateAttendance(student.roll_no, value as 'P' | 'A')}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="P">
                                <span className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-success" />
                                  Present
                                </span>
                              </SelectItem>
                              <SelectItem value="A">
                                <span className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-destructive" />
                                  Absent
                                </span>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td>
                        {attendance.get(student.roll_no) === 'A' && getStatusBadge(student.roll_no)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
