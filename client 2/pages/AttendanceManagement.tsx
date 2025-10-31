import React, { useState, useMemo } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  BadgePercent,
  Check,
  X,
  Calendar as CalendarIcon,
  FileSearch,
  Activity,
  CalendarCheck,
} from "lucide-react";
import { format } from "date-fns";
import { useAttendanceReport } from "../hooks/useAttendanceReport";
import { motion, AnimatePresence } from "framer-motion";

// --- Sub-components ---
const ReportSummaryCard = ({ title, value, icon: Icon, color = "text-primary" }) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-4 w-4 text-muted-foreground ${color}`} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold truncate" title={String(value)}>
        {value}
      </div>
    </CardContent>
  </Card>
);

const AttendanceGrid = ({ report }) => (
  <div className="rounded-md border mt-6 overflow-x-auto relative">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[150px] sm:w-[200px] sticky left-0 bg-background/95 backdrop-blur-sm z-10">
            Student
          </TableHead>
          {report.dates.map((date) => (
            <TableHead key={date} className="text-center min-w-[60px]">
              {format(new Date(date), "dd/MM")}
            </TableHead>
          ))}
          <TableHead className="text-right sticky right-0 bg-background/95 backdrop-blur-sm z-10">
            Attendance %
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {report.studentRows.map((row, rowIndex) => (
          <TableRow key={row.id} className={rowIndex % 2 === 0 ? "bg-muted/50" : ""}>
            <TableCell className="font-medium sticky left-0 bg-inherit z-10">
              {row.name}
            </TableCell>
            {row.daily_statuses.map((day, index) => (
              <TableCell key={index} className="text-center p-2">
                {day.status === "present" && (
                  <Check className="h-5 w-5 text-green-500 mx-auto" />
                )}
                {day.status === "absent" && (
                  <X className="h-5 w-5 text-red-500 mx-auto" />
                )}
                {day.status === "no_class" && (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableCell>
            ))}
            <TableCell className="text-right font-bold sticky right-0 bg-inherit z-10">
              {row.percentage}%
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

const ReportPlaceholder = ({ title, description }) => (
  <Card className="flex items-center justify-center h-96 border-dashed">
    <div className="text-center p-4">
      <div className="flex justify-center mb-4">
        <div className="p-4 bg-muted rounded-full">
          <FileSearch className="h-8 w-8 text-muted-foreground" />
        </div>
      </div>
      <CardTitle className="mb-2">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </div>
  </Card>
);

// --- Main Component ---
const AttendanceManagement = () => {
  const {
    faculties,
    activeBatches: batches, // Renamed for clarity, assuming hook provides all batches for the user
    selectedFacultyId,
    selectedBatchId,
    dateRange,
    processedReport,
    isReportGenerated,
    userRole,
    isLoading,
    isGeneratingReport,
    handleFacultySelect,
    handleBatchSelect,
    setDateRange,
    generateReport,
  } = useAttendanceReport();

  const [batchStatusFilter, setBatchStatusFilter] = useState("active");

  const facultySelectHandler = (facultyId) => {
    handleFacultySelect(facultyId);
    setBatchStatusFilter("active"); // Reset status to active when faculty changes
  };

  const displayedBatches = useMemo(() => {
    // If no faculty is selected or batches aren't loaded, return empty.
    if (!selectedFacultyId || !batches) {
      return [];
    }
    
    // Primary filter: only show batches for the selected faculty.
    return batches.filter((batch) => {
      if (batch.faculty_id !== selectedFacultyId) {
        return false;
      }
      
      // For non-admins, show only active batches.
      if (userRole !== "admin") {
        return batch.status === "active";
      }

      // For admins, filter by the selected status (active/completed).
      return batch.status.toLowerCase() === batchStatusFilter.toLowerCase();
    });

  }, [batches, selectedFacultyId, userRole, batchStatusFilter]);

  const canRenderReportDescription =
    processedReport && dateRange.from && dateRange.to;

  const filterGridClasses = `grid grid-cols-1 md:grid-cols-2 ${
    userRole === "admin" ? "xl:grid-cols-5" : "lg:grid-cols-4"
  } gap-4 items-end`;


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Attendance Report Generator</CardTitle>
          <CardDescription>
            Select filters to generate a comprehensive attendance report.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Skeleton className="h-10 w-full sm:w-[250px]" />
              <Skeleton className="h-10 w-full sm:w-[300px]" />
              <Skeleton className="h-10 w-full sm:w-[250px]" />
              <Skeleton className="h-10 w-full sm:w-[180px]" />
            </div>
          ) : (
            <div className={filterGridClasses}>
              <Select
                onValueChange={facultySelectHandler}
                value={selectedFacultyId || ""}
                disabled={userRole === "faculty"}
              >
                <SelectTrigger>
                  <SelectValue placeholder="1. Select Faculty" />
                </SelectTrigger>
                <SelectContent>
                  {faculties.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {userRole === "admin" && (
                <Select
                  value={batchStatusFilter}
                  onValueChange={(value) => {
                    setBatchStatusFilter(value);
                    handleBatchSelect(""); // Reset batch on status change
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active Batches</SelectItem>
                    <SelectItem value="Completed">Completed Batches</SelectItem>
                  </SelectContent>
                </Select>
              )}

              <Select
                value={selectedBatchId || ""}
                onValueChange={handleBatchSelect}
                disabled={!selectedFacultyId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={`2. Select ${
                      batchStatusFilter === "Completed" ? "Completed" : "Active"
                    } Batch`}
                  />
                </SelectTrigger>
                <SelectContent>
                  {displayedBatches.length > 0 ? (
                    displayedBatches.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      No batches found.
                    </div>
                  )}
                </SelectContent>
              </Select>

              <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
                <DatePicker
                  className="w-full"
                  date={dateRange.from}
                  setDate={(date) =>
                    setDateRange((prev) => ({ ...prev, from: date }))
                  }
                  disabled={!selectedBatchId}
                />
                <span className="hidden sm:inline text-muted-foreground">
                  to
                </span>
                <DatePicker
                  className="w-full"
                  date={dateRange.to}
                  setDate={(date) =>
                    setDateRange((prev) => ({ ...prev, to: date }))
                  }
                  disabled={!selectedBatchId}
                />
              </div>

              <Button
                onClick={() => generateReport()}
                disabled={isGeneratingReport || !selectedBatchId}
                className="w-full"
              >
                {isGeneratingReport ? (
                  <Activity className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CalendarIcon className="mr-2 h-4 w-4" />
                )}
                Generate Report
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AnimatePresence mode="wait">
        <motion.div
          key={
            isGeneratingReport
              ? "loading"
              : isReportGenerated
              ? "content"
              : "initial"
          }
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {isGeneratingReport && (
            <div className="text-center p-8 flex flex-col items-center justify-center h-96">
              <Activity className="h-8 w-8 animate-spin text-primary" />
              <p className="mt-4 text-lg font-semibold">
                Generating Your Report...
              </p>
              <p className="text-muted-foreground">Please wait a moment.</p>
            </div>
          )}

          {!isGeneratingReport && !processedReport && isReportGenerated && (
            <ReportPlaceholder
              title="No Attendance Data Found"
              description="There are no records for the selected batch and date range."
            />
          )}

          {!isGeneratingReport && !isReportGenerated && (
            <ReportPlaceholder
              title="Generate a Report"
              description="Select a faculty, batch, and date range to begin."
            />
          )}

          {!isGeneratingReport && processedReport && (
            <Card>
              <CardHeader>
                <CardTitle>Attendance Report</CardTitle>
                {canRenderReportDescription && (
                  <CardDescription>
                    Report for{" "}
                    {batches.find((b) => b.id === selectedBatchId)?.name}{" "}
                    from {format(dateRange.from!, "dd MMM, yyyy")} to{" "}
                    {format(dateRange.to!, "dd MMM, yyyy")}.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                  <ReportSummaryCard
                    title="Overall Attendance"
                    value={`${processedReport.summary.overall_percentage}%`}
                    icon={BadgePercent}
                    color="text-blue-500"
                  />
                  <ReportSummaryCard
                    title="Total Classes"
                    value={processedReport.summary.total_classes}
                    icon={CalendarCheck}
                    color="text-indigo-500"
                  />
                  <ReportSummaryCard
                    title="Top Performer"
                    value={processedReport.summary.top_performer?.name || "N/A"}
                    icon={TrendingUp}
                    color="text-green-500"
                  />
                  <ReportSummaryCard
                    title="Low Performer"
                    value={
                      processedReport.summary.low_performer?.name || "N/A"
                    }
                    icon={TrendingDown}
                    color="text-red-500"
                  />
                </div>
                <AttendanceGrid report={processedReport} />
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default AttendanceManagement;