// client/components/student/StudentDialog.tsx

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Student, StudentFormData } from '../../types/studentManagement';

interface StudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student;
  onSave: (data: StudentFormData) => Promise<boolean>;
}

export function StudentDialog({ student, open, onOpenChange, onSave }: StudentDialogProps) {
  const [formData, setFormData] = useState<StudentFormData>({
    name: "",
    admission_number: "",
    phone_number: "",
    remarks: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name,
        admission_number: student.admission_number,
        phone_number: student.phone_number,
        remarks: student.remarks || "",
      });
    } else {
      // Reset for creating a new student
      setFormData({ name: "", admission_number: "", phone_number: "", remarks: "" });
    }
  }, [student, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const success = await onSave(formData);
    setIsSaving(false);
    if (success) {
      onOpenChange(false); // Only close the dialog on successful save
    }
  };

  return (
    <Dialog open={open} onOpen-change={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{student ? "Edit Student" : "Create New Student"}</DialogTitle>
          <DialogDescription>
            {student ? "Update the student's information." : "Enter the details for the new student."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Student Name</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admission_number">Admission Number</Label>
            <Input id="admission_number" value={formData.admission_number} onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input id="phone_number" type="tel" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} placeholder="e.g., Fee due 25-10-2025" />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : (student ? "Update Student" : "Create Student")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}