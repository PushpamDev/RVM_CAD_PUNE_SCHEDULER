// client/components/BatchDialog.tsx

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
// Removed Loader2 as we won't show search loading
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
  // --- RESTORED allStudents prop ---
  allStudents: Student[];
  skills: Skill[];
  onSave: (data: BatchFormData) => Promise<void>;
  // Renamed back
  onStudentAdded: () => void;
}

const initialFormData: BatchFormData = {
  name: "", description: "", startDate: "", endDate: "", startTime: "", endTime: "",
  facultyId: "", skillId: "", maxStudents: 15, status: "upcoming",
  studentIds: [], daysOfWeek: [],
};

// --- RESTORED Component Signature ---
export function BatchDialog({
    open,
    onOpenChange,
    batch,
    faculties,
    allStudents, // <-- Prop is back
    skills,
    onSave,
    onStudentAdded
}: BatchDialogProps) {
  const { token } = useAuth();
  const [formData, setFormData] = useState<BatchFormData>(initialFormData);
  const [isSaving, setIsSaving] = useState(false);
  // Renamed back
  const [isFetchingInitialStudents, setIsFetchingInitialStudents] = useState(false);

  // --- REMOVED Server-side search state ---
  // const [searchResults, setSearchResults] = useState<Student[]>([]);
  // const [isLoadingSearch, setIsLoadingSearch] = useState(false);

  // State for adding new student (unchanged)
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentAdmissionNumber, setNewStudentAdmissionNumber] = useState("");
  const [newStudentPhoneNumber, setNewStudentPhoneNumber] = useState("");
  const [newStudentRemarks, setNewStudentRemarks] = useState("");
  const [isAddingStudent, setIsAddingStudent] = useState(false); // Kept loading state for add

  // Student search term (client-side)
  const [studentSearch, setStudentSearch] = useState("");

  const wasOpenRef = useRef(open);

  // Effect 1: Initialize form and fetch initially enrolled students (mostly unchanged)
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const initializeForm = async () => {
        setIsSaving(false);
        setStudentSearch(""); // Clear client-side search term
        setNewStudentName(""); setNewStudentAdmissionNumber(""); setNewStudentPhoneNumber(""); setNewStudentRemarks("");

        if (batch) {
          setIsFetchingInitialStudents(true);
          let initialStudentIds: string[] = [];
          try {
            // Fetch only the IDs of enrolled students
            const response = await fetch(`${API_BASE_URL}/api/batches/${batch.id}/students`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to load enrolled students.");
            const enrolledStudentsData: Student[] = await response.json();
            initialStudentIds = enrolledStudentsData.map(s => s.id);
          } catch (error: any) {
            toast.error("Error loading student data", { description: error.message });
          } finally {
             setFormData({ /* ... form data population ... */
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
             setIsFetchingInitialStudents(false);
          }
        } else {
          setFormData(initialFormData);
          setIsFetchingInitialStudents(false);
        }
      };
      initializeForm();
    }
    wasOpenRef.current = open;
  }, [open, batch?.id, token]);

  // --- REMOVED Server-side search effect ---

  // handleAddStudent (Unchanged, calls parent onStudentAdded)
  const handleAddStudent = async () => {
    if (!newStudentName.trim() || !newStudentAdmissionNumber.trim()) {
      toast.error("Student Name and Admission Number are required."); return;
    }
    setIsAddingStudent(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newStudentName, admission_number: newStudentAdmissionNumber, phone_number: newStudentPhoneNumber, remarks: newStudentRemarks }),
      });
      if (!response.ok) { throw new Error((await response.json()).error || "Failed"); }

      toast.success(`Student "${newStudentName}" added successfully.`);
      setNewStudentName(""); setNewStudentAdmissionNumber(""); setNewStudentPhoneNumber(""); setNewStudentRemarks("");

      // Trigger parent refetch of the FULL student list
      onStudentAdded();

    } catch (error: any) {
      toast.error("Failed to add student", { description: error.message });
    } finally {
        setIsAddingStudent(false);
    }
  };

  // handleStudentToggle (Unchanged)
  const handleStudentToggle = (studentId: string) => {
    setFormData(prev => ({ ...prev, studentIds: prev.studentIds.includes(studentId) ? prev.studentIds.filter(id => id !== studentId) : [...prev.studentIds, studentId] }));
  };

  // handleDayToggle (Unchanged)
  const handleDayToggle = (day: string) => {
    setFormData(prev => ({ ...prev, daysOfWeek: prev.daysOfWeek.includes(day) ? prev.daysOfWeek.filter(d => d !== day) : [...prev.daysOfWeek, day] }));
  };

  // handleSubmit (Unchanged)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.facultyId) { /* Validation... */ toast.error("Please select a faculty."); return; }
    if (!formData.skillId) { /* Validation... */ toast.error("Please select a skill."); return; }
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

  // availableSkills calculation (Unchanged)
  const selectedFaculty = faculties.find(f => f.id === formData.facultyId);
  const availableSkills = useMemo(() => { /* ... */
    const facultySkills = selectedFaculty?.skills || [];
    const currentBatchSkillId = batch?.skill?.id;
    if (currentBatchSkillId && !facultySkills.some(s => s.id === currentBatchSkillId)) {
        const skillToAdd = skills.find(s => s.id === currentBatchSkillId);
        if (skillToAdd) return [skillToAdd, ...facultySkills];
    }
    return facultySkills;
  }, [selectedFaculty, batch?.skill?.id, skills]);

  // --- REVERTED filteredStudents logic to use allStudents prop ---
  const filteredStudents = useMemo(() => {
    const selectedIds = new Set(formData.studentIds);

    // Get selected students first (ensures they stay visible even if they don't match search)
    const selectedStudents = formData.studentIds
        .map(id => allStudents.find(student => student && student.id === id)) // Handle potential undefined students
        .filter((s): s is Student => !!s); // Type guard

    // Get unselected students
    const unselectedStudents = allStudents.filter(s => s && !selectedIds.has(s.id)); // Handle potential undefined students

    // Apply search filter ONLY to unselected students
    const applySearch = (list: Student[]) => {
        if (!studentSearch) return list;
        const lowerCaseSearch = studentSearch.toLowerCase();
        return list.filter(student =>
            (student.name ?? '').toLowerCase().includes(lowerCaseSearch) ||
            (student.admission_number ?? '').toLowerCase().includes(lowerCaseSearch)
        );
    };

    // Combine: Selected students first, then filtered unselected students
    return [...selectedStudents, ...applySearch(unselectedStudents)];
  }, [allStudents, studentSearch, formData.studentIds]); // Depends on the full list and search term
  // -----------------------------------------------------------------

  // Combined loading state
  const isLoading = isSaving || isFetchingInitialStudents || isAddingStudent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{batch ? "Edit Batch" : "Create New Batch"}</DialogTitle>
          <DialogDescription>{batch ? "Update batch information." : "Create a new batch."}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <fieldset disabled={isLoading} className="space-y-6">
            {/* --- Form Fields (Unchanged) --- */}
            {/* (Name, Max Students, Description, Dates, Times, Faculty, Skill, Status, Days) */}
            <div className="grid grid-cols-2 gap-4">
              {/* ... Name, MaxStudents ... */}
              <div className="space-y-2"><Label htmlFor="name">Batch Name</Label><Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required /></div>
              <div className="space-y-2"><Label htmlFor="maxStudents">Max Students</Label><Input id="maxStudents" type="number" min="1" value={formData.maxStudents} onChange={(e) => setFormData({ ...formData, maxStudents: Math.max(1, parseInt(e.target.value) || 15) })} required /></div>
            </div>
            <div className="space-y-2"> {/* Description */} <Label htmlFor="description">Description</Label><Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Enter batch description..." /> </div>
            <div className="grid grid-cols-2 gap-4">
              {/* ... StartDate, EndDate ... */}
              <div className="space-y-2"><Label htmlFor="startDate">Start Date</Label><Input id="startDate" type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })} required /></div>
              <div className="space-y-2"><Label htmlFor="endDate">End Date</Label><Input id="endDate" type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* ... StartTime, EndTime ... */}
              <div className="space-y-2"><Label htmlFor="startTime">Start Time</Label><Input id="startTime" type="time" value={formData.startTime} onChange={(e) => setFormData({ ...formData, startTime: e.target.value })} required /></div>
              <div className="space-y-2"><Label htmlFor="endTime">End Time</Label><Input id="endTime" type="time" value={formData.endTime} onChange={(e) => setFormData({ ...formData, endTime: e.target.value })} required /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {/* ... Faculty, Skill ... */}
              <div className="space-y-2"><Label htmlFor="faculty">Faculty</Label><Select value={formData.facultyId} onValueChange={(value) => setFormData({ ...formData, facultyId: value, skillId: "" })} disabled={faculties.length === 0} required><SelectTrigger><SelectValue placeholder="Select faculty" /></SelectTrigger><SelectContent>{faculties.filter(f => f.isActive).map((faculty) => (<SelectItem key={faculty.id} value={faculty.id}>{faculty.name}</SelectItem>))}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="skill">Skill/Subject</Label><Select value={formData.skillId} onValueChange={(value) => setFormData({ ...formData, skillId: value })} disabled={!formData.facultyId || availableSkills.length === 0} required><SelectTrigger><SelectValue placeholder={!formData.facultyId ? "Select a faculty first" : "Select skill"} /></SelectTrigger><SelectContent>{availableSkills.map((skill) => (<SelectItem key={skill.id} value={skill.id}>{skill.name}</SelectItem>))}</SelectContent></Select></div>
            </div>
            <div className="space-y-2"> {/* Status */} <Label htmlFor="status">Status</Label><Select value={formData.status} onValueChange={(value: BatchStatus) => setFormData({ ...formData, status: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{BATCH_STATUSES.map((status) => (<SelectItem key={status} value={status} className="capitalize">{status}</SelectItem>))}</SelectContent></Select> </div>
            <div className="space-y-2"> {/* DaysOfWeek */} <Label>Days of Week</Label><div className="flex flex-wrap gap-4 pt-2">{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (<div key={day} className="flex items-center space-x-2"><Checkbox id={`day-${day}`} checked={formData.daysOfWeek.includes(day)} onCheckedChange={() => handleDayToggle(day)} /><Label htmlFor={`day-${day}`} className="font-normal">{day}</Label></div>))}</div> </div>


            {/* --- REVERTED Student Selection --- */}
            <div className="space-y-2">
              <Label>Students ({formData.studentIds.length} selected)</Label>
              <Input
                placeholder="Search students by name or admission number..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="mb-2"
              />
              <div className="max-h-64 overflow-y-auto rounded-md border p-2 space-y-1">
                {isFetchingInitialStudents ? (
                  <div className="flex justify-center items-center h-48">
                    <p className="text-muted-foreground">Loading enrolled students...</p>
                  </div>
                ) : (
                  // Uses the client-side filtered list
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
                  )) : <p className="text-center text-muted-foreground py-4">No students found{studentSearch ? " matching your search" : "."}</p>
                )}
              </div>
              {/* Add New Student Form (Unchanged Structure) */}
              <div className="mt-4 p-4 border rounded-md grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 items-center">
                 <Input className="lg:col-span-1" placeholder="New Student Name*" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} />
                 <Input className="lg:col-span-1" placeholder="Admission No.*" value={newStudentAdmissionNumber} onChange={(e) => setNewStudentAdmissionNumber(e.target.value)} />
                 <Input className="lg:col-span-1" placeholder="Phone No. (Optional)" value={newStudentPhoneNumber} onChange={(e) => setNewStudentPhoneNumber(e.target.value)} />
                 <Input className="lg:col-span-1" placeholder="Remarks (Optional)" value={newStudentRemarks} onChange={(e) => setNewStudentRemarks(e.target.value)} />
                 <Button type="button" className="lg:col-span-1" onClick={handleAddStudent} disabled={isLoading || !newStudentName || !newStudentAdmissionNumber}>
                    {/* Kept loading indicator for adding */}
                    {isAddingStudent && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isAddingStudent ? 'Adding...' : 'Add Student'}
                 </Button>
              </div>
            </div>
            {/* --------------------------------- */}
          </fieldset>

          {/* Dialog Footer Buttons (Unchanged) */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancel</Button>
            <Button type="submit" disabled={isLoading}>{isSaving ? "Saving..." : (isFetchingInitialStudents ? "Loading..." : (batch ? "Update Batch" : "Create Batch"))}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}