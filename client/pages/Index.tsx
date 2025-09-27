import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Calendar, 
  Users, 
  BookOpen, 
  Clock, 
  ArrowRight,
  Activity,
  CalendarRange, // New icon for date range
  ArrowUpRight // New icon for trend
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { API_BASE_URL } from "@/lib/api";
import { useAuth } from "../hooks/AuthContext";
import { DashboardSkeleton } from "./skeleton";
import { BatchStatusDonutChart } from "@/components/charts/BatchStatusDonutChart"; // New chart component
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, subDays, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Calendar as DatePickerCalendar } from "@/components/ui/calendar"; // Assuming shadcn Calendar component

// --- Interfaces ---
interface Faculty {
  id: string;
  name: string;
}

interface Batch {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  students: any[];
  faculty: {
    id: string;
    name: string;
  }
  faculty_id?: string;
  derivedStatus?: 'upcoming' | 'active' | 'completed';
}

interface Skill {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  colorClass: string; // Changed to colorClass for tailwind utility
  to: string; // Added 'to' for clickable cards
  trend?: string; // Optional trend indicator
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

// --- Sub-components ---

// MODIFIED: StatCard for clickable behavior and enhanced UI
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

function FacultyUtilization({ faculties, batches }: { faculties: Faculty[], batches: Batch[] }) {
    const facultyStats = faculties.map(faculty => {
        const facultyBatches = batches.filter(batch => batch.faculty_id === faculty.id);
        const activeBatches = facultyBatches.filter(batch => batch.derivedStatus === 'active');
        const activeBatchesCount = activeBatches.length;
        const studentCount = activeBatches.reduce((acc, batch) => acc + (batch.students?.length || 0), 0);

        let status: 'Idle' | 'Optimal' | 'High' = 'Idle';
        if (activeBatchesCount > 0 && activeBatchesCount <= 2) {
            status = 'Optimal';
        } else if (activeBatchesCount > 2) {
            status = 'High';
        }

        return {
            name: faculty.name,
            activeBatches: activeBatchesCount,
            totalStudents: studentCount,
            status: status,
        };
    }).sort((a, b) => b.totalStudents - a.totalStudents);

    const getStatusBadge = (status: 'Idle' | 'Optimal' | 'High') => {
        switch (status) {
            case 'Idle': return <Badge variant="outline">Idle</Badge>;
            case 'Optimal': return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Optimal</Badge>;
            case 'High': return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">High</Badge>;
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Faculty Utilization</CardTitle>
                <CardDescription>An overview of each faculty's current workload.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Faculty</TableHead>
                            <TableHead className="text-center">Active</TableHead>
                            <TableHead className="text-right">Students</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {facultyStats.map(faculty => (
                            <TableRow key={faculty.name}>
                                <TableCell className="font-medium">{faculty.name}</TableCell>
                                <TableCell className="text-center">{faculty.activeBatches}</TableCell>
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
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <Link to="/faculty"><Button variant="outline" className="w-full justify-start"><Users className="h-4 w-4 mr-2" />Add New Faculty<ArrowRight className="h-4 w-4 ml-auto" /></Button></Link>
        <Link to="/batches"><Button variant="outline" className="w-full justify-start"><Calendar className="h-4 w-4 mr-2" />Create New Batch<ArrowRight className="h-4 w-4 ml-auto" /></Button></Link>
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
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
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
          {batches.slice(0, 3).map((batch) => (
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
                <div className="text-xs text-muted-foreground">{batch.students.length} students</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function UpcomingSchedule({ batches }: { batches: Batch[] }) {
  const upcomingBatches = batches.filter((batch) => batch.derivedStatus === "upcoming");
  return (
    <Card>
      <CardHeader>
        <CardTitle>Upcoming Schedule</CardTitle>
        <CardDescription>Next scheduled classes and sessions</CardDescription>
      </CardHeader>
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
                <div className="text-sm font-medium">{item.start_date}</div>
                <div className="text-xs text-muted-foreground">{item.students.length} students</div>
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
  const [rawSkills, setRawSkills] = useState<Skill[]>([]);
  const [rawStudents, setRawStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, token } = useAuth();

  // NEW: Date Range State for Dashboard-wide filtering
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: addDays(new Date(), 30),
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const fetchData = async () => {
    if (!token || !user) return;
    setLoading(true); // Set loading true on every fetch
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      const [facultyRes, batchesRes, skillsRes, studentsRes] =
        await Promise.all([
          fetch(`${API_BASE_URL}/api/faculty`, { headers }),
          fetch(`${API_BASE_URL}/api/batches`, { headers }),
          fetch(`${API_BASE_URL}/api/skills`, { headers }),
          fetch(`${API_BASE_URL}/api/students`, { headers }),
        ]);

      const facultyData = await facultyRes.json();
      const batchesData = await batchesRes.json();
      const skillsData = await skillsRes.json();
      const studentsData = await studentsRes.json();

      setRawFaculties(Array.isArray(facultyData) ? facultyData : []);
      setRawBatches(Array.isArray(batchesData) ? batchesData : []);
      setRawSkills(Array.isArray(skillsData) ? skillsData : []);
      setRawStudents(studentsData.students || []);

    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchData();
    }
  }, [user, token]);

  // NEW: Memoized hook to process and filter batches based on date range
  const processedBatches = useMemo(() => {
    return rawBatches.filter(batch => {
      if (!dateRange?.from || !dateRange?.to) return true; // No filter if no range selected
      const batchStart = new Date(batch.start_date);
      const batchEnd = new Date(batch.end_date);
      
      // Filter batches that are active or upcoming within the date range
      return (
        (batchStart <= dateRange.to && batchEnd >= dateRange.from)
      );
    }).map(batch => ({
      ...batch,
      derivedStatus: getStatus(batch.start_date, batch.end_date),
    }));
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
    
    const studentCount = user?.role === 'faculty'
      ? dashboardBatches.reduce((acc, batch) => acc + (batch.students?.length || 0), 0)
      : rawStudents.length;

    // Data for the Donut Chart
    const batchStatusChartData = [
      { name: 'active', value: activeBatchesCount },
      { name: 'upcoming', value: upcomingBatchesCount },
      { name: 'completed', value: completedBatchesCount },
    ];

    return {
      totalFaculty: rawFaculties.length,
      activeBatches: activeBatchesCount,
      totalSkills: rawSkills.length,
      totalStudents: studentCount,
      batchStatusChartData,
    };
  }, [dashboardBatches, rawFaculties, rawSkills, rawStudents, user]);

  if (loading) {
    return <DashboardSkeleton />; // Render skeleton during loading
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-lg">Welcome, {user?.name || 'User'}. Here's an overview of your institute.</p>
        </div>
        {/* Date Range Picker */}
        <div className="flex items-center space-x-2">
            <CalendarRange className="h-5 w-5 text-muted-foreground" />
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id="date"
                        variant={"outline"}
                        className={cn(
                            "w-[240px] justify-start text-left font-normal",
                            !dateRange && "text-muted-foreground"
                        )}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange?.from ? (
                            dateRange.to ? (
                                <>
                                    {format(dateRange.from, "LLL dd, y")} -{" "}
                                    {format(dateRange.to, "LLL dd, y")}
                                </>
                            ) : (
                                format(dateRange.from, "LLL dd, y")
                            )
                        ) : (
                            <span>Pick a date range</span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                    <DatePickerCalendar
                        initialFocus
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={setDateRange}
                        numberOfMonths={2}
                    />
                     <div className="p-2 border-t flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => {
                            setDateRange({ from: subDays(new Date(), 30), to: new Date() });
                            setIsDatePickerOpen(false);
                        }}>Last 30 Days</Button>
                        <Button variant="ghost" onClick={() => {
                            setDateRange({ from: subDays(new Date(), 7), to: new Date() });
                            setIsDatePickerOpen(false);
                        }}>Last 7 Days</Button>
                        <Button onClick={() => setIsDatePickerOpen(false)}>Apply</Button>
                     </div>
                </PopoverContent>
            </Popover>
        </div>
      </div>

      <div className={`grid gap-4 md:grid-cols-2 ${user?.role === 'admin' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {user?.role === 'admin' && <StatCard title="Total Faculty" value={dashboardStats.totalFaculty} icon={Users} colorClass="text-blue-600" to="/faculty" trend="+2 last month" />}
        <StatCard title="Active Batches" value={dashboardStats.activeBatches} icon={Calendar} colorClass="text-green-600" to="/batches?status=active" trend="+5 from last week" />
        <StatCard title="Total Skills" value={dashboardStats.totalSkills} icon={BookOpen} colorClass="text-purple-600" to="/skills" trend="+1 new skill" />
        <StatCard title={user?.role === 'faculty' ? "Your Students" : "Total Students"} value={dashboardStats.totalStudents} icon={Users} colorClass="text-orange-600" to="/students" trend="+10 enrollments" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <RecentBatches batches={dashboardBatches} />
          {/* NEW: Batch Status Donut Chart */}
          <BatchStatusDonutChart data={dashboardStats.batchStatusChartData} /> 

          <Tabs defaultValue="schedule" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="schedule">Upcoming Schedule</TabsTrigger>
              <TabsTrigger value="activity">Recent Activity</TabsTrigger>
            </TabsList>
            <TabsContent value="schedule">
              <UpcomingSchedule batches={dashboardBatches} />
            </TabsContent>
            <TabsContent value="activity">
                <Card><CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Activity feed is under development.</p></CardContent></Card>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <QuickActions />
          {user?.role === 'admin' && <FacultyUtilization faculties={rawFaculties} batches={processedBatches} />}
        </div>
      </div>
    </div>
  );
}