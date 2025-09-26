import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "../hooks/AuthContext";
import { API_BASE_URL } from "@/lib/api";
import { toast } from "@/components/ui/use-toast";
import { Users, CalendarCheck, TrendingUp, TrendingDown, Activity, BadgePercent, Check, X, Calendar as CalendarIcon } from "lucide-react";
import { addDays, format } from "date-fns";

// --- Type Definitions ---
interface Faculty {
  id: string;
  name: string;
}

interface Batch {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  faculty_id: string;
}

interface Student {
  id: string;
  name: string;
}

interface AttendanceRecord {
  student_id: string;
  is_present: boolean;
}

interface ReportApiResponse {
  students: Student[];
  attendance_by_date: Record<string, AttendanceRecord[]>;
}

interface ProcessedReport {
  dates: string[];
  studentRows: {
    id: string;
    name: string;
    daily_statuses: { status: 'present' | 'absent' | 'no_class' }[];
    percentage: number;
  }[];
  summary: {
    overall_percentage: number;
    total_classes: number;
    top_performer?: { name: string; percentage: number };
    low_performer?: { name: string; percentage: number };
  };
}

// --- Sub-components for the Report ---

const ReportSummaryCard = ({ title, value, icon: Icon, color = "text-primary" }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-4 w-4 text-muted-foreground ${color}`} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

const AttendanceGrid = ({ report }: { report: ProcessedReport }) => (
  <div className="rounded-md border mt-6 overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[200px] sticky left-0 bg-background z-10">Student</TableHead>
          {report.dates.map((date) => (
            <TableHead key={date} className="text-center min-w-[60px]">{format(new Date(date), "dd/MM")}</TableHead>
          ))}
          <TableHead className="text-right sticky right-0 bg-background z-10">Attendance %</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {report.studentRows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium sticky left-0 bg-background z-10">{row.name}</TableCell>
            {row.daily_statuses.map((day, index) => (
              <TableCell key={index} className="text-center">
                {day.status === 'present' && <Check className="h-5 w-5 text-green-500 mx-auto" />}
                {day.status === 'absent' && <X className="h-5 w-5 text-red-500 mx-auto" />}
                {day.status === 'no_class' && <span className="text-muted-foreground">-</span>}
              </TableCell>
            ))}
            <TableCell className="text-right font-bold sticky right-0 bg-background z-10">{row.percentage}%</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

// --- Main Component ---

const AttendanceManagement = () => {
  const { token, user } = useAuth();
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<string | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });
  const [reportData, setReportData] = useState<ReportApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!token || !user) return;
      try {
        const [batchesRes, facultiesRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/batches`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/api/faculty`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const batchesData = await batchesRes.json();
        const facultiesData = await facultiesRes.json();
        
        const allBatches = Array.isArray(batchesData) ? batchesData : [];
        const allFaculties = Array.isArray(facultiesData) ? facultiesData : [];

        setBatches(allBatches);
        
        if (user.role === 'faculty') {
          const facultyId = user.id;
          const currentFaculty = allFaculties.find(f => f.id === facultyId);
          setFaculties(currentFaculty ? [currentFaculty] : []);
          setSelectedFaculty(facultyId);
        } else { // for admin
          setFaculties(allFaculties);
        }

      } catch (error) {
        console.error("Failed to fetch initial data", error);
      }
    };
    fetchData();
  }, [token, user]);

  // NEW: Memoized list of active batches for the selected faculty
  const activeBatchesForSelectedFaculty = useMemo(() => {
    if (!selectedFaculty) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return batches.filter(batch => {
      const startDate = new Date(batch.start_date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(batch.end_date);
      endDate.setHours(0, 0, 0, 0);
      return batch.faculty_id === selectedFaculty && today >= startDate && today <= endDate;
    });
  }, [batches, selectedFaculty]);

  // NEW: Handler to update date range when a batch is selected
  const handleBatchSelection = (batchId: string) => {
    setSelectedBatch(batchId);
    const batch = batches.find(b => b.id === batchId);
    if (batch) {
      setDateRange({
        from: new Date(batch.start_date),
        to: new Date(), // Defaults to today's date
      });
    }
  };

  const handleFacultySelection = (facultyId: string) => {
    setSelectedFaculty(facultyId);
    setSelectedBatch(null); // Reset batch selection when faculty changes
    setDateRange({ from: undefined, to: undefined }); // Reset dates
  };

  const handleGenerateReport = async () => {
    if (!selectedBatch || !dateRange.from || !dateRange.to) {
      toast({
        title: "Missing Information",
        description: "Please select a faculty, batch, and a full date range.",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);
    setReportData(null);
    setReportGenerated(false);
    try {
      const from = format(dateRange.from, "yyyy-MM-dd");
      const to = format(dateRange.to, "yyyy-MM-dd");
      
      const response = await fetch(
        `${API_BASE_URL}/api/attendance/report/${selectedBatch}?startDate=${from}&endDate=${to}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!response.ok) throw new Error("No attendance data found for the selected criteria.");

      const data: ReportApiResponse = await response.json();
      setReportData(data);
    } catch (error) {
      toast({
        title: "Could Not Generate Report",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setReportGenerated(true);
    }
  };

  const processedReport = useMemo((): ProcessedReport | null => {
    if (!reportData || !reportData.attendance_by_date || !reportData.students) return null;
    const dates = Object.keys(reportData.attendance_by_date).sort();
    if (dates.length === 0) return null;

    const studentRows = reportData.students.map(student => {
      let present_count = 0;
      const daily_statuses = dates.map(date => {
        const student_record = reportData.attendance_by_date[date]?.find(r => r.student_id === student.id);
        if (student_record) {
          if (student_record.is_present) {
            present_count++;
            return { status: 'present' };
          }
          return { status: 'absent' };
        }
        return { status: 'no_class' };
      });
      const total_classes = dates.length;
      const percentage = total_classes > 0 ? Math.round((present_count / total_classes) * 100) : 0;
      return { id: student.id, name: student.name, daily_statuses, present_count, total_classes, percentage };
    });

    const total_present = studentRows.reduce((sum, s) => sum + s.present_count, 0);
    const total_possible = studentRows.length * dates.length;
    const overall_percentage = total_possible > 0 ? Math.round((total_present / total_possible) * 100) : 0;
    const sortedByAttendance = [...studentRows].sort((a, b) => b.percentage - a.percentage);

    return {
      dates,
      studentRows,
      summary: {
        overall_percentage: overall_percentage,
        total_classes: dates.length,
        top_performer: sortedByAttendance[0],
        low_performer: sortedByAttendance[sortedByAttendance.length - 1],
      }
    };
  }, [reportData]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Attendance Report Generator</CardTitle>
          <CardDescription>Select a faculty and batch to generate a comprehensive attendance report.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center gap-4">
          <Select onValueChange={handleFacultySelection} value={selectedFaculty || ""} disabled={user?.role === 'faculty'}>
            <SelectTrigger className="sm:w-[250px]">
              <SelectValue placeholder="1. Select Faculty" />
            </SelectTrigger>
            <SelectContent>
              {faculties.map((faculty) => (
                <SelectItem key={faculty.id} value={faculty.id}>{faculty.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedBatch || ""} onValueChange={handleBatchSelection} disabled={!selectedFaculty}>
            <SelectTrigger className="sm:w-[300px]">
              <SelectValue placeholder="2. Select Active Batch" />
            </SelectTrigger>
            <SelectContent>
              {activeBatchesForSelectedFaculty.map((batch) => (
                <SelectItem key={batch.id} value={batch.id}>{batch.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <DatePicker date={dateRange.from} setDate={(date) => setDateRange(prev => ({ ...prev, from: date }))} disabled={!selectedBatch} />
            <span>to</span>
            <DatePicker date={dateRange.to} setDate={(date) => setDateRange(prev => ({ ...prev, to: date }))} disabled={!selectedBatch} />
          </div>
          <Button onClick={handleGenerateReport} disabled={isLoading || !selectedBatch}>
            {isLoading ? <Activity className="mr-2 h-4 w-4 animate-spin" /> : <CalendarIcon className="mr-2 h-4 w-4" />}
            Generate Report
          </Button>
        </CardContent>
      </Card>

      {isLoading && <div className="text-center p-8"><Activity className="h-8 w-8 animate-spin mx-auto text-primary" /> <p className="mt-2 text-muted-foreground">Generating your report...</p></div>}
      
      {reportGenerated && !isLoading && !processedReport && (
        <Card>
            <CardHeader>
                <CardTitle>No Attendance Data Found</CardTitle>
                <CardDescription>The report was generated, but there are no attendance records for the selected batch and date range.</CardDescription>
            </CardHeader>
            <CardContent>
                <p>You can mark attendance for your batches on the{' '}<Link to="/batches" className="text-primary underline">Batch Management</Link>{' '}page.</p>
            </CardContent>
        </Card>
      )}

      {processedReport && (
        <Card>
          <CardHeader>
            <CardTitle>Attendance Report</CardTitle>
            <CardDescription>
              Displaying report for the period of {format(new Date(processedReport.dates[0]), "dd MMM, yyyy")} to {format(new Date(processedReport.dates[processedReport.dates.length - 1]), "dd MMM, yyyy")}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              <ReportSummaryCard title="Overall Attendance" value={`${processedReport.summary.overall_percentage}%`} icon={BadgePercent} color="text-blue-500" />
              <ReportSummaryCard title="Total Classes Held" value={processedReport.summary.total_classes} icon={CalendarCheck} color="text-indigo-500" />
              <ReportSummaryCard title="Top Attendance" value={processedReport.summary.top_performer?.name || 'N/A'} icon={TrendingUp} color="text-green-500" />
              <ReportSummaryCard title="Lowest Attendance" value={processedReport.summary.low_performer?.name || 'N/A'} icon={TrendingDown} color="text-red-500" />
            </div>
            <AttendanceGrid report={processedReport} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AttendanceManagement;