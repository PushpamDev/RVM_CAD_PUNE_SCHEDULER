import { useState, useEffect, Fragment, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "../hooks/AuthContext";
import { toast } from "sonner";
import { 
  ChevronDown, 
  ChevronRight, 
  BarChart3, 
  Filter, 
  Loader2, 
  FileSearch,
  Users,
  CalendarClock,
  X,
  TrendingUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

import {
    fetchFaculties,
    fetchOverallAttendanceReport,
    fetchFacultyAttendanceReport,
    Faculty,
    OverallReport,
    FacultyReport
} from '@/lib/services/api';


// --- Helper Functions & Components (Unchanged) ---

const getPercentageClasses = (percentage: number): { text: string; bg: string; } => {
  if (percentage < 75) return { text: "text-red-600 dark:text-red-400", bg: "bg-red-500" };
  if (percentage < 90) return { text: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-500" };
  return { text: "text-green-600 dark:text-green-400", bg: "bg-green-500" };
};

const AttendanceProgressBar = ({ percentage }: { percentage: number }) => {
  const { bg } = getPercentageClasses(percentage);
  return (
    <div className="w-full bg-muted rounded-full h-2.5">
      <div className={`${bg} h-2.5 rounded-full`} style={{ width: `${percentage}%` }}></div>
    </div>
  );
};

const ReportPlaceholder = () => (
    <Card className="flex items-center justify-center h-96 border-dashed">
        <div className="text-center p-4">
            <div className="flex justify-center mb-4">
                <div className="p-4 bg-muted rounded-full">
                    <FileSearch className="h-8 w-8 text-muted-foreground" />
                </div>
            </div>
            <CardTitle className="mb-2">Generate a Report</CardTitle>
            <CardDescription>Select a filter to begin viewing attendance data.</CardDescription>
        </div>
    </Card>
);

const ReportSkeleton = () => (
    <Card>
        <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent>
             <Skeleton className="h-[250px] w-full mb-6" />
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead style={{ width: "50px" }}><Skeleton className="h-4 w-4" /></TableHead>
                        <TableHead><Skeleton className="h-4 w-32" /></TableHead>
                        <TableHead className="w-[200px]"><Skeleton className="h-4 w-40" /></TableHead>
                        <TableHead className="text-right w-[150px]"><Skeleton className="h-4 w-24" /></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[...Array(3)].map((_, i) => (
                        <TableRow key={i}>
                            <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                            <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                            <TableCell><Skeleton className="h-4 w-full" /></TableCell>
                            <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </CardContent>
    </Card>
);


// --- Main Component ---

export default function FacultyAttendanceReport() {
  const { token } = useAuth();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
  const [reportData, setReportData] = useState<OverallReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedFaculty, setExpandedFaculty] = useState<string | null>(null);

  useEffect(() => {
    const loadFaculties = async () => {
      if (!token) return;
      try {
        const data = await fetchFaculties(token);
        setFaculties(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to fetch faculties.");
      }
    };
    loadFaculties();
  }, [token]);

  const fetchReport = async (facultyId?: string) => {
    if (!token) return;
    setLoading(true);
    setReportData(null);
    setExpandedFaculty(null);

    try {
      if (facultyId) {
        const data: FacultyReport = await fetchFacultyAttendanceReport(token, facultyId);
        setReportData({ overall_attendance_percentage: data.faculty_attendance_percentage, faculty_reports: [data] });
      } else {
        const data: OverallReport = await fetchOverallAttendanceReport(token);
        setReportData(data);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch the report.");
    } finally {
      setLoading(false);
    }
  };
  
  const handleClearFilter = () => {
    setSelectedFaculty(null);
    setReportData(null);
  };

  const chartData = useMemo(() => {
    if (!reportData?.faculty_reports || selectedFaculty) return [];
    return reportData.faculty_reports.map(f => ({
      name: f.faculty_name,
      attendance: parseFloat(f.faculty_attendance_percentage.toFixed(2)),
    }));
  }, [reportData, selectedFaculty]);

  const toggleFacultyExpansion = (facultyId: string) => {
    setExpandedFaculty(expandedFaculty === facultyId ? null : facultyId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Faculty Attendance</h1>
        <p className="text-muted-foreground">Analyze attendance performance across faculties and their batches.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Report Generator</CardTitle>
          <CardDescription>
            Select a specific faculty or generate an overall report for the entire institute.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 w-full md:w-auto relative">
            <Select onValueChange={setSelectedFaculty} value={selectedFaculty || ""}>
              <SelectTrigger className="w-full md:w-[320px]">
                <SelectValue placeholder="Filter by Faculty..." />
              </SelectTrigger>
              <SelectContent>
                {faculties.map((faculty) => (
                  <SelectItem key={faculty.id} value={faculty.id}>
                    {faculty.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedFaculty && (
                <Button variant="ghost" size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7" onClick={handleClearFilter}>
                    <X className="h-4 w-4" />
                </Button>
            )}
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button className="flex-1 md:flex-auto" onClick={() => fetchReport(selectedFaculty!)} disabled={loading || !selectedFaculty}>
              {loading && selectedFaculty ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Filter className="mr-2 h-4 w-4" />}
              Generate Report
            </Button>
            <Button className="flex-1 md:flex-auto" onClick={() => { setSelectedFaculty(null); fetchReport(); }} disabled={loading} variant="outline">
              {loading && !selectedFaculty ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BarChart3 className="mr-2 h-4 w-4" />}
              View Overall
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <AnimatePresence mode="wait">
        <motion.div
            key={loading ? "loading" : reportData ? "data" : "empty"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
        >
            {loading && <ReportSkeleton />}
            {!loading && !reportData && <ReportPlaceholder />}
            {!loading && reportData && (
            <div className="space-y-6">
                {chartData.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Faculty Performance</CardTitle>
                            <CardDescription>Average attendance across all active batches for each faculty.</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                                    <YAxis domain={[0, 100]} tickFormatter={(value) => `${value}%`} tick={{ fill: 'hsl(var(--muted-foreground))' }} axisLine={{ stroke: 'hsl(var(--border))' }} tickLine={{ stroke: 'hsl(var(--border))' }} />
                                    <Tooltip cursor={{ fill: 'hsl(var(--muted)/50)' }} contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} formatter={(value: number) => [`${value}%`, 'Attendance']} />
                                    <Bar dataKey="attendance">
                                        {chartData.map((entry, index) => (
                                            // --- SYNTAX ERROR FIX ---
                                            // Replaced the incorrect string manipulation with a clean ternary operator
                                            // that uses the correct CSS variables for your theme.
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={
                                                    entry.attendance < 75 
                                                        ? 'hsl(var(--destructive))' 
                                                        : entry.attendance < 90 
                                                            ? 'hsl(var(--warning))' 
                                                            : 'hsl(var(--success))'
                                                } 
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                <Card>
                    <CardHeader>
                    <CardTitle>Detailed Report</CardTitle>
                    {reportData.overall_attendance_percentage && !selectedFaculty && (
                        <CardDescription>
                        Overall Institute Attendance:{" "}
                        <span className={`font-bold ${getPercentageClasses(reportData.overall_attendance_percentage).text}`}>
                            {reportData.overall_attendance_percentage.toFixed(2)}%
                        </span>
                        </CardDescription>
                    )}
                    </CardHeader>
                    <CardContent>
                    <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>Faculty Name</TableHead>
                                <TableHead className="w-[250px]">Performance</TableHead>
                                <TableHead className="text-right w-[150px]">Avg. Attendance</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {reportData.faculty_reports.map((report) => (
                            <Fragment key={report.faculty_id}>
                            <TableRow onClick={() => toggleFacultyExpansion(report.faculty_id)} className="cursor-pointer hover:bg-muted/50">
                                <TableCell className="pl-4">
                                {expandedFaculty === report.faculty_id ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                                </TableCell>
                                <TableCell className="font-medium text-base">{report.faculty_name}</TableCell>
                                <TableCell><AttendanceProgressBar percentage={report.faculty_attendance_percentage} /></TableCell>
                                <TableCell className={`text-right font-bold text-lg ${getPercentageClasses(report.faculty_attendance_percentage).text}`}>
                                    {report.faculty_attendance_percentage.toFixed(2)}%
                                </TableCell>
                            </TableRow>
                            <AnimatePresence>
                            {expandedFaculty === report.faculty_id && (
                            <TableRow className="bg-background hover:bg-background">
                                <TableCell colSpan={4} className="p-0">
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3, ease: "easeInOut" }} className="overflow-hidden" >
                                    <div className="py-4 pl-12 pr-4 border-l-2 border-primary/20 ml-6">
                                        <h4 className="font-bold mb-3 text-md">Batch Breakdown</h4>
                                        <div className="border rounded-md">
                                        <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Batch Name</TableHead>
                                                <TableHead className="text-center">Students</TableHead>
                                                <TableHead className="text-center">Sessions</TableHead>
                                                <TableHead className="text-right">Attendance</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                        {report.batches.length > 0 ? report.batches.map((batch) => (
                                            <TableRow key={batch.batch_id}>
                                                <TableCell className="font-medium">{batch.batch_name}</TableCell>
                                                <TableCell className="text-center flex items-center justify-center gap-2"><Users className="h-4 w-4 text-muted-foreground"/>{batch.student_count}</TableCell>
                                                <TableCell className="text-center flex items-center justify-center gap-2"><CalendarClock className="h-4 w-4 text-muted-foreground"/>{batch.total_sessions}</TableCell>
                                                <TableCell className={`text-right font-bold ${getPercentageClasses(batch.attendance_percentage).text}`}>
                                                    {batch.attendance_percentage.toFixed(2)}%
                                                </TableCell>
                                            </TableRow>
                                        )) : <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No active batches found for this faculty.</TableCell></TableRow>}
                                        </TableBody>
                                        </Table>
                                        </div>
                                    </div>
                                    </motion.div>
                                </TableCell>
                            </TableRow>
                            )}
                            </AnimatePresence>
                        </Fragment>
                        ))}
                        </TableBody>
                    </Table>
                    </div>
                    </CardContent>
                </Card>
            </div>
            )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}