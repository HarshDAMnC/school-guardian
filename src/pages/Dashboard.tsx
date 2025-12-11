import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/ui/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, UserCheck, UserX, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  totalStudents: number;
  todayPresent: number;
  todayAbsent: number;
  overallPercentage: number;
}

interface MonthlyData {
  month: string;
  present: number;
  absent: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    todayPresent: 0,
    todayAbsent: 0,
    overallPercentage: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Get total students
      const { count: totalStudents } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });

      // Get today's attendance
      const today = new Date().toISOString().split('T')[0];
      const { data: todayAttendance } = await supabase
        .from('daily_attendance')
        .select('status')
        .eq('date', today);

      const todayPresent = todayAttendance?.filter(a => a.status === 'P').length || 0;
      const todayAbsent = todayAttendance?.filter(a => a.status === 'A').length || 0;

      // Get overall attendance percentage
      const { data: yearlyData } = await supabase
        .from('yearly_attendance')
        .select('percent_present');

      const avgPercentage = yearlyData?.length
        ? yearlyData.reduce((sum, y) => sum + (y.percent_present || 0), 0) / yearlyData.length
        : 0;

      setStats({
        totalStudents: totalStudents || 0,
        todayPresent,
        todayAbsent,
        overallPercentage: Math.round(avgPercentage * 10) / 10,
      });

      // Generate monthly data for chart
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const currentMonth = new Date().getMonth();
      
      const { data: allAttendance } = await supabase
        .from('daily_attendance')
        .select('date, status');

      const monthlyStats: MonthlyData[] = months.slice(0, currentMonth + 1).map(month => {
        const monthIndex = months.indexOf(month);
        const monthAttendance = allAttendance?.filter(a => {
          const attendanceMonth = new Date(a.date).getMonth();
          return attendanceMonth === monthIndex;
        }) || [];
        
        return {
          month,
          present: monthAttendance.filter(a => a.status === 'P').length,
          absent: monthAttendance.filter(a => a.status === 'A').length,
        };
      });

      setMonthlyData(monthlyStats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const pieData = [
    { name: 'Present', value: stats.todayPresent, color: 'hsl(142, 76%, 36%)' },
    { name: 'Absent', value: stats.todayAbsent, color: 'hsl(0, 84%, 60%)' },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Welcome back! Here's your school attendance overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          description="Enrolled students"
          className="animate-slide-up"
          iconClassName="bg-primary/10"
        />
        <StatCard
          title="Present Today"
          value={stats.todayPresent}
          icon={UserCheck}
          description={`${((stats.todayPresent / (stats.totalStudents || 1)) * 100).toFixed(1)}% of total`}
          className="animate-slide-up [animation-delay:100ms]"
          iconClassName="bg-success/10"
        />
        <StatCard
          title="Absent Today"
          value={stats.todayAbsent}
          icon={UserX}
          description={`${((stats.todayAbsent / (stats.totalStudents || 1)) * 100).toFixed(1)}% of total`}
          className="animate-slide-up [animation-delay:200ms]"
          iconClassName="bg-destructive/10"
        />
        <StatCard
          title="Overall Attendance"
          value={`${stats.overallPercentage}%`}
          icon={TrendingUp}
          description="Year to date"
          className="animate-slide-up [animation-delay:300ms]"
          iconClassName="bg-accent/10"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Monthly Attendance Chart */}
        <Card className="animate-fade-in lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
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

        {/* Today's Distribution */}
        <Card className="animate-fade-in [animation-delay:100ms]">
          <CardHeader>
            <CardTitle>Today's Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-success" />
                <span className="text-sm">Present ({stats.todayPresent})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive" />
                <span className="text-sm">Absent ({stats.todayAbsent})</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
