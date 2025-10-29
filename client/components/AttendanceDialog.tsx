import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { useToast } from "./ui/use-toast";
import { useAuth } from '../hooks/AuthContext';
import { Checkbox } from './ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { DatePicker } from "./ui/date-picker";
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { Loader2 } from 'lucide-react';

import {
  saveAttendance,
  fetchDailyAttendance,
  fetchBatchAttendanceReport,
  AttendancePayload
} from '@/lib/services/api';
import type { Batch, Student } from '../types/batchManagement';


export interface AttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: Batch | null;
  onAttendanceMarked: () => void;
  isFeePending: (remark: string) => boolean;
}

export function AttendanceDialog({ open, onOpenChange, batch, onAttendanceMarked, isFeePending }: AttendanceDialogProps) {
  const { token } = useAuth();
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  // Initialize date state only once when the component mounts or resets
  const [date, setDate] = useState<Date | undefined>(() => new Date());
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  // Ref to track the ID of the batch whose students are currently loaded
  const loadedBatchIdRef = useRef<string | null>(null);

  // --- Effect 1: Fetch student list ONLY when batch changes ---
  useEffect(() => {
    // Only run if dialog is open AND the batch ID is different from the last loaded one
    if (open && batch && batch.id !== loadedBatchIdRef.current) {
      loadedBatchIdRef.current = batch.id; // Mark this batch ID as loading/loaded
      const fetchStudentListForBatch = async () => {
        if (!token) return;

        setLoadingStudents(true);
        setStudents([]); // Clear previous students
        setAttendance({}); // Clear previous attendance
        setDate(new Date()); // Reset date to today when batch changes

        try {
          const startDate = batch.start_date ? batch.start_date.split('T')[0] : undefined;
          const endDate = batch.end_date ? batch.end_date.split('T')[0] : undefined;
          const report = await fetchBatchAttendanceReport(token, batch.id, { startDate, endDate });
          setStudents(report.students || []);
          // Attendance will be fetched by the next effect after students are set
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Could not fetch the list of students for this batch.",
          });
          setStudents([]); // Ensure students is empty on error
          loadedBatchIdRef.current = null; // Reset ref on error so it tries again if reopened
        } finally {
          setLoadingStudents(false);
        }
      };
      fetchStudentListForBatch();
    } else if (!open) {
      // Reset the ref when the dialog is closed
      loadedBatchIdRef.current = null;
    }
  }, [batch?.id, open, token]); // Depend only on batch ID, open status, and token

  // --- Effect 2: Fetch attendance when date changes OR students finish loading ---
  useEffect(() => {
    // Exit if not open, no valid batch ID, date missing, or students are still loading
    if (!open || !batch?.id || !date || loadingStudents) {
      setAttendance({}); // Clear attendance if conditions aren't met
      return;
    }

    // Exit if student list is empty (potentially after an error in effect 1)
    if (students.length === 0) {
        setAttendance({});
        return;
    }

    const fetchAndUpdateAttendanceForDate = async () => {
      try {
        const formattedDate = date.toISOString().split('T')[0];
        const dailyRecords = await fetchDailyAttendance(token, batch.id, formattedDate);

        let newAttendance: Record<string, boolean> = {};
        if (dailyRecords && dailyRecords.length > 0) {
          // Populate from records, ensuring only currently listed students are included
          newAttendance = dailyRecords.reduce((acc, record) => {
            if (students.some(s => s.id === record.student_id)) {
              acc[record.student_id] = record.is_present;
            }
            return acc;
          }, {} as Record<string, boolean>);
          // Ensure all students have an entry - default those not in records to false (absent)
          students.forEach(student => {
             if (!(student.id in newAttendance)) {
                 newAttendance[student.id] = false;
             }
         });
        } else {
          // No records exist for this date, default everyone to present
          newAttendance = students.reduce((acc, student) => {
            acc[student.id] = true; // Default present
            return acc;
          }, {} as Record<string, boolean>);
        }
        setAttendance(newAttendance);

      } catch (error) {
        // Handle fetch errors (like 404) - default everyone to present
        console.warn(`Could not fetch daily attendance for ${date.toISOString().split('T')[0]}, defaulting to present.`, error);
        const defaultAttendance = students.reduce((acc, student) => {
          acc[student.id] = true; // Default present
          return acc;
        }, {} as Record<string, boolean>);
        setAttendance(defaultAttendance);
      }
    };

    fetchAndUpdateAttendanceForDate();

    // This effect runs when:
    // 1. The date changes.
    // 2. The `students` array reference changes (after Effect 1 finishes).
    // 3. `loadingStudents` changes from true to false (after Effect 1 finishes).
    // 4. `open`, `token`, or `batch.id` changes (these also trigger Effect 1).
  }, [date, students, loadingStudents, open, token, batch?.id]);


  // --- Event Handlers ---

  const handleAttendanceChange = (studentId: string, isPresent: boolean) => {
    setAttendance((prev) => ({ ...prev, [studentId]: isPresent }));
  };

  const handleMarkAll = useCallback((isPresent: boolean) => {
    // Derives new attendance based *only* on the current students state
    const newAttendance = students.reduce((acc, student) => {
      acc[student.id] = isPresent;
      return acc;
    }, {} as Record<string, boolean>);
    setAttendance(newAttendance);
  }, [students]); // Depends only on students reference


  const handleSaveAttendance = async () => {
    if (!batch || !date) return;
    setSaving(true);

    const currentStudentIds = new Set(students.map(s => s.id));
    const attendanceData: AttendancePayload = {
      batchId: batch.id,
      date: date.toISOString().split('T')[0],
      attendance: Object.entries(attendance)
        .filter(([studentId]) => currentStudentIds.has(studentId)) // Only save for current students
        .map(([studentId, isPresent]) => ({
          student_id: studentId,
          is_present: isPresent,
      })),
    };

    // Safety check: Don't save if lists mismatch
    if (students.length > 0 && attendanceData.attendance.length !== students.length) {
        toast({
            variant: "destructive",
            title: "Data Mismatch",
            description: "Student list or attendance data changed. Please review and try again.",
        });
        setSaving(false);
        return;
    }
    // Prevent saving empty attendance if student list somehow empty
     if (students.length === 0 && attendanceData.attendance.length === 0) {
         toast({
            title: "No Students",
            description: "Cannot save attendance for an empty batch.",
        });
        setSaving(false);
        return;
     }

    try {
      await saveAttendance(token, attendanceData);
      toast({
        title: "Attendance Saved",
        description: `Attendance for ${date.toLocaleDateString()} recorded.`,
      });
      onAttendanceMarked(); // Notify parent
      onOpenChange(false); // Close dialog
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error Saving Attendance",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
        setSaving(false);
    }
  };

  // Avoid rendering anything if the batch isn't set (although controlled by parent's `open`)
  if (!batch) return null;

  // Determine date picker bounds safely
  const minDate = batch.start_date ? new Date(batch.start_date) : undefined;
  const today = new Date();
  const batchEndDate = batch.end_date ? new Date(batch.end_date) : undefined;
  // Max date is today unless today is after the batch end date
  const maxDate = batchEndDate && today > batchEndDate ? batchEndDate : today;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mark Attendance for "{batch.name}"</DialogTitle>
          <DialogDescription>
            Select date and mark attendance. Fee pending students highlighted.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Date Picker and Mark All Buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">Date:</span>
              <DatePicker
                date={date}
                setDate={setDate} // Directly pass the state setter
                fromDate={minDate}
                toDate={maxDate}
                disabled={loadingStudents || saving} // Disable picker while loading/saving
              />
            </div>
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleMarkAll(true)} disabled={loadingStudents || saving || students.length === 0}>Mark All Present</Button>
                <Button variant="outline" size="sm" onClick={() => handleMarkAll(false)} disabled={loadingStudents || saving || students.length === 0}>Mark All Absent</Button>
            </div>
          </div>
          {/* Student Table */}
          <div className="rounded-md border max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="w-[100px] text-center">Present</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingStudents ? (
                  [...Array(5)].map((_, i) => ( // Skeleton loaders
                    <TableRow key={`skel-${i}`}>
                      <TableCell><Skeleton className="h-5 w-4/5" /></TableCell>
                      <TableCell className="text-center"><Skeleton className="h-5 w-5 mx-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : students.length > 0 ? (
                  students.map((student) => ( // Actual student rows
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{student.name}</span>
                          {isFeePending(student.remarks) && (
                            <Badge variant="destructive">Fee Pending</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          className="h-5 w-5"
                          checked={attendance[student.id] ?? false} // Ensure checked is always boolean
                          onCheckedChange={(checked) =>
                            handleAttendanceChange(student.id, !!checked)
                          }
                          aria-label={`Mark ${student.name} as present`}
                          disabled={saving} // Disable checkbox while saving
                        />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  // No students message
                  <TableRow>
                    <TableCell colSpan={2} className="text-center h-24 text-muted-foreground">
                      No students found for this batch.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
        {/* Dialog Footer */}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSaveAttendance} disabled={saving || loadingStudents || students.length === 0}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Attendance'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}