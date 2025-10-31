import { useState, useMemo } from "react";
import { Plus, Search, Edit, Trash2, Eye, MoreVertical } from "lucide-react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Skeleton } from "../components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Toaster } from "../components/ui/sonner";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "../components/ui/pagination";
import { useStudentData } from "../hooks/useStudentData";
import  StudentDialog  from "../components/student/StudentDialog";
import { StudentBatchesDialog } from "../components/student/StudentBatchesDialog";
import type { Student } from "../types/studentManagement"; // Assumes FacultyStudentCount is in this file
import { Checkbox } from "../components/ui/checkbox";

// --- Standardized Helper Functions ---
// (These functions are unchanged)

const parseFlexibleDate = (dateString: string): Date | null => {
    if (!dateString) return null;
    const normalizedStr = dateString.toLowerCase().trim().replace(/(?:st|nd|rd|th)/g, "");
    const monthMap: { [key: string]: number } = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11, january: 0, february: 1, march: 2, april: 3, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11 };
    let match;
    const regexTextMonth = /(\d{1,2})\s+([a-z]{3,})[\s,]*(\d{4})?/;
    match = normalizedStr.match(regexTextMonth);
    if (match) {
        const day = parseInt(match[1], 10);
        const month = monthMap[match[2]];
        const year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
        if (month !== undefined && !isNaN(day)) return new Date(Date.UTC(year, month, day));
    }
    const regexNumeric = /(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})/;
    match = normalizedStr.match(regexNumeric);
    if (match) {
        const part1 = parseInt(match[1], 10), part2 = parseInt(match[2], 10);
        let year = parseInt(match[3], 10);
        if (year < 100) {
            year += 2000;
        }
        let day: number, month: number;
        if (part2 > 12 && part1 <= 12) { day = part2; month = part1 - 1; }
        else { day = part1; month = part2 - 1; }
        if (!isNaN(day) && month >= 0 && month < 12 && !isNaN(year)) {
            const d = new Date(Date.UTC(year, month, day));
            if (d.getUTCFullYear() === year && d.getUTCMonth() === month && d.getUTCDate() === day) return d;
        }
    }
    const parsedDate = new Date(dateString);
    if (!isNaN(parsedDate.getTime())) return new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()));
    return null;
};


const isFeePending = (remark: string): boolean => {
  if (!remark) return false;
  const lowerCaseRemark = remark.toLowerCase().trim();
  const fullPaidRegex = /full(y)?\s*paid/;
  if (fullPaidRegex.test(lowerCaseRemark)) return false;
  const parsedDate = parseFlexibleDate(remark);
  if (!parsedDate) return true; // Treat as pending if date is unparsable but not marked as paid
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return parsedDate <= today;
};

const getRemarkStyles = (remark: string): React.CSSProperties => {
  if (isFeePending(remark)) return { color: "red", fontWeight: "bold" };
  const fullPaidRegex = /full(y)?\s*paid/;
  if (remark && fullPaidRegex.test(remark.toLowerCase())) return { color: "green", fontWeight: "bold" };
  return {};
};

const formatPhoneNumber = (phone: string): string => {
    if (!phone || typeof phone !== 'string') return 'N/A';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) return `+91 ${cleaned.substring(0, 5)} ${cleaned.substring(5)}`;
    if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned.substring(0, 2)} ${cleaned.substring(2, 7)} ${cleaned.substring(7)}`;
    return phone;
};

const getInitials = (name: string = ""): string => name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

export const formatFullDate = (dateString: string): string => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(date);
  } catch (error) {
    return "Invalid Date";
  }
};


// --- Main Component ---
export default function StudentManagement() {
  // --- 1. Get ALL state and setters from the hook ---
  const { 
    students, 
    totalCount, 
    loading, 
    faculties, 
    facultyCounts,
    saveStudent, 
    deleteStudent,
    searchTerm,
    setSearchTerm,
    facultyFilter,
    setFacultyFilter,
    feePendingFilter,
    setFeePendingFilter,
    unassignedFilter,
    setUnassignedFilter,
    currentPage,
    setCurrentPage,
    STUDENTS_PER_PAGE
  } = useStudentData();
  
  // --- 2. Remove all local state for filters ---
  const [isStudentDialogOpen, setIsStudentDialogOpen] = useState(false);
  const [isBatchesDialogOpen, setIsBatchesDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | undefined>(undefined);

  // --- 3. Remove client-side filtering ---
  // The 'students' array from the hook IS the filtered list.

  // --- 4. Memoize the faculty count map (for the dropdown) ---
  const facultyStudentCountMap = useMemo(() => {
    return new Map(
      (facultyCounts || []).map(fc => [fc.faculty_id, fc.total_students])
    );
  }, [facultyCounts]);

  // Create a total count for "All Faculties" from the counts array
  const allStudentsCount = useMemo(() => {
    // This sums up all students assigned to a faculty
    return (facultyCounts || []).reduce((sum, fc) => sum + fc.total_students, 0);
  }, [facultyCounts]);
  // --- END UPDATED SECTION ---

  // --- 5. Update Pagination Logic ---
  const totalPages = Math.ceil(totalCount / STUDENTS_PER_PAGE);
  const handlePageChange = (page: number) => { 
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page); 
    }
  };

  // Dialog handlers
  const handleAdd = () => { setSelectedStudent(undefined); setIsStudentDialogOpen(true); };
  const handleEdit = (student: Student) => { setSelectedStudent(student); setIsStudentDialogOpen(true); };
  const handleViewBatches = (student: Student) => { setSelectedStudent(student); setIsBatchesDialogOpen(true); };

  // Actions menu component
  const ActionsMenu = ({ student }: { student: Student }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleViewBatches(student)}><Eye className="mr-2 h-4 w-4" />View Batches</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleEdit(student)}><Edit className="mr-2 h-4 w-4" />Edit Student</DropdownMenuItem>
        <DropdownMenuItem className="text-red-500" onClick={() => deleteStudent(student.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <Toaster richColors />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Student Management</h1>
          <p className="text-muted-foreground">Search, manage, and view student details and enrollments.</p>
        </div>
        <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-2" />Add Student</Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          {/* 6. Use totalCount from the hook */}
          <CardDescription>Found {totalCount} total students.</CardDescription>
        </CardHeader>
        <CardContent>
          {/* 7. Wire all inputs to the hook's state and setters */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            <div className="relative flex-grow sm:flex-grow-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name or admission no..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-8 sm:w-[300px]" 
              />
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox 
                  id="fee_pending" 
                  checked={feePendingFilter} 
                  onCheckedChange={(checked) => setFeePendingFilter(Boolean(checked))} 
                />
                <label htmlFor="fee_pending" className="text-sm font-medium leading-none">
                    Fee Pending
                </label>
            </div>
            <div className="flex items-center space-x-2">
                <Checkbox 
                  id="unassigned" 
                  checked={unassignedFilter} 
                  onCheckedChange={(checked) => setUnassignedFilter(Boolean(checked))} 
                />
                <label htmlFor="unassigned" className="text-sm font-medium leading-none">
                    Not in any Batch
                </label>
            </div>
            
            <Select 
              value={facultyFilter} 
              onValueChange={setFacultyFilter}
            >
              <SelectTrigger className="w-full sm:w-[280px]"><SelectValue placeholder="Filter by Faculty..." /></SelectTrigger>
              <SelectContent>
                {/* Use the calculated 'allStudentsCount' for the total */}
                <SelectItem value="all">All Faculties ({allStudentsCount})</SelectItem>
                {faculties.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    Students of {f.name} ({facultyStudentCountMap.get(f.id) || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border">
            <Table className="md:w-auto min-w-full">
              <TableHeader className="hidden md:table-header-group">
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Phone No.</TableHead>
                  <TableHead>Remarks</TableHead>
                  <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* 8. Iterate over 'students' from the hook, not 'paginatedStudents' */}
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-20 w-full" /></TableCell></TableRow>))
                ) : students.length > 0 ? (
                  students.map((student) => (
                    <TableRow key={student.id} className="block border-b mb-4 last:mb-0 last:border-b-0 md:table-row md:border-b md:mb-0">
                      <TableCell className="flex justify-between items-center p-4 font-medium md:table-cell">
                        <div className="flex items-center gap-3">
                          <Avatar><AvatarFallback>{getInitials(student.name)}</AvatarFallback></Avatar>
                          <div>
                            <p className="font-semibold text-base flex items-center gap-2">
                              {student.name}
                              {isFeePending(student.remarks) && <span className="h-2.5 w-2.5 block rounded-full bg-red-500" title="Fee Pending"/>}
                            </p>
                            <p className="text-sm text-muted-foreground">{student.admission_number}</p>
                          </div>
                        </div>
                        <div className="md:hidden"><ActionsMenu student={student} /></div>
                      </TableCell>
                      <TableCell className="block p-4 pt-2 md:pt-4 text-right before:content-['Phone_No:'] before:float-left before:font-bold md:table-cell md:text-left md:before:content-['']">
                        {formatPhoneNumber(student.phone_number)}
                      </TableCell>
                      <TableCell className="block p-4 pt-2 md:pt-4 text-right before:content-['Remarks:'] before:float-left before:font-bold md:table-cell md:text-left md:before:content-['']" style={getRemarkStyles(student.remarks)}>
                        <span className="truncate" title={student.remarks}>{student.remarks || "-"}</span>
                      </TableCell>
                      <TableCell className="hidden text-right md:table-cell">
                        <ActionsMenu student={student} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={4} className="text-center h-24">No students found.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* 9. Wire Pagination to hook state and totalPages */}
          {totalPages > 1 && (
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }} 
                      aria-disabled={currentPage === 1} 
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : ""} 
                    />
                  </PaginationItem>
                  
                  {/* Note: This pagination UI is not ideal for many pages, but it matches your code */}
                  {[...Array(totalPages)].map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); handlePageChange(i + 1); }} 
                        isActive={currentPage === i + 1}
                      >
                        {i + 1}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  
                  <PaginationItem>
                    <PaginationNext 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }} 
                      aria-disabled={currentPage === totalPages} 
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""} 
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs use the hook's save/delete functions */}
      <StudentDialog open={isStudentDialogOpen} onOpenChange={setIsStudentDialogOpen} onSave={(data) => saveStudent(data, selectedStudent?.id)} student={selectedStudent} />
      <StudentBatchesDialog open={isBatchesDialogOpen} onOpenChange={setIsBatchesDialogOpen} student={selectedStudent} />
    </div>
  );
}