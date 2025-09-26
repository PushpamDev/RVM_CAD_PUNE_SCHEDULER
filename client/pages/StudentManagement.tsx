// client/pages/StudentManagement.tsx

import { useState, useMemo } from "react";
import { Plus, Search, Edit, Trash2, Eye, MoreVertical, User as UserIcon } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Skeleton } from "../components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Toaster } from "../components/ui/sonner";
import { useStudentData } from "../hooks/useStudentData";
import { StudentDialog } from "../components/student/StudentDialog.tsx"; // Corrected import
import { StudentBatchesDialog } from "../components/student/StudentBatchesDialog";
import type { Student } from "../types/studentManagement";

// --- Helper Functions for Display ---
const isFeePending = (remark: string): boolean => {
  if (!remark) return false;
  
  const lowerCaseRemark = remark.toLowerCase().trim();
  if (lowerCaseRemark.includes("fullpaid") || lowerCaseRemark.includes("full paid")) return false; // If 'fullpaid', it's NOT pending.

  // Regex to match common date formats (DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, DD MMM YYYY)
  // This will try to extract a date. If a date is present, we compare it to today.
  // Example: "due 25-10-2025" or "pending on 1/11/2023"
  const dateMatch = lowerCaseRemark.match(/(\d{1,2})[\s\-\/\.](\d{1,2}|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[\s\-\/\.](\d{2,4})/);
  
  if (dateMatch) {
    try {
      let [_, day, month, year] = dateMatch;
      // Handle abbreviated month names
      if (isNaN(Number(month))) {
        const monthMap: { [key: string]: string } = {
          jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
          jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
        };
        month = monthMap[month];
      }
      
      // Ensure year is 4 digits
      if (year.length === 2) {
        year = `20${year}`; // Assuming 2-digit years are in current century
      }

      const parsedDate = new Date(`${year}-${month}-${day}`);
      if (isNaN(parsedDate.getTime())) return false; // Invalid date
      
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize today's date to start of day
      parsedDate.setHours(0, 0, 0, 0); // Normalize parsed date to start of day
      
      return parsedDate <= today; // Fee is pending if due date is today or in the past
    } catch (error) {
      console.error("Error parsing date from remark:", remark, error);
      return false; // If date parsing fails, assume not pending based on date
    }
  }

  // If no date is found, and it's not "fullpaid", we could infer pending status
  // or require a more explicit "pending" keyword. For now, let's keep it date-focused.
  // You might add conditions like: `return lowerCaseRemark.includes("pending");`
  return false;
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

// --- Main Component ---
export default function StudentManagement() {
  const { students, batches, faculties, loading, saveStudent, deleteStudent } = useStudentData();
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [isBatchesDialogOpen, setIsBatchesDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOption, setFilterOption] = useState<string>("all");

  const filteredStudents = useMemo(() => {
    let studentsToFilter = [...students];
    if (searchTerm) {
      studentsToFilter = studentsToFilter.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.admission_number.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterOption === 'unassigned') {
      const enrolledStudentIds = new Set(batches.flatMap(b => b.students.map(s => s.id)));
      return studentsToFilter.filter(s => !enrolledStudentIds.has(s.id));
    }
    if (filterOption !== 'all') {
      const studentIdsForFaculty = new Set(
        batches.filter(b => b.faculty_id === filterOption).flatMap(b => b.students.map(s => s.id))
      );
      return studentsToFilter.filter(s => studentIdsForFaculty.has(s.id));
    }
    return studentsToFilter;
  }, [students, batches, filterOption, searchTerm]);

  const handleAdd = () => { setSelectedStudent(undefined); setIsStudentDialogOpen(true); };
  const handleEdit = (student: Student) => { setSelectedStudent(student); setIsStudentDialogOpen(true); };
  const handleViewBatches = (student: Student) => { setSelectedStudent(student); setIsBatchesDialogOpen(true); };

  return (
    <div className="space-y-6">
      <Toaster richColors />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Management</h1>
          <p className="text-muted-foreground">Search, manage, and view student details and enrollments.</p>
        </div>
        <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-2" />Add Student</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>Found {filteredStudents.length} of {students.length} total students.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-grow sm:flex-grow-0"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by name or admission no..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-8 sm:w-[300px]" /></div>
            <Select value={filterOption} onValueChange={setFilterOption}>
              <SelectTrigger className="w-full sm:w-auto"><SelectValue placeholder="Filter by..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Show All Students</SelectItem>
                <SelectItem value="unassigned">Not in any Batch</SelectItem>
                {faculties.map((f) => (<SelectItem key={f.id} value={f.id}>Students of {f.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Admission No.</TableHead><TableHead>Phone No.</TableHead><TableHead>Remarks</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-12 w-full" /></TableCell></TableRow>))
                ) : filteredStudents.length > 0 ? (
                  filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <Avatar><AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${student.name}`} /><AvatarFallback><UserIcon className="h-4 w-4" /></AvatarFallback></Avatar>
                          <div className="flex items-center gap-2">
                            <span>{student.name}</span>
                            {/* --- CORRECTED LOGIC FOR RED DOT --- */}
                            {isFeePending(student.remarks) && <div className="h-2 w-2 rounded-full bg-red-500" title="Fee Pending"/>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{student.admission_number}</TableCell>
                      <TableCell>{student.phone_number}</TableCell>
                      <TableCell style={getRemarkStyles(student.remarks)} className="max-w-xs truncate" title={student.remarks}>{student.remarks || "-"}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewBatches(student)}><Eye className="mr-2 h-4 w-4" />View Batches</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(student)}><Edit className="mr-2 h-4 w-4" />Edit Student</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-500" onClick={() => deleteStudent(student.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (<TableRow><TableCell colSpan={5} className="text-center h-24">No students found.</TableCell></TableRow>)}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <StudentDialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen} onSave={(data) => saveStudent(data, selectedStudent?.id)} student={selectedStudent} />
      <StudentBatchesDialog open={isBatchesDialogOpen} onOpenChange={setIsBatchesDialogOpen} student={selectedStudent} batches={batches} />
    </div>
  );
}