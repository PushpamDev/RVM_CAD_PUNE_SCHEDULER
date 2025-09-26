// client/components/student/StudentBatchesDialog.tsx

import React from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { BookOpen } from 'lucide-react';
import type { Student, Batch } from '../../types/studentManagement';

interface StudentBatchesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student;
  batches: Batch[];
}

export function StudentBatchesDialog({ student, open, onOpenChange, batches }: StudentBatchesDialogProps) {
  if (!student) return null;

  const studentBatches = batches.filter(batch =>
    batch?.students?.some(s => s.id === student.id)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Batches for {student.name}</DialogTitle>
          <DialogDescription>List of batches that {student.name} is currently enrolled in.</DialogDescription>
        </DialogHeader>
        {studentBatches.length > 0 ? (
          <div className="rounded-md border mt-4 max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch Name</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentBatches.map(batch => (
                  <TableRow key={batch.id}>
                    <TableCell className="font-medium">{batch.name}</TableCell>
                    <TableCell>{new Date(batch.start_date).toLocaleDateString()} - {new Date(batch.end_date).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center gap-2 py-8">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <h3 className="font-semibold">Not Enrolled</h3>
            <p className="text-sm text-muted-foreground">This student is not currently in any batch.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}