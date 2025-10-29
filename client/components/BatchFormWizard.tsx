import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { API_BASE_URL } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from '../hooks/AuthContext';
import {
  type Batch,
  type BatchFormData,
  type BatchStatus,
  type Faculty,
  type Skill,
  type Student,
  BATCH_STATUSES
} from '../types/batchManagement';

interface BatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  batch?: Batch;
  faculties: Faculty[];
  allStudents: Student[];
  skills: Skill[];
  onSave: (data: BatchFormData) => Promise<void>;
  onStudentAdded: () => void; // Function to trigger refetch in parent
}

const initialFormData: BatchFormData = {
  name: "", description: "", startDate: "", endDate: "", startTime: "", endTime: "",
  facultyId: "", skillId: "", maxStudents: 15, status: "upcoming",
  studentIds: [], daysOfWeek: [],
};

export function BatchDialog({ open, onOpenChange, batch, faculties, allStudents, skills, onSave, onStudentAdded }: BatchDialogProps) {
  const { token } = useAuth();
  const [formData, setFormData] = useState<BatchFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingStudents, setIsFetchingStudents] = useState(false);

  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentAdmissionNumber, setNewStudentAdmissionNumber] = useState("");
  const [newStudentPhoneNumber, setNewStudentPhoneNumber] = useState("");
  const [newStudentRemarks, setNewStudentRemarks] = useState("");
  const [studentSearch, setStudentSearch] = useState("");

  const wasOpenRef = useRef(open);

  // Effect for initializing form when dialog opens or batch changes
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const initializeForm = async () => {
        setIsSaving(false);
        setStudentSearch("");
        setNewStudentName(""); setNewStudentAdmissionNumber(""); setNewStudentPhoneNumber(""); setNewStudentRemarks("");

        if (batch) {
          setIsFetchingStudents(true);
          let initialStudentIds: string[] = [];
          try {
            const response = await fetch(`${API_BASE_URL}/api/batches/${batch.id}/students`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to load enrolled students.");
            const enrolledStudents: Student[] = await response.json();
            initialStudentIds = enrolledStudents.map(s => s.id);
          } catch (error: any) {
            toast.error("Error loading student data", { description: error.message });
          } finally {
             setFormData({
                name: batch.name,
                description: batch.description || "",
                startDate: batch.start_date ? batch.start_date.split('T')[0] : "",
                endDate: batch.end_date ? batch.end_date.split('T')[0] : "",
                startTime: batch.start_time || "",
                endTime: batch.end_time || "",
                facultyId: batch.original_faculty?.id || batch.faculty_id || "",
                skillId: batch.skill?.id || "",
                maxStudents: batch.max_students || 15,
                status: batch.status,
                studentIds: initialStudentIds,
                daysOfWeek: batch.days_of_week || [],
             });
             setIsFetchingStudents(false);
          }
        } else {
          setFormData(initialFormData);
          setIsFetchingStudents(false);
        }
      };
      initializeForm();
    }
    wasOpenRef.current = open;
  }, [open, batch?.id, token]); // Depend on batch ID

  // --- UPDATED handleAddStudent ---
  const handleAddStudent = async () => {
    if (!newStudentName.trim() || !newStudentAdmissionNumber.trim()) {
      toast.error("Student Name and Admission Number are required.");
      return;
    }
    // Consider adding a local loading state specific to adding a student
    // const [isAddingStudent, setIsAddingStudent] = useState(false);
    // setIsAddingStudent(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: newStudentName,
          admission_number: newStudentAdmissionNumber,
          phone_number: newStudentPhoneNumber,
          remarks: newStudentRemarks,
        }),
      });
      const result = await response.json(); // Assuming result contains the new student with ID
      if (!response.ok || !result?.id) { // Check if ID exists
          throw new Error(result.error || "Failed to add student or receive valid ID.");
      }

      toast.success(`Student "${newStudentName}" added successfully.`);

      // 1. Update the local form state to include the new student ID
      setFormData(prev => ({
        ...prev,
        // Add the new ID only if it's not already there (unlikely but safe)
        studentIds: prev.studentIds.includes(result.id) ? prev.studentIds : [...prev.studentIds, result.id]
      }));

      // 2. Clear the input fields
      setNewStudentName("");
      setNewStudentAdmissionNumber("");
      setNewStudentPhoneNumber("");
      setNewStudentRemarks("");

      // 3. Trigger parent refetch AFTER local state is updated
      // This ensures the list refresh doesn't interfere with selecting the new student
      onStudentAdded();

    } catch (error: any) {
      toast.error("Failed to add student", { description: error.message });
    } finally {
        // setIsAddingStudent(false);
    }
  };

  const handleStudentToggle = (studentId: string) => {
    setFormData(prev => ({ ...prev, studentIds: prev.studentIds.includes(studentId) ? prev.studentIds.filter(id => id !== studentId) : [...prev.studentIds, studentId] }));
  };

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({ ...prev, daysOfWeek: prev.daysOfWeek.includes(day) ? prev.daysOfWeek.filter(d => d !== day) : [...prev.daysOfWeek, day] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.facultyId) {
      toast.error("Please select a faculty."); return;
    }
    if (!formData.skillId) {
      toast.error("Please select a skill."); return;
    }
    setIsSaving(true);
    try {
      await onSave(formData);
      onOpenChange(false);
    } catch (error) {
      console.error("Save failed in BatchDialog:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedFaculty = faculties.find(f => f.id === formData.facultyId);

  const availableSkills = useMemo(() => {
    const facultySkills = selectedFaculty?.skills || [];
    const currentBatchSkillId = batch?.skill?.id;
    if (currentBatchSkillId && !facultySkills.some(s => s.id === currentBatchSkillId)) {
        const skillToAdd = skills.find(s => s.id === currentBatchSkillId);
        if (skillToAdd) return [skillToAdd, ...facultySkills];
    }
    return facultySkills;
  }, [selectedFaculty, batch?.skill?.id, skills]);

  const filteredStudents = useMemo(() => {
    // Show selected students first, then the rest, filtered by search
    const selectedIds = new Set(formData.studentIds);
    const selected = allStudents.filter(s => selectedIds.has(s.id));
    const unselected = allStudents.filter(s => !selectedIds.has(s.id));

    const applySearch = (list: Student[]) => {
        if (!studentSearch) return list;
        const lowerCaseSearch = studentSearch.toLowerCase();
        return list.filter(student =>
            (student.name ?? '').toLowerCase().includes(lowerCaseSearch) ||
            (student.admission_number ?? '').toLowerCase().includes(lowerCaseSearch)
        );
    };

    return [...selected, ...applySearch(unselected)]; // Show selected students always at the top

  }, [allStudents, studentSearch, formData.studentIds]); // Re-sort when selection changes

  const isLoading = isSaving || isFetchingStudents; // || isAddingStudent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{batch ? "Edit Batch" : "Create New Batch"}</DialogTitle>
          <DialogDescription>{batch ? "Update batch information." : "Create a new batch."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <fieldset disabled={isLoading} className="space-y-6">
            {/* --- Form Fields --- */}
            {/* (Name, Max Students, Description, Dates, Times, Faculty, Skill, Status, Days) */}
             <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Batch Name</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxStudents">Max Students</Label>
                <Input id="maxStudents" type="number" min="1" value={formData.maxStudents} onChange={(e) => setFormData({ ...formData, maxStudents: Math.max(1, parseInt(e.target.value) || 15) })} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Enter batch description..." />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input id="startDate" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input id="endDate" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input id="startTime" type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input id="endTime" type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.g.value })} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="faculty">Faculty</Label>
                <Select value={formData.facultyId} onValueChange={(value) => setFormData({ ...formData, facultyId: value, skillId: "" })} disabled={faculties.length === 0}>
                  <SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger>
                  <SelectContent>
                    {faculties.filter(f => f.isActive).map((faculty) => (
                      <SelectItem key={faculty.id} value={faculty.id}>{faculty.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="skill">Skill/Subject</Label>
                <Select value={formData.skillId} onValueChange={(value) => setFormData({ ...formData, skillId: value })} disabled={!formData.facultyId || availableSkills.length === 0} required>
                  <SelectTrigger>
                    <SelectValue placeholder={!formData.facultyId ? "Select a faculty first" : "Select skill"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSkills.map((skill) => (
                      <SelectItem key={skill.id} value={skill.id}>{skill.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(value: BatchStatus) => setFormData({ ...formData, status: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {BATCH_STATUSES.map((status) => (
                    <SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Days of Week</Label>
              <div className="flex flex-wrap gap-4 pt-2">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                  <div key={day} className="flex items-center space-x-2">
                    <Checkbox id={`day-${day}`} checked={formData.daysOfWeek.includes(day)} onCheckedChange={() => handleDayToggle(day)} />
                    <Label htmlFor={`day-${day}`} className="font-normal">{day}</Label>
                  </div>
                ))}
              </div>
            </div>


            {/* Student Selection */}
            <div className="space-y-2">
              <Label>Students ({formData.studentIds.length} selected)</Label>
              <Input placeholder="Search students by name or admission number..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} className="mb-2" />
              <div className="max-h-64 overflow-y-auto rounded-md border p-2 space-y-1">
                {isFetchingStudents ? (
                  <div className="flex justify-center items-center h-48">
                    <p className="text-muted-foreground">Loading enrolled students...</p>
                  </div>
                ) : (
                  filteredStudents.length > 0 ? filteredStudents.map((student) => (
  <div key={student.id} className="flex items-center space-x-2 p-2 hover:bg-muted rounded-md">
    <Checkbox
      id={`student-${student.id}`}
      checked={formData.studentIds.includes(student.id)}
      onCheckedChange={() => handleStudentToggle(student.id)}
    />
    <Label htmlFor={`student-${student.id}`} className="font-normal w-full cursor-pointer">
      {student.name} ({student.admission_number})
    </Label>
  </div>
)) : <p className="text-center text-muted-foreground py-4">No students found.</p>
                )}
              </div>
              {/* Add New Student Form */}
              <div className="mt-4 p-4 border rounded-md grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 items-center">
                <Input className="lg:col-span-1" placeholder="New Student Name" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} />
                <Input className="lg:col-span-1" placeholder="Admission No." value={newStudentAdmissionNumber} onChange={(e) => setNewStudentAdmissionNumber(e.target.value)} />
                <Input className="lg:col-span-1" placeholder="Phone No. (Optional)" value={newStudentPhoneNumber} onChange={(e) => setNewStudentPhoneNumber(e.target.value)} />
                <Input className="lg:col-span-1" placeholder="Remarks (Optional)" value={newStudentRemarks} onChange={(e) => setNewStudentRemarks(e.target.value)} />
                <Button type="button" className="lg:col-span-1" onClick={handleAddStudent} disabled={isLoading || !newStudentName || !newStudentAdmissionNumber}>Add Student</Button>
              </div>
            </div>
          </fieldset>

          {/* Dialog Footer Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isSaving ? "Saving..." : (isFetchingStudents ? "Loading..." : (batch ? "Update Batch" : "Create Batch"))}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}