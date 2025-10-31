import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Calendar, 
  Users, 
  BookOpen, 
  Clock, 
  ArrowRight,
  Activity,
  CalendarRange,
  ArrowUpRight,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useAuth } from "../hooks/AuthContext";
import { DashboardSkeleton } from "./skeleton";
import { BatchStatusDonutChart } from "@/components/charts/BatchStatusDonutChart";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar";

import {
    fetchFaculties,
    fetchAllBatches,
    fetchAllStudents,
    fetchOverallAttendanceReport,
    fetchFacultyAttendanceReport,
    fetchAdminActiveStudentsCount,
    fetchFacultyActiveStudents,
    fetchFacultyStudentCount, // Import the new function
    Faculty,
    Batch,
    Student,
    FacultyActiveStudents
} from '@/lib/services/api';

// --- Interfaces ---
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  colorClass: string;
  to: string;
  trend?: string;
}

// --- Helper Functions ---
const getStatus = (startDateStr: string, endDateStr: string): 'upcoming' | 'active' | 'completed' => {
  if (!startDateStr || !endDateStr) return "upcoming";
  const now = new Date();
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  now.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "active";
  return "completed";
};

// --- Sub-components (Unchanged) ---
function StatCard({ title, value, icon: Icon, colorClass, to, trend }: StatCardProps) {
  return (
    <Link to={to}>
      <Card className={`relative overflow-hidden group hover:shadow-lg transition-shadow duration-300 ${colorClass.replace('text-', 'bg-')}/10`}>
        <div className={`absolute -top-6 -right-6 h-20 w-20 rounded-full ${colorClass.replace('text-', 'bg-')}/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-end p-2`}>
          <Icon className={`h-8 w-8 ${colorClass} opacity-50`} />
        </div>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className={`h-4 w-4 ${colorClass}`} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {trend && (
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <ArrowUpRight className="h-3 w-3 mr-1" /> {trend}
            </p>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

function FacultyUtilization({ faculties, batches, token }: { faculties: Faculty[], batches: Batch[], token: string | null }) {
    const [facultyStats, setFacultyStats] = useState<any[]>([]);

    useEffect(() => {
        const fetchStats = async () => {
            
            // 1. Fetch active student data for ALL faculties at once
            let activeStudentsData: FacultyActiveStudents[] = [];
            try {
                // We can reuse the function from the faculty dashboard
                activeStudentsData = await fetchFacultyActiveStudents(token); 
            } catch (error) {
                console.error("Failed to fetch faculty active students list", error);
            }

            // 2. Create a lookup map for easy and fast access
            const activeStudentsMap = new Map(
                activeStudentsData.map(item => [item.faculty_id, item.active_students])
            );

            // 3. Process each faculty to get the rest of the data
            const stats = await Promise.all(faculties.map(async (faculty) => {
                const facultyBatches = batches.filter(batch => batch.faculty_id === faculty.id);
                const activeBatches = facultyBatches.filter(batch => getStatus(batch.start_date, batch.end_date) === 'active');
                const activeBatchesCount = activeBatches.length;

                // Get total student count (as before)
                let studentCount = 0;
                try {
                    const studentData = await fetchFacultyStudentCount(token, faculty.id);
                    studentCount = studentData.total_students; 
                } catch (error) {
                    console.error(`Failed to fetch student count for faculty ${faculty.id}`, error);
                }

                // 4. Get active student count from our map
                const activeStudentCount = activeStudentsMap.get(faculty.id) || 0;

                let status: 'Idle' | 'Optimal' | 'High' = 'Idle';
                if (activeBatchesCount > 0 && activeBatchesCount <= 2) status = 'Optimal';
                else if (activeBatchesCount > 2) status = 'High';

                // 5. Return all data points for the state
                return { 
                    name: faculty.name, 
                    activeBatches: activeBatchesCount, 
                    activeStudents: activeStudentCount, // <-- NEW DATA
                    totalStudents: studentCount, 
                    status 
                };
            }));
            
            setFacultyStats(stats.sort((a, b) => b.totalStudents - a.totalStudents));
        };

        if (token) {
            fetchStats();
        }
    }, [faculties, batches, token]);

    const getStatusBadge = (status: 'Idle' | 'Optimal' | 'High') => {
        switch (status) {
            case 'Idle': return <Badge variant="outline">Idle</Badge>;
            case 'Optimal': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Optimal</Badge>;
            case 'High': return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">High</Badge>;
        }
    };

    return (
        <Card>
            <CardHeader><CardTitle>Faculty Utilization</CardTitle><CardDescription>An overview of each faculty's current workload.</CardDescription></CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Faculty</TableHead>
                            <TableHead className="text-center">Active Batches</TableHead>
                            <TableHead className="text-center">Active Students</TableHead> {/* <-- NEW COLUMN */}
                            <TableHead className="text-right">Total Students</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {facultyStats.map(faculty => (
                            <TableRow key={faculty.name}>
                                <TableCell className="font-medium">{faculty.name}</TableCell>
                                <TableCell className="text-center">{faculty.activeBatches}</TableCell>
                                <TableCell className="text-center">{faculty.activeStudents}</TableCell> {/* <-- NEW CELL */}
                                <TableCell className="text-right">{faculty.totalStudents}</TableCell>
                                <TableCell className="text-right">{getStatusBadge(faculty.status)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function QuickActions() {
  return (
    <Card>
      <CardHeader><CardTitle>Quick Actions</CardTitle><CardDescription>Common tasks and shortcuts</CardDescription></CardHeader>
      <CardContent className="grid gap-3">
        <Link to="/faculty"><Button variant="outline" className="w-full justify-start"><Users className="h-4 w-4 mr-2" />Add New Faculty<ArrowRight className="h-4 w-4 ml-auto" /></Button></Link>
        <Link to="/batch-management"><Button variant="outline" className="w-full justify-start"><Calendar className="h-4 w-4 mr-2" />Create New Batch<ArrowRight className="h-4 w-4 ml-auto" /></Button></Link>
        <Link to="/skills"><Button variant="outline" className="w-full justify-start"><BookOpen className="h-4 w-4 mr-2" />Manage Skills<ArrowRight className="h-4 w-4 ml-auto" /></Button></Link>
      </CardContent>
    </Card>
  );
}

function RecentBatches({ batches }: { batches: Batch[] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "upcoming": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "completed": return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div><CardTitle>Recent Batches</CardTitle><CardDescription>Latest batch activities and updates</CardDescription></div>
        <Link to="/batches"><Button variant="outline" size="sm">View All<ArrowRight className="h-4 w-4 ml-2" /></Button></Link>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {(batches || []).slice(0, 3).map((batch) => (
            <div key={batch.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Calendar className="h-5 w-5 text-primary" /></div>
                <div>
                  <div className="font-medium">{batch.name}</div>
                  <div className="text-sm text-muted-foreground">Faculty: {batch.faculty?.name || 'N/A'}</div>
                </div>
              </div>
              <div className="text-right space-y-1">
                <Badge className={getStatusColor(batch.derivedStatus || 'upcoming')}>{batch.derivedStatus}</Badge>
                <div className="text-xs text-muted-foreground">{batch.students?.length || 0} students</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function UpcomingSchedule({ batches }: { batches: Batch[] }) {
  const upcomingBatches = (batches || []).filter((batch) => batch.derivedStatus === "upcoming");
  return (
    <Card>
      <CardHeader><CardTitle>Upcoming Schedule</CardTitle><CardDescription>Next scheduled classes and sessions</CardDescription></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {upcomingBatches.length > 0 ? upcomingBatches.slice(0, 4).map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-3 border rounded-lg">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100/50"><Clock className="h-5 w-5 text-blue-600" /></div>
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-muted-foreground">{item.faculty?.name || 'N/A'}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{format(new Date(item.start_date), "dd MMM, yyyy")}</div>
                <div className="text-xs text-muted-foreground">{item.students?.length || 0} students</div>
              </div>
            </div>
          )) : <p className="text-sm text-muted-foreground">No upcoming batches scheduled.</p>}
        </div>
      </CardContent>
    </Card>
  );
}

// --- Main Dashboard Component ---

export default function Index() {
  const [rawFaculties, setRawFaculties] = useState<Faculty[]>([]);
  const [rawBatches, setRawBatches] = useState<Batch[]>([]);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [attendancePercentage, setAttendancePercentage] = useState<number | null>(null);
  const [activeStudentsCount, setActiveStudentsCount] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user, token } = useAuth();

  const [dateRange, setDateRange] = useState<DateRange | undefined>({ from: subDays(new Date(), 30), to: new Date() });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  useEffect(() => {
    if (!user || !token) {
        setLoading(false);
        return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const basePromises = [ fetchFaculties(token), fetchAllBatches(token) ];
        
        const roleSpecificPromises = user.role === 'faculty' 
            ? [ 
                fetchFacultyAttendanceReport(token, user.id), 
                fetchFacultyActiveStudents(token),
                fetchFacultyStudentCount(token, user.id) // For total students of faculty
              ] 
            : [ 
                fetchOverallAttendanceReport(token), 
                fetchAdminActiveStudentsCount(token),
                fetchAllStudents(token) // For total students for admin
              ];

        const [ facultyData, batchesData, attendanceData, activeStudentsData, studentCountResult ] = await Promise.all([...basePromises, ...roleSpecificPromises]);

        setRawFaculties(facultyData || []);
        setRawBatches(batchesData || []);

        if (user.role === 'faculty') {
            const facultyAttendance = attendanceData as Awaited<ReturnType<typeof fetchFacultyAttendanceReport>>;
            setAttendancePercentage(facultyAttendance?.faculty_attendance_percentage ?? null);
            
            const facultyActiveStudents = activeStudentsData as FacultyActiveStudents[];
            setActiveStudentsCount(facultyActiveStudents?.find(f => f.faculty_id === user.id)?.active_students || 0);
            
            const facultyStudentCount = studentCountResult as { total_students: number };
            setTotalStudentsCount(facultyStudentCount?.total_students || 0);
        } else {
            const overallAttendance = attendanceData as Awaited<ReturnType<typeof fetchOverallAttendanceReport>>;
            setAttendancePercentage(overallAttendance?.overall_attendance_percentage ?? null);
            
            const adminActiveStudents = activeStudentsData as { total_active_students: number };
            setActiveStudentsCount(adminActiveStudents?.total_active_students || 0);

            const allStudents = studentCountResult as { count: number };
            setTotalStudentsCount(allStudents?.count || 0);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Could not load dashboard data. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, token]);

  const processedBatches = useMemo(() => {
    return (rawBatches || []).map(batch => ({
      ...batch,
      derivedStatus: getStatus(batch.start_date, batch.end_date),
    })).filter(batch => {
      if (!dateRange?.from || !dateRange?.to) return true;
      const batchStart = new Date(batch.start_date);
      const batchEnd = new Date(batch.end_date);
      return batchStart <= dateRange.to && batchEnd >= dateRange.from;
    });
  }, [rawBatches, dateRange]);

  const dashboardBatches = useMemo(() => {
    if (user?.role === 'faculty') {
      return processedBatches.filter(batch => batch.faculty_id === user.id);
    }
    return processedBatches;
  }, [processedBatches, user]);

  const dashboardStats = useMemo(() => {
    const activeBatchesCount = dashboardBatches.filter(b => b.derivedStatus === 'active').length;
    const upcomingBatchesCount = dashboardBatches.filter(b => b.derivedStatus === 'upcoming').length;
    const completedBatchesCount = dashboardBatches.filter(b => b.derivedStatus === 'completed').length;
    const batchStatusChartData = [ { name: "active", value: activeBatchesCount }, { name: "upcoming", value: upcomingBatchesCount }, { name: "completed", value: completedBatchesCount } ];
    return { totalFaculty: rawFaculties.length, activeBatches: activeBatchesCount, totalStudents: totalStudentsCount, activeStudents: activeStudentsCount, batchStatusChartData, attendancePercentage };
  }, [dashboardBatches, rawFaculties, totalStudentsCount, attendancePercentage, activeStudentsCount]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
        <div className="flex flex-col items-center justify-center h-96 text-center">
            <AlertTriangle className="h-16 w-16 text-destructive mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Oops! Something went wrong.</h2>
            <p className="text-muted-foreground">{error}</p>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-lg">Welcome back, {user?.name || 'User'}. Here's what's happening.</p>
        </div>
        <div className="flex items-center space-x-2">
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                    <Button id="date" variant={"outline"} className={cn("w-[260px] justify-start text-left font-normal", !dateRange && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {/* --- THIS IS THE FIX --- */}
                        {dateRange?.from ? (dateRange.to ? (<>{format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}</>) : (format(dateRange.from, "LLL dd, y"))) : (<span>Pick a date range</span>)}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <DatePickerCalendar initialFocus mode="range" defaultMonth={dateRange?.from} selected={dateRange} onSelect={setDateRange} numberOfMonths={2}/>
                     <div className="p-2 border-t flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => { setDateRange({ from: subDays(new Date(), 30), to: new Date() }); setIsDatePickerOpen(false); }}>Last 30 Days</Button>
                        <Button variant="ghost" size="sm" onClick={() => { setDateRange({ from: subDays(new Date(), 7), to: new Date() }); setIsDatePickerOpen(false); }}>Last 7 Days</Button>
                        <Button size="sm" onClick={() => setIsDatePickerOpen(false)}>Apply</Button>
                     </div>
                </PopoverContent>
            </Popover>
        </div>
      </div>

      <div className={`grid gap-4 md:grid-cols-2 ${user?.role === "admin" ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
        {user?.role === "admin" && (
          <StatCard title="Total Faculty" value={dashboardStats.totalFaculty} icon={Users} colorClass="text-blue-600" to="/faculty-management" trend="+2 last month" />
        )}
        <StatCard title="Active Batches" value={dashboardStats.activeBatches} icon={Calendar} colorClass="text-green-600" to="/batches?status=active" trend="+5 from last week" />
        <StatCard title={user?.role === "faculty" ? "Your Attendance" : "Overall Attendance"} value={`${dashboardStats.attendancePercentage ? dashboardStats.attendancePercentage.toFixed(1) : "N/A"}%`} icon={Activity} colorClass="text-purple-600" to="/faculty-attendance-report" trend="Updated daily" />
        <StatCard title={user?.role === "faculty" ? "Your Active Students" : "Active Students"} value={dashboardStats.activeStudents} icon={Users} colorClass="text-sky-600" to="/student-management?status=active" trend="In ongoing batches" />
        <StatCard title={user?.role === "faculty" ? "Your Total Students" : "Total Students"} value={dashboardStats.totalStudents} icon={Users} colorClass="text-orange-600" to="/student-management" trend="+10 enrollments" />
      </div>

      {/* This is the new, more balanced grid layout */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Main content area, takes up 3 of 5 columns */}
        <div className="lg:col-span-3 space-y-6">
          <RecentBatches batches={dashboardBatches} />
          {user?.role === "admin" && (
            <FacultyUtilization faculties={rawFaculties} batches={processedBatches} token={token} />
          )}
        </div>

        {/* Sidebar area, takes up 2 of 5 columns */}
        <div className="lg:col-span-2 space-y-6">
          <BatchStatusDonutChart data={dashboardStats.batchStatusChartData} />
          <UpcomingSchedule batches={dashboardBatches} />
          {user?.role === "admin" && <QuickActions />}
        </div>
      </div>
    </div>
  );
}