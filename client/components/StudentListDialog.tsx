// client/components/StudentListDialog.tsx

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from '../hooks/AuthContext';
import type { Student } from '../types/batchManagement';
import { Users } from 'lucide-react';

// --- Helper Functions ---
const isFeePending = (remark: string): boolean => {
  if (!remark) return false;
  
  const lowerCaseRemark = remark.toLowerCase().trim();
  if (lowerCaseRemark.includes("fullpaid") || lowerCaseRemark.includes("full paid")) return false;

  const dateMatch = lowerCaseRemark.match(/(\d{1,2})[\s\-\/](\d{1,2}|[a-z]{3})[\s\-\/](\d{4})/);
  if (!dateMatch) return false;

  try {
    const parsedDate = new Date(dateMatch[0].replace(/ /g, '-'));
    if (isNaN(parsedDate.getTime())) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    parsedDate.setHours(0, 0, 0, 0);
    
    return parsedDate <= today;
  } catch (error) {
    return false;
  }
};

const getRemarkStyles = (remark: string): React.CSSProperties => {
  if (isFeePending(remark)) {
    return { color: "red", fontWeight: "bold" };
  }
  if (remark?.toLowerCase().includes("fullpaid")) {
    return { color: "green", fontWeight: "bold" };
  }
  return {};
};

const formatPhoneNumber = (phone: string): string => {
    if (!phone || typeof phone !== 'string') return 'N/A';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `+91 ${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
    }
    if (cleaned.length === 12 && cleaned.startsWith('91')) {
        return `+${cleaned.substring(0, 2)} ${cleaned.substring(2, 7)} ${cleaned.substring(7)}`;
    }
    return phone;
};

// --- Sub-component for editing remarks ---
const UpdateRemarksDialog = React.memo(function UpdateRemarksDialog({ student, onClose, onSave }: { student: Student | null, onClose: () => void, onSave: (remarks: string) => void }) {
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (student) setRemarks(student.remarks || "");
  }, [student]);

  if (!student) return null;

  return (
    <Dialog open={!!student} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Remarks for {student.name}</DialogTitle>
        </DialogHeader>
        <Textarea value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Enter remarks..." rows={4} />
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={() => onSave(remarks)}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
});


// --- Main Dialog Component ---
interface StudentListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batchName: string;
  students: Student[];
  onUpdateRemarks: (studentId: string, remarks: string) => void;
}

export function StudentListDialog({ open, onOpenChange, batchName, students, onUpdateRemarks }: StudentListDialogProps) {
  const { user } = useAuth();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const getColSpan = () => (user?.role === 'admin' ? 5 : 4);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Students in "{batchName}" ({students.length})</DialogTitle>
        </DialogHeader>
        <div className="rounded-md border mt-4 max-h-[60vh] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">Name</TableHead>
                <TableHead>Admission Number</TableHead>
                {user?.role === 'admin' && <TableHead>Phone Number</TableHead>}
                <TableHead>Remarks</TableHead>
                {user?.role === 'admin' && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {students && students.length > 0 ? (
                students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {isFeePending(student.remarks) && <div className="h-2 w-2 rounded-full bg-red-500 flex-shrink-0" title="Fee Pending" />}
                        {/* --- MODIFICATION: Removed the conditional style from the name --- */}
                        <span>{student.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{student.admission_number}</TableCell>
                    {user?.role === 'admin' && <TableCell>{formatPhoneNumber(student.phone_number)}</TableCell>}
                    <TableCell 
                      className="max-w-[300px] truncate" 
                      title={student.remarks} 
                      style={getRemarkStyles(student.remarks)}
                    >
                      {student.remarks || "-"}
                    </TableCell>
                    {user?.role === 'admin' && (
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => setEditingStudent(student)}>Edit</Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={getColSpan()} className="h-48 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="h-12 w-12 text-muted-foreground" />
                      <h3 className="text-lg font-semibold">No Students Enrolled</h3>
                      <p className="text-sm text-muted-foreground">Students can be added to this batch from the main edit screen.</p>
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