import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Search, TrendingUp, TrendingDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface YearlyRecord {
  roll_no: number;
  present_days: number;
  absent_days: number;
  percent_present: number;
  student_name?: string;
  student_class?: string;
}

interface StudentAttendanceHistory {
  date: string;
  status: string;
}

export default function YearlyAttendance() {
  const [searchParams] = useSearchParams();
  const rollNoFilter = searchParams.get('roll_no');

  const [records, setRecords] = useState<YearlyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<YearlyRecord | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<StudentAttendanceHistory[]>([]);

  useEffect(() => {
    fetchData();
  }, [rollNoFilter]);

  const fetchData = async () => {
    try {
      let query = supabase
        .from('yearly_attendance')
        .select('*, students(name, class)')
        .order('roll_no');

      if (rollNoFilter) {
        query = query.eq('roll_no', parseInt(rollNoFilter));
      }

      const { data, error } = await query;
      if (error) throw error;

      const recordsWithNames = (data || []).map((r: any) => ({
        ...r,
        student_name: r.students?.name,
        student_class: r.students?.class,
      }));

      setRecords(recordsWithNames);

      // If filtering by roll_no, fetch attendance history
      if (rollNoFilter) {
        const { data: historyData } = await supabase
          .from('daily_attendance')
          .select('date, status')
          .eq('roll_no', parseInt(rollNoFilter))
          .order('date', { ascending: true });

        setAttendanceHistory(historyData || []);
        if (recordsWithNames.length > 0) {
          setSelectedStudent(recordsWithNames[0]);
        }
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(
    (r) =>
      r.roll_no.toString().includes(searchQuery) ||
      r.student_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.student_class?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getPercentageColor = (percentage: number) => {
    if (percentage >= 75) return 'text-success';
    if (percentage >= 50) return 'text-warning';
    return 'text-destructive';
  };

  const chartData = filteredRecords.map(r => ({
    name: r.student_name || `Roll ${r.roll_no}`,
    present: r.present_days,
    absent: r.absent_days,
    percentage: Math.round(r.percent_present),
  }));

  // Prepare history chart data
  const historyChartData = attendanceHistory.map(h => ({
    date: new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    value: h.status === 'P' ? 1 : 0,
  }));

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Yearly Attendance Report</h1>
        <p className="page-description">
          {rollNoFilter
            ? `Detailed attendance for Roll No: ${rollNoFilter}`
            : 'View overall attendance statistics for all students'}
        </p>
      </div>

      {/* Individual Student View */}
      {selectedStudent && rollNoFilter && (
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{selectedStudent.student_name}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Roll No: {selectedStudent.roll_no} | Class: {selectedStudent.student_class}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="rounded-lg bg-success/10 p-4 text-center">
                  <p className="text-2xl font-bold text-success">{selectedStudent.present_days}</p>
                  <p className="text-sm text-muted-foreground">Present Days</p>
                </div>
                <div className="rounded-lg bg-destructive/10 p-4 text-center">
                  <p className="text-2xl font-bold text-destructive">{selectedStudent.absent_days}</p>
                  <p className="text-sm text-muted-foreground">Absent Days</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-4 text-center">
                  <p className={`text-2xl font-bold ${getPercentageColor(selectedStudent.percent_present)}`}>
                    {selectedStudent.percent_present.toFixed(1)}%
                  </p>
                  <p className="text-sm text-muted-foreground">Attendance</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historyChartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis domain={[0, 1]} ticks={[0, 1]} tickFormatter={(v) => v === 1 ? 'P' : 'A'} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [value === 1 ? 'Present' : 'Absent', 'Status']}
                    />
                    <Line 
                      type="stepAfter" 
                      dataKey="value" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search */}
      {!rollNoFilter && (
        <div className="mb-6">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, class or roll no..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      )}

      {/* Chart - only show when not filtering */}
      {!rollNoFilter && chartData.length > 0 && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Attendance Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.slice(0, 15)} margin={{ top: 10, right: 10, left: -10, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="name" 
                    className="text-xs" 
                    angle={-45} 
                    textAnchor="end"
                    height={80}
                    interval={0}
                  />
                  <YAxis className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="present" name="Present" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="absent" name="Absent" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-xl border bg-card text-center">
          <p className="text-lg font-medium">No attendance records found</p>
          <p className="text-muted-foreground">Attendance will appear here after marking daily attendance</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Roll No</th>
                <th>Name</th>
                <th>Class</th>
                <th className="text-center">Present</th>
                <th className="text-center">Absent</th>
                <th className="text-center">Percentage</th>
                <th className="text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map((record) => (
                <tr key={record.roll_no} className="animate-fade-in">
                  <td className="font-medium">{record.roll_no}</td>
                  <td>{record.student_name}</td>
                  <td>{record.student_class}</td>
                  <td className="text-center">
                    <span className="rounded-full bg-success/10 px-2 py-1 text-sm font-medium text-success">
                      {record.present_days}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className="rounded-full bg-destructive/10 px-2 py-1 text-sm font-medium text-destructive">
                      {record.absent_days}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={`font-semibold ${getPercentageColor(record.percent_present)}`}>
                      {record.percent_present.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-center">
                    {record.percent_present >= 75 ? (
                      <span className="inline-flex items-center gap-1 text-success">
                        <TrendingUp className="h-4 w-4" /> Good
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-destructive">
                        <TrendingDown className="h-4 w-4" /> Low
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardLayout>
  );
}
