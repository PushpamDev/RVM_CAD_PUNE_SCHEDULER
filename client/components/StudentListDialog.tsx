// client/components/StudentListDialog.tsx

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { Student } from '../types/batchManagement';
import { Users } from 'lucide-react';

// Sub-component for editing remarks
const UpdateRemarksDialog = React.memo(function UpdateRemarksDialog({ student, onClose, onSave }: { student: Student | null, onClose: () => void, onSave: (remarks: string) => void }) {
  const [remarks, setRemarks] = useState("");
  useEffect(() => { if (student) setRemarks(student.remarks || ""); }, [student]);
  if (!student) return null;
  return (
    <Dialog open={!!student} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Update Remarks for {student.name}</DialogTitle></DialogHeader>
        <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Enter remarks..." rows={4} />
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={() => onSave(remarks)}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});

// Main Dialog Component
interface StudentListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchName: string;
  students: (Student & { isFeePending: boolean })[];
  onUpdateRemarks: (studentId: string, remarks: string) => void;
  isFeePending: (remark: string) => boolean;
  loading?: boolean; // **NEW**: Added a loading prop
}

export function StudentListDialog({ open, onOpenChange, batchName, students, onUpdateRemarks, isFeePending, loading }: StudentListDialogProps) {
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  const formatPhoneNumber = (phone: string): string => {
      if (!phone || typeof phone !== 'string') return 'N/A';
      const cleaned = phone.replace(/\D/g, '');
      if (cleaned.length === 10) return `+91 ${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
      if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned.substring(0, 2)} ${cleaned.substring(2, 7)} ${cleaned.substring(7)}`;
      return phone;
  };
  
  const getRemarkStyles = (remark: string): React.CSSProperties => {
    if (isFeePending(remark)) return { color: "red", fontWeight: "bold" };
    const fullPaidRegex = /full(y)?\s*paid/;
    if (remark && fullPaidRegex.test(remark.toLowerCase())) return { color: "green", fontWeight: "bold" };
    return {};
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Students in "{batchName}" ({loading ? '...' : students.length})</DialogTitle>
        </DialogHeader>
        <div className="rounded-md border mt-4 max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Admission Number</TableHead>
                <TableHead>Phone Number</TableHead>
                <TableHead>Remarks</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                ))
              ) : students.length > 0 ? (
                students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {student.isFeePending && <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" title="Fee Pending" />}
                        <span>{student.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{student.admission_number}</TableCell>
                    <TableCell>{formatPhoneNumber(student.phone_number)}</TableCell>
                    <TableCell className="max-w-[300px] truncate" title={student.remarks} style={getRemarkStyles(student.remarks)}>
                      {student.remarks || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setEditingStudent(student)}>Edit Remarks</Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="h-12 w-12 text-muted-foreground" />
                      <h3 className="text-lg font-semibold">No Students Enrolled</h3>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <UpdateRemarksDialog
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSave={(remarks) => {
            if (editingStudent) {
              onUpdateRemarks(editingStudent.id, remarks);
              setEditingStudent(null);
            }
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
