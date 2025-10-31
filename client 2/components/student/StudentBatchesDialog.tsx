// client/components/student/StudentBatchesDialog.tsx

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Student, Batch } from '@/types/studentManagement';
import { BookOpen } from 'lucide-react';
import { useStudentBatches } from '@/hooks/useStudentData';
import { formatFullDate } from '@/pages/StudentManagement';

// Helper to determine batch status
const getStatus = (startDateStr: string, endDateStr: string): 'upcoming' | 'active' | 'completed' => {
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

interface StudentBatchesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student;
}

export function StudentBatchesDialog({ open, onOpenChange, student }: StudentBatchesDialogProps) {
  // The hook is only called when a student is selected.
  // The `|| ''` ensures the hook doesn't throw an error on the initial render when `student` is undefined.
  const { batches, loading: isLoading } = useStudentBatches(student?.id || '');

  // Process batches to add status
  const studentBatches = batches.map(batch => ({
    ...batch,
    status: getStatus(batch.start_date, batch.end_date),
  }));

  const getStatusVariant = (status: 'upcoming' | 'active' | 'completed'): "secondary" | "default" | "outline" => {
    if (status === 'upcoming') return 'secondary';
    if (status === 'active') return 'default';
    return 'outline';
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Batches for {student.name}</DialogTitle>
          <DialogDescription>This student is enrolled in the following batches.</DialogDescription>
        </DialogHeader>
        <div className="rounded-md border mt-4 max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Batch Name</TableHead>
                <TableHead>Faculty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Schedule</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-12 w-full" /></TableCell></TableRow>
                ))
              ) : studentBatches.length > 0 ? (
                studentBatches.map((batch) => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.name}</TableCell>
                    <TableCell>{batch.faculty?.name || 'N/A'}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(batch.status)} className="capitalize">{batch.status}</Badge></TableCell>
                    <TableCell>
                      <div className="font-medium">{`${batch.start_time} - ${batch.end_time}`}</div>
                      <div className="text-sm text-muted-foreground">{`${formatFullDate(batch.start_date)} to ${formatFullDate(batch.end_date)}`}</div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <BookOpen className="h-12 w-12 text-muted-foreground" />
                      <h3 className="text-lg font-semibold">Not Enrolled</h3>
                      <p className="text-sm text-muted-foreground">This student is not currently in any batch.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}