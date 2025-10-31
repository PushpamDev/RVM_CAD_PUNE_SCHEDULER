import React, { useState, useEffect, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { MoreVertical, Users, UserCheck, Edit, Trash2, SearchX, Shuffle, CalendarDays } from "lucide-react";
import { useAuth } from '../hooks/AuthContext';
import { StudentListDialog } from './StudentListDialog';
import { AttendanceDialog } from './AttendanceDialog';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/lib/api';
import type { Batch, Student, Faculty, AssignSubstitutePayload, CreateSubstitutionPayload } from '../types/batchManagement';

// --- Helper Functions ---
// (Unchanged - formatDisplayDate, parseFlexibleDate, isFeePending)
const formatDisplayDate = (dateString: string): string => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
};

const parseFlexibleDate = (dateString: string): Date | null => {
    // ... (logic unchanged)
    if (!dateString) return null;
    const normalizedStr = dateString.toLowerCase().trim().replace(/(?:st|nd|rd|th)/g, "");
    const monthMap: { [key: string]: number } = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11, january: 0, february: 1, march: 2, april: 3, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11 };
    let match;
    const regexTextMonth = /(\d{1,2})\s+([a-z]{3,})\s*(\d{4})?/;
    match = normalizedStr.match(regexTextMonth);
    if (match) {
        const day = parseInt(match[1], 10), month = monthMap[match[2]], year = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();
        if (month !== undefined && !isNaN(day)) return new Date(Date.UTC(year, month, day));
    }
    const regexNumeric = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/;
    match = normalizedStr.match(regexNumeric);
    if (match) {
        const part1 = parseInt(match[1], 10), part2 = parseInt(match[2], 10), year = parseInt(match[3], 10);
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
  // ... (logic unchanged)
  if (!remark) return false;
  const lowerCaseRemark = remark.toLowerCase().trim();
  const fullPaidRegex = /full(y)?\s*paid/;
  if (fullPaidRegex.test(lowerCaseRemark)) return false;
  const parsedDate = parseFlexibleDate(remark);
  if (!parsedDate) return false; 
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return parsedDate <= today;
};


const getDynamicBatchStatus = (startDateStr: string, endDateStr: string): "active" | "upcoming" | "completed" => {
  // ... (logic unchanged)
  if (!startDateStr || !endDateStr) return "upcoming";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(startDateStr);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(endDateStr);
  endDate.setHours(0, 0, 0, 0);
  if (today < startDate) return "upcoming";
  if (today > endDate) return "completed";
  return "active";
};

const getStudentsForListView = (students: Student[]): (Student & { isFeePending: boolean })[] => {
  // ... (logic unchanged)
  if (!students || !Array.isArray(students)) return [];
  return students.map(student => ({
    ...student,
    isFeePending: isFeePending(student.remarks),
  }));
};

// --- NEW: Helper function to sort batches by time ---
/**
 * Converts "HH:mm" time string to a sortable number.
 * e.g., "10:00" -> 1000, "09:30" -> 930
 */
const timeToNumber = (timeStr: string): number => {
    if (!timeStr) return 9999; // Sort batches with no time last
    try {
        const [hours, minutes] = timeStr.split(':').map(Number);
        return hours * 100 + minutes;
    } catch {
        return 9999; // Fallback for invalid format
    }
};

// --- Dialogs (Unchanged) ---
function AssignSubstituteDialog({ open, onOpenChange, batch, allFaculties, onAssign }: { /* ...props */ }) {
  // ... (Component code unchanged)
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const availableSubstitutes = useMemo(() => {
    if (!batch) return [];
    const currentFacultyId = batch.original_faculty?.id || batch.faculty_id;
    return (allFaculties || []).filter(f => f.id !== currentFacultyId);
  }, [allFaculties, batch]);
  useEffect(() => { if (open) setSelectedFacultyId(''); }, [open]);
  const handleSubmit = async () => {
    if (!batch || !selectedFacultyId) { toast.error("Please select a substitute faculty."); return; }
    setIsSaving(true);
    await onAssign({ batchId: batch.id, facultyId: selectedFacultyId });
    setIsSaving(false);
  };
  if (!batch) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Permanent Reassignment for "{batch.name}"</DialogTitle>
          <DialogDescription>Current Faculty: <strong>{batch.faculty?.name || 'N/A'}</strong>. Choose a new permanent faculty.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4"><div className="space-y-2"><Label htmlFor="substitute-faculty">New Faculty</Label><Select onValueChange={setSelectedFacultyId} value={selectedFacultyId}><SelectTrigger id="substitute-faculty"><SelectValue placeholder="Select a faculty..." /></SelectTrigger><SelectContent>{availableSubstitutes.length > 0 ? availableSubstitutes.map(faculty => (<SelectItem key={faculty.id} value={faculty.id}>{faculty.name}</SelectItem>)) : (<SelectItem value="none" disabled>No other faculties available</SelectItem>)}</SelectContent></Select></div></div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button><Button onClick={handleSubmit} disabled={isSaving || !selectedFacultyId}>{isSaving ? "Assigning..." : "Confirm Assignment"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleLeaveDialog({ open, onOpenChange, batch, allFaculties, onSchedule }: { /* ...props */ }) {
  // ... (Component code unchanged)
  const [substituteFacultyId, setSubstituteFacultyId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const availableSubstitutes = useMemo(() => {
    if (!batch) return [];
    const originalFacultyId = batch.original_faculty?.id || batch.faculty_id;
    return (allFaculties || []).filter(f => f.id !== originalFacultyId);
  }, [allFaculties, batch]);
  useEffect(() => { if (open) { setSubstituteFacultyId(''); setStartDate(''); setEndDate(''); setNotes(''); } }, [open]);
  const handleSubmit = async () => {
    if (!batch || !substituteFacultyId || !startDate || !endDate) { toast.error("Please fill all required fields: Substitute, Start Date, and End Date."); return; }
    setIsSaving(true);
    await onSchedule({ batchId: batch.id, substituteFacultyId, startDate, endDate, notes });
    setIsSaving(false);
  };
  if (!batch) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule Temporary Leave for "{batch.name}"</DialogTitle>
          <DialogDescription>Original Faculty: <strong>{batch.original_faculty?.name || batch.faculty.name}</strong>. Choose a substitute and date range.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label htmlFor="sub-faculty">Substitute Faculty</Label><Select onValueChange={setSubstituteFacultyId} value={substituteFacultyId}><SelectTrigger id="sub-faculty"><SelectValue placeholder="Select a substitute..." /></SelectTrigger><SelectContent>{availableSubstitutes.map(f => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="start-date">Start Date</Label><Input id="start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} /></div><div className="space-y-2"><Label htmlFor="end-date">End Date</Label><Input id="end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} /></div></div>
          <div className="space-y-2"><Label htmlFor="notes">Notes (Optional)</Label><Textarea id="notes" placeholder="e.g., On medical leave" value={notes} onChange={e => setNotes(e.target.value)} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button><Button onClick={handleSubmit} disabled={isSaving || !substituteFacultyId || !startDate || !endDate}>{isSaving ? "Scheduling..." : "Confirm Schedule"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// --- Props Interface ---
interface BatchTableProps {
  batches: Batch[];
  loading: boolean;
  filters: { searchTerm: string; selectedDate: string; selectedFaculty: string; statusFilter: string };
  allFaculties: Faculty[];
  onEditBatch: (batch: Batch) => void;
  onDeleteBatch: (batchId: string) => void;
  onUpdateRemarks: (studentId: string, remarks: string) => void;
  onAttendanceMarked: () => void;
  refetchData: () => void;
}

export function BatchTable({ batches, loading, filters, allFaculties, onEditBatch, onDeleteBatch, onUpdateRemarks, onAttendanceMarked, refetchData }: BatchTableProps) {
    const { user, token } = useAuth();
    const [currentPage, setCurrentPage] = useState(1);
    
    // ... (State for dialogs is unchanged)
    const [studentListBatch, setStudentListBatch] = useState<Batch | null>(null);
    const [attendanceBatch, setAttendanceBatch] = useState<Batch | null>(null);
    const [permanentReassignmentBatch, setPermanentReassignmentBatch] = useState<Batch | null>(null);
    const [temporaryLeaveBatch, setTemporaryLeaveBatch] = useState<Batch | null>(null);
    
    const [studentsForDialog, setStudentsForDialog] = useState<Student[]>([]);
    const [isStudentListLoading, setIsStudentListLoading] = useState(false);

    const BATCHES_PER_PAGE = 10;

    const getStatusVariant = (status: "active" | "upcoming" | "completed"): "default" | "secondary" | "outline" => {
        if (status === 'active') return 'default';
        if (status === 'upcoming') return 'secondary';
        return 'outline';
    };
    
    // --- THIS IS THE FIX ---
    // Updated filtering and sorting logic
    const filteredBatches = useMemo(() => {
        if (!user || !batches) return [];

        let processedBatches = [...batches];

        // --- Role-based Filtering ---
        if (user.role === 'admin') {
            // Admin filters (unchanged)
            if (filters.statusFilter !== 'all') {
                processedBatches = processedBatches.filter(batch => getDynamicBatchStatus(batch.start_date, batch.end_date) === filters.statusFilter);
            }
            if (filters.selectedFaculty !== 'all') {
                processedBatches = processedBatches.filter(batch => batch.faculty_id === filters.selectedFaculty);
            }
        } else { 
            // --- Faculty Filters (MODIFIED) ---
            // 1. Filter for the faculty's batches (unchanged)
            processedBatches = processedBatches.filter(batch => 
                batch.faculty_id === user.id || batch.original_faculty?.id === user.id
            );
            
            // 2. NEW: Filter for ONLY "active" batches, as requested by user
            processedBatches = processedBatches.filter(batch => 
                getDynamicBatchStatus(batch.start_date, batch.end_date) === "active"
            );
        }

        // --- Common Filters (Unchanged) ---
        if (filters.selectedDate) {
            processedBatches = processedBatches.filter(batch => 
                new Date(batch.start_date) <= new Date(filters.selectedDate) && new Date(batch.end_date) >= new Date(filters.selectedDate)
            );
        }
        if (filters.searchTerm) {
            processedBatches = processedBatches.filter(batch => 
                batch.name.toLowerCase().includes(filters.searchTerm.toLowerCase())
            );
        }

        // --- NEW: Time-based Sorting for Faculty ---
        if (user.role === 'faculty') {
            processedBatches.sort((a, b) => 
                timeToNumber(a.start_time) - timeToNumber(b.start_time)
            );
        }
        
        return processedBatches;
    }, [batches, filters, user]); // Dependencies are correct
    
    const totalPages = Math.ceil(filteredBatches.length / BATCHES_PER_PAGE);
    const paginatedBatches = filteredBatches.slice((currentPage - 1) * BATCHES_PER_PAGE, currentPage * BATCHES_PER_PAGE);

    // ... (Rest of the component is unchanged)
    const handlePageChange = (page: number) => { if (page > 0 && page <= totalPages) setCurrentPage(page); };
    useEffect(() => { 
        const newTotalPages = Math.ceil(filteredBatches.length / BATCHES_PER_PAGE);
        if (currentPage > newTotalPages && newTotalPages > 0) {
            setCurrentPage(1); 
        } else if (filteredBatches.length === 0) {
            setCurrentPage(1);
        }
    }, [filteredBatches.length, BATCHES_PER_PAGE, currentPage]);

    const handleViewStudentsClick = async (batch: Batch) => {
        setStudentListBatch(batch);
        setIsStudentListLoading(true);
        setStudentsForDialog([]);
        try {
            const response = await fetch(`${API_BASE_URL}/api/batches/${batch.id}/students`, { headers: { Authorization: `Bearer ${token}` } });
            if (!response.ok) throw new Error("Failed to fetch student list.");
            const data = await response.json();
            setStudentsForDialog(data);
        } catch (error: any) {
            toast.error("Error", { description: error.message });
            setStudentListBatch(null);
        } finally {
            setIsStudentListLoading(false);
        }
    };

    const handlePermanentReassignment = async (payload: AssignSubstitutePayload) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/substitution/assign`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload),
        });
        if (!response.ok) throw new Error(await response.json().then(e => e.error || 'Reassignment failed'));
        toast.success("Faculty permanently reassigned.");
        setPermanentReassignmentBatch(null);
        refetchData();
      } catch (error: any) { toast.error('Reassignment Failed', { description: error.message }); }
    };

    const handleCreateTemporarySubstitution = async (payload: CreateSubstitutionPayload) => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/substitution/temporary`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(payload),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Failed to schedule leave.');
        toast.success("Temporary leave scheduled successfully.");
        setTemporaryLeaveBatch(null);
        refetchData();
      } catch (error: any) { toast.error('Scheduling Failed', { description: error.message }); }
    };

    if (loading) {
        return <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>;
    }

    return (
        <TooltipProvider>
          <div className="rounded-md border">
              <Table>
                  <TableHeader><TableRow><TableHead>Batch & Students</TableHead><TableHead>Skill</TableHead><TableHead>Status</TableHead><TableHead>Faculty</TableHead><TableHead>Schedule & Duration</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                  <TableBody>
                      {paginatedBatches.length > 0 ? paginatedBatches.map((batch) => {
                          const dynamicStatus = getDynamicBatchStatus(batch.start_date, batch.end_date);
                          return (
                              <TableRow key={batch.id}>
                                  <TableCell><div className="font-medium">{batch.name}</div><div className="text-sm text-muted-foreground">{batch.students} / {batch.max_students} Students</div></TableCell>
                                  <TableCell>{batch.skill?.name || 'N/A'}</TableCell>
                                  <TableCell><Badge variant={getStatusVariant(dynamicStatus)} className="capitalize">{dynamicStatus}</Badge></TableCell>
                                  <TableCell>
                                    {batch.isSubstituted ? (
                                      <Tooltip><TooltipTrigger asChild><div className="flex items-center gap-2 text-orange-600 font-semibold"><Shuffle className="h-4 w-4" /><span>{batch.faculty?.name || 'N/A'}</span></div></TooltipTrigger><TooltipContent><p>Original: {batch.original_faculty?.name || 'Unknown'}</p></TooltipContent></Tooltip>
                                    ) : ( <span>{batch.faculty?.name || 'N/A'}</span> )}
                                  </TableCell>
                                  <TableCell><div className="font-medium">{`${batch.start_time} - ${batch.end_time}`}</div><div className="text-sm text-muted-foreground">{`${formatDisplayDate(batch.start_date)} to ${formatDisplayDate(batch.end_date)}`}</div></TableCell>
                                  <TableCell className="text-right">
                                      <DropdownMenu>
                                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                          <DropdownMenuContent align="end">
                                              <DropdownMenuItem onClick={() => handleViewStudentsClick(batch)}><Users className="mr-2 h-4 w-4" />View Students</DropdownMenuItem>
                                              <DropdownMenuItem onClick={() => setAttendanceBatch(batch)}><UserCheck className="mr-2 h-4 w-4" />Mark Attendance</DropdownMenuItem>
                                              {user?.role === 'admin' && <>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem onClick={() => onEditBatch(batch)}><Edit className="mr-2 h-4 w-4" />Edit Batch</DropdownMenuItem>
                                                  <DropdownMenuItem onClick={() => setTemporaryLeaveBatch(batch)}><CalendarDays className="mr-2 h-4 w-4" />Schedule Temporary Leave</DropdownMenuItem>
                                                  <DropdownMenuItem onClick={() => setPermanentReassignmentBatch(batch)}><Shuffle className="mr-2 h-4 w-4" />Permanent Reassignment</DropdownMenuItem>
                                                  <DropdownMenuSeparator />
                                                  <DropdownMenuItem className="text-red-500" onClick={() => onDeleteBatch(batch.id)}><Trash2 className="mr-2 h-4 w-4" />Delete Batch</DropdownMenuItem>
                                              </>}
                                          </DropdownMenuContent>
                                      </DropdownMenu>
                                  </TableCell>
                              </TableRow>
                          );
                      }) : (
                        <TableRow><TableCell colSpan={6} className="h-48 text-center"><div className="flex flex-col items-center justify-center gap-2"><SearchX className="h-12 w-12 text-muted-foreground" /><h3 className="text-lg font-semibold">No Batches Found</h3><p className="text-sm text-muted-foreground">
                            {user?.role === 'faculty' ? "You have no active batches matching the filters." : "Try adjusting your search or filter criteria."}
                        </p></div></TableCell></TableRow>
                      )}
                  </TableBody>
              </Table>
          </div>
          
          {totalPages > 1 && ( 
            <div className="mt-4">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage - 1); }} aria-disabled={currentPage === 1} className={currentPage === 1 ? "pointer-events-none opacity-50" : undefined} />
                  </PaginationItem>
                  {[...Array(totalPages)].map((_, i) => (
                    <PaginationItem key={i}>
                      <PaginationLink href="#" onClick={(e) => { e.preventDefault(); handlePageChange(i + 1); }} isActive={currentPage === i + 1}>{i + 1}</PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext href="#" onClick={(e) => { e.preventDefault(); handlePageChange(currentPage + 1); }} aria-disabled={currentPage === totalPages} className={currentPage === totalPages ? "pointer-events-none opacity-50" : undefined} />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div> 
          )}

          <StudentListDialog 
              open={!!studentListBatch}
              onOpenChange={(isOpen) => !isOpen && setStudentListBatch(null)}
              batchName={studentListBatch?.name || ''} 
              students={getStudentsForListView(studentsForDialog)} 
              onUpdateRemarks={onUpdateRemarks}
              isFeePending={isFeePending}
              loading={isStudentListLoading}
          /> 
          
          <AttendanceDialog 
              open={!!attendanceBatch}
              onOpenChange={(isOpen) => !isOpen && setAttendanceBatch(null)}
              batch={attendanceBatch} 
              onAttendanceMarked={() => { setAttendanceBatch(null); onAttendanceMarked(); }} 
              isFeePending={isFeePending} 
          /> 

          <AssignSubstituteDialog 
              open={!!permanentReassignmentBatch} 
              onOpenChange={(isOpen) => !isOpen && setPermanentReassignmentBatch(null)} 
              batch={permanentReassignmentBatch} 
              allFaculties={allFaculties} 
              onAssign={handlePermanentReassignment} 
          />

          <ScheduleLeaveDialog 
              open={!!temporaryLeaveBatch} 
              onOpenChange={(isOpen) => !isOpen && setTemporaryLeaveBatch(null)} 
              batch={temporaryLeaveBatch} 
              allFaculties={allFaculties} 
              onSchedule={handleCreateTemporarySubstitution} 
          />
        </TooltipProvider>
    );
}