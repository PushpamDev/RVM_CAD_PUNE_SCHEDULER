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
  // This function is expected to handle API calls and potential errors (e.g., showing a toast)
  onSave: (data: StudentFormData) => Promise<void>;
}

// **FIX**: Changed to a default export to resolve import errors in other files
export default function StudentDialog({ student, open, onOpenChange, onSave }: StudentDialogProps) {
  const [formData, setFormData] = useState<StudentFormData>({
    name: "",
    admission_number: "",
    phone_number: "",
    remarks: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Populate form with student data when editing, or reset when creating a new one.
    // This now runs only when the dialog is opened to ensure fresh state.
    if (open) {
      if (student) {
        setFormData({
          name: student.name,
          admission_number: student.admission_number,
          phone_number: student.phone_number,
          remarks: student.remarks || "",
        });
      } else {
        setFormData({ name: "", admission_number: "", phone_number: "", remarks: "" });
      }
    }
  }, [student, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(formData);
      onOpenChange(false); // Close dialog only on successful save
    } catch (error) {
      // The error is expected to be handled by a toast in the parent component's `onSave` function.
      console.error("Failed to save student:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Prevents closing the dialog by clicking outside while saving
  const handleOpenChange = (isOpen: boolean) => {
    if (!isSaving) {
      onOpenChange(isOpen);
    }
  };

  return (
    // **FIX**: Corrected typo from `onOpen-change` to `onOpenChange`
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{student ? "Edit Student" : "Create New Student"}</DialogTitle>
          <DialogDescription>
            {student ? "Update the student's information." : "Enter the details for the new student."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Student Name</Label>
            <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required disabled={isSaving} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admission_number">Admission Number</Label>
            <Input id="admission_number" value={formData.admission_number} onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })} required disabled={isSaving} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone_number">Phone Number</Label>
            <Input id="phone_number" type="tel" value={formData.phone_number} onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })} disabled={isSaving} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea id="remarks" value={formData.remarks} onChange={(e) => setFormData({ ...formData, remarks: e.target.value })} placeholder="e.g., Fee due 25 Oct 2025 or Full Paid" disabled={isSaving} />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : (student ? "Update Student" : "Create Student")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}