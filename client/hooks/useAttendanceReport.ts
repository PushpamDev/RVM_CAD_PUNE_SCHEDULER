import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

// --- FIX #1: Update the import to use the new function and type names ---
import {
  fetchFaculties,
  fetchBatchesForFaculty,
  fetchBatchAttendanceReport, // <-- Renamed from fetchAttendanceReport
} from "@/lib/services/api";
import type { Faculty, Batch, StudentAttendanceDetail } from "@/lib/apiService"; // <-- Renamed from ReportApiResponse


export function useAttendanceReport() {
  const { user, token } = useAuth();

  // --- STATE MANAGEMENT ---
  const [selectedFacultyId, setSelectedFacultyId] = useState<string | null>(
    user?.role === "faculty" ? user.id : null
  );
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: undefined,
    to: undefined,
  });

  // --- DATA FETCHING using React Query ---

  const { data: faculties = [], isLoading: isLoadingFaculties } = useQuery({
    queryKey: ["faculties", user?.id, user?.role],
    queryFn: () => fetchFaculties(token),
    enabled: !!token,
    select: (allFaculties) =>
      user?.role === "faculty"
        ? allFaculties.filter((f) => f.id === user.id)
        : allFaculties,
  });

  const { data: batches = [], isLoading: isLoadingBatches } = useQuery({
    queryKey: ["batches", selectedFacultyId],
    queryFn: () => fetchBatchesForFaculty(token, selectedFacultyId!),
    enabled: !!selectedFacultyId && !!token,
  });

  const activeBatches = useMemo(() => {
    if (!batches) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return batches.filter((batch) => {
      const endDate = new Date(batch.end_date);
      return endDate >= today;
    });
  }, [batches]);

  const {
    mutate: generateReport,
    data: reportData,
    isPending: isGeneratingReport,
    isSuccess: isReportGenerated,
    // --- FIX #3: Update the type annotation for the mutation ---
  } = useMutation<StudentAttendanceDetail, Error>({ 
    mutationFn: () => {
      if (!selectedBatchId || !dateRange.from || !dateRange.to) {
        throw new Error("Please select a batch and a full date range.");
      }
      const params = {
        startDate: format(dateRange.from, "yyyy-MM-dd"),
        endDate: format(dateRange.to, "yyyy-MM-dd"),
      };
      // --- FIX #2: Call the newly named function ---
      return fetchBatchAttendanceReport(token, selectedBatchId, params);
    },
    onError: (error) => {
      toast.error("Could Not Generate Report", {
        description: error.message,
      });
    },
  });

  // --- MEMOIZED DATA PROCESSING (Unchanged) ---
  const processedReport = useMemo(() => {
    if (!reportData || !reportData.attendance_by_date || !reportData.students)
      return null;
    const dates = Object.keys(reportData.attendance_by_date).sort();
    if (dates.length === 0) return null;

    const studentRows = reportData.students.map((student) => {
      let present_count = 0;
      const daily_statuses = dates.map((date) => {
        const student_record = reportData.attendance_by_date[date]?.find(
          (r) => r.student_id === student.id
        );
        if (student_record) {
          if (student_record.is_present) {
            present_count++;
            return { status: "present" };
          }
          return { status: "absent" };
        }
        return { status: "no_class" };
      });
      const percentage =
        dates.length > 0
          ? Math.round((present_count / dates.length) * 100)
          : 0;
      return {
        id: student.id,
        name: student.name,
        daily_statuses,
        present_count,
        percentage,
      };
    });

    const total_present = studentRows.reduce(
      (sum, s) => sum + s.present_count,
      0
    );
    const total_possible = studentRows.length * dates.length;
    const overall_percentage =
      total_possible > 0
        ? Math.round((total_present / total_possible) * 100)
        : 0;
    const sortedByAttendance = [...studentRows].sort(
      (a, b) => b.percentage - a.percentage
    );

    return {
      dates,
      studentRows,
      summary: {
        overall_percentage: overall_percentage,
        total_classes: dates.length,
        top_performer: sortedByAttendance[0],
        low_performer: sortedByAttendance[sortedByAttendance.length - 1],
      },
    };
  }, [reportData]);

  // --- HANDLERS (Unchanged) ---
  const handleFacultySelect = (facultyId: string) => {
    setSelectedFacultyId(facultyId);
    setSelectedBatchId(null);
    setDateRange({ from: undefined, to: undefined });
  };

  const handleBatchSelect = (batchId: string) => {
    setSelectedBatchId(batchId);
    const batch = activeBatches.find((b) => b.id === batchId);
    if (batch) {
      const today = new Date();
      const batchEndDate = new Date(batch.end_date);
      const toDate = today < batchEndDate ? today : batchEndDate;
      setDateRange({ from: new Date(batch.start_date), to: toDate });
    }
  };

  useEffect(() => {
    if (user?.role !== "faculty" && !selectedFacultyId && faculties.length > 0) {
      setSelectedFacultyId(faculties[0].id);
    }
  }, [faculties, selectedFacultyId, user?.role]);

  return {
    // Values
    faculties,
    activeBatches,
    selectedFacultyId,
    selectedBatchId,
    dateRange,
    processedReport,
    isReportGenerated,
    userRole: user?.role,

    // Loading states
    isLoading: isLoadingFaculties || (!!selectedFacultyId && isLoadingBatches),
    isGeneratingReport,

    // Handlers
    handleFacultySelect,
    handleBatchSelect,
    setDateRange,
    generateReport,
  };
}