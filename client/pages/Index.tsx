import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Calendar, 
  Users, 
  BookOpen, 
  TrendingUp, 
  Clock, 
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  // This is the new derived status
  derivedStatus?: 'Upcoming' | 'Active' | 'Completed';
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
  color?: string;
}

// --- Helper Functions ---
const getStatus = (startDateStr: string, endDateStr: string): 'Upcoming' | 'Active' | 'Completed' => {
  if (!startDateStr || !endDateStr) return "Upcoming";
  const now = new Date();
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  // Set time to midnight for accurate date-only comparison
  now.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  if (now < start) return "Upcoming";
  if (now > end) return "Completed";
  return "Active";
};

// --- Sub-components ---

function StatCard({ title, value, icon: Icon, color = "text-primary" }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

// MODIFIED: This component no longer needs getStatus, it uses the reliable derivedStatus
function FacultyUtilization({ faculties, batches }: { faculties: Faculty[], batches: Batch[] }) {
    const facultyStats = faculties.map(faculty => {
        const facultyBatches = batches.filter(batch => batch.faculty_id === faculty.id);
        const activeBatchesCount = facultyBatches.filter(batch => batch.derivedStatus === 'Active').length;
        const studentCount = facultyBatches.reduce((acc, batch) => acc + (batch.students?.length || 0), 0);

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
            case 'Optimal': return <Badge className="bg-green-100 text-green-800">Optimal</Badge>;
            case 'High': return <Badge className="bg-orange-100 text-orange-800">High</Badge>;
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

// MODIFIED: This component now uses derivedStatus
function RecentBatches({ batches }: { batches: Batch[] }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active": return "bg-green-100 text-green-800";
      case "Upcoming": return "bg-blue-100 text-blue-800";
      case "Completed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
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
                <Badge className={getStatusColor(batch.derivedStatus)}>{batch.derivedStatus}</Badge>
                <div className="text-xs text-muted-foreground">{batch.students.length} students</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// MODIFIED: This component now uses derivedStatus
function UpcomingSchedule({ batches }: { batches: Batch[] }) {
  const upcomingBatches = batches.filter((batch) => batch.derivedStatus === "Upcoming");
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
  // REFACTORED: State now holds raw data from the API
  const [rawFaculties, setRawFaculties] = useState<Faculty[]>([]);
  const [rawBatches, setRawBatches] = useState<Batch[]>([]);
  const [rawSkills, setRawSkills] = useState<Skill[]>([]);
  const [rawStudents, setRawStudents] = useState<Student[]>([]);
  const [activities, setActivities] = useState([]); // Assuming mock data for now
  const [loading, setLoading] = useState(true);
  const { user, token } = useAuth();

  // REFACTORED: fetchData now only fetches and sets raw state
  const fetchData = async () => {
    if (!token || !user) return;
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

  // NEW: Memoized hook to process batches (add derivedStatus)
  const processedBatches = useMemo(() => {
    return rawBatches.map(batch => ({
      ...batch,
      derivedStatus: getStatus(batch.start_date, batch.end_date),
    }));
  }, [rawBatches]);

  // NEW: Memoized hook to filter batches based on user role
  const dashboardBatches = useMemo(() => {
    if (user?.role === 'faculty') {
      return processedBatches.filter(batch => batch.faculty_id === user.id);
    }
    return processedBatches;
  }, [processedBatches, user]);

  // NEW: Memoized hook to calculate all stats efficiently
  const dashboardStats = useMemo(() => {
    const activeBatchesCount = dashboardBatches.filter(b => b.derivedStatus === 'Active').length;
    const studentCount = user?.role === 'faculty'
      ? dashboardBatches.reduce((acc, batch) => acc + (batch.students?.length || 0), 0)
      : rawStudents.length;

    return {
      totalFaculty: rawFaculties.length,
      activeBatches: activeBatchesCount,
      totalSkills: rawSkills.length,
      totalStudents: studentCount,
    };
  }, [dashboardBatches, rawFaculties, rawSkills, rawStudents, user]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Activity className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground text-lg">Welcome, {user?.name || 'User'}. Here's an overview of your institute.</p>
      </div>

      <div className={`grid gap-4 md:grid-cols-2 ${user?.role === 'admin' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
        {user?.role === 'admin' && <StatCard title="Total Faculty" value={dashboardStats.totalFaculty} icon={Users} color="text-blue-600" />}
        <StatCard title="Active Batches" value={dashboardStats.activeBatches} icon={Calendar} color="text-green-600" />
        <StatCard title="Total Skills" value={dashboardStats.totalSkills} icon={BookOpen} color="text-purple-600" />
        <StatCard title={user?.role === 'faculty' ? "Your Students" : "Total Students"} value={dashboardStats.totalStudents} icon={Users} color="text-orange-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <RecentBatches batches={dashboardBatches} />
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