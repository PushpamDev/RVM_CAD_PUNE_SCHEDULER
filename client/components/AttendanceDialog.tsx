// client/components/AttendanceDialog.tsx

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { useToast } from "./ui/use-toast";
import { useAuth } from '../hooks/AuthContext';
import { Checkbox } from './ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { DatePicker } from "./ui/date-picker";
import { Badge } from './ui/badge'; // --- ENHANCEMENT: Import Badge ---
import { API_BASE_URL } from '@/lib/api';
import type { Student, Batch } from '../types/batchManagement'; // --- ENHANCEMENT: Import from central types file ---

export interface AttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch: Batch;
  students: Student[];
  onAttendanceMarked: () => void;
  isFeePending: (remark: string) => boolean;
}

export function AttendanceDialog({ open, onOpenChange, batch, students, onAttendanceMarked, isFeePending }: AttendanceDialogProps) {
  const { token } = useAuth();
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();

  useEffect(() => {
    if (students) {
      const initialAttendance = students.reduce((acc, student) => {
        acc[student.id] = true; // Default to present
        return acc;
      }, {} as Record<string, boolean>);
      setAttendance(initialAttendance);
    }
    // Reset date to today when dialog opens for a new batch
    setDate(new Date());
  }, [students, open]);

  const handleAttendanceChange = (studentId: string, isPresent: boolean) => {
    setAttendance((prev) => ({ ...prev, [studentId]: isPresent }));
  };

  // --- ENHANCEMENT: Bulk action handlers ---
  const handleMarkAll = (isPresent: boolean) => {
    const newAttendance = students.reduce((acc, student) => {
      acc[student.id] = isPresent;
      return acc;
    }, {} as Record<string, boolean>);
    setAttendance(newAttendance);
  };

  const handleSaveAttendance = async () => {
    if (!batch || !date) return;

    const attendanceRecords = Object.keys(attendance).map(studentId => ({
      student_id: studentId,
      is_present: attendance[studentId],
    }));

    const attendanceData = {
      batchId: batch.id,
      date: date.toISOString().split('T')[0],
      attendance: attendanceRecords,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(attendanceData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to save attendance' }));
        throw new Error(errorData.message);
      }

      toast({
        title: "Attendance Saved",
        description: `Attendance for ${date.toLocaleDateString()} has been recorded.`,
      });
      onAttendanceMarked();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error Saving Attendance",
        description: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Mark Attendance for "{batch.name}"</DialogTitle>
          <DialogDescription>
            Select a date and mark student attendance. Students with pending fees are highlighted.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-medium">Date:</span>
              {/* --- ENHANCEMENT: Constrained Date Picker --- */}
              <DatePicker 
                date={date} 
                setDate={setDate}
                fromDate={new Date(batch.start_date)}
                toDate={new Date() < new Date(batch.end_date) ? new Date() : new Date(batch.end_date)}
              />
            </div>
            {/* --- ENHANCEMENT: Bulk Action Buttons --- */}
            <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleMarkAll(true)}>Mark All Present</Button>
                <Button variant="outline" size="sm" onClick={() => handleMarkAll(false)}>Mark All Absent</Button>
            </div>
          </div>
          <div className="rounded-md border max-h-[400px] overflow-y-auto">
            <Table>
              {/* --- ENHANCEMENT: Sticky Table Header --- */}
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead className="w-[100px] text-center">Present</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                            <span>{student.name}</span>
                            {/* --- ENHANCEMENT: Clearer Fee Status Badge --- */}
                            {isFeePending(student.remarks) && (
                                <Badge variant="destructive">Fee Pending</Badge>
                            )}
                        </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        className="h-5 w-5"
                        checked={attendance[student.id] ?? false}
                        onCheckedChange={(checked) =>
                          handleAttendanceChange(student.id, !!checked)
                        }
                        aria-label={`Mark ${student.name} as present`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSaveAttendance}>Save Attendance</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}