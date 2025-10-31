import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { API_BASE_URL } from "@/lib/api";
import { CheckCircle, Clock, Search, ListX, PlusCircle, CalendarDays } from "lucide-react";
import { ConfirmBatchDialog } from "@/components/ConfirmBatchDialog";
import { FacultySchedulePreviewDialog } from "../components/FacultySchedulePreviewDialog";

// --- Interfaces ---
interface Skill {
  id: string;
  name: string;
}
interface TimeSlot {
  start: string;
  end: string;
}
export interface FacultySuggestion {
  facultyId: string;
  name: string;
  commonSlots: TimeSlot[];
  status: 'available' | 'available_other_times';
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// --- Helper & Placeholder Components ---
const SuggestionSkeleton = () => ( <div className="space-y-6"> <Card> <CardHeader><Skeleton className="h-7 w-1/2" /></CardHeader> <CardContent className="space-y-2"> <Skeleton className="h-10 w-full" /> <Skeleton className="h-10 w-full" /> </CardContent> </Card> <Card> <CardHeader><Skeleton className="h-7 w-1/2" /></CardHeader> <CardContent className="space-y-2"> <Skeleton className="h-10 w-full" /> </CardContent> </Card> </div> );
const SuggestionPlaceholder = ({ icon, title, message }: { icon: React.ReactNode, title: string, message: string }) => ( <Card className="flex items-center justify-center py-20"> <div className="text-center text-muted-foreground"> {icon} <h3 className="mt-4 text-lg font-semibold">{title}</h3> <p className="mt-2 text-sm">{message}</p> </div> </Card> );

// --- Main Component ---
export default function Suggestion() {
    const { toast } = useToast();
    const [skills, setSkills] = useState<Skill[]>([]);
    const [suggestions, setSuggestions] = useState<FacultySuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);
    
    // State for Dialogs
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
    const [selectedSuggestion, setSelectedSuggestion] = useState<FacultySuggestion | null>(null);

    const [formState, setFormState] = useState({
        skillId: "",
        startDate: "",
        endDate: "",
        startTime: "",
        endTime: "",
        selectedDays: [] as string[],
    });

    useEffect(() => {
        const fetchSkills = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/skills`);
                if (!response.ok) throw new Error("Failed to load skills.");
                setSkills(await response.json());
            } catch (error) {
                console.error("Error fetching skills:", error);
                toast({ variant: "destructive", title: "Error", description: "Could not fetch skills list." });
            }
        };
        fetchSkills();
    }, [toast]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormState(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };

    const isFormValid = formState.skillId && formState.startDate && formState.endDate && formState.selectedDays.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (new Date(formState.endDate) < new Date(formState.startDate)) {
            toast({ variant: "destructive", title: "Invalid Date Range", description: "End date cannot be before the start date." });
            return;
        }
        if (formState.startTime && formState.endTime && formState.endTime <= formState.startTime) {
            toast({ variant: "destructive", title: "Invalid Time Range", description: "End time must be after the start time." });
            return;
        }
        setIsLoading(true);
        setHasSearched(true);
        setSuggestions([]);
        try {
            const response = await fetch(`${API_BASE_URL}/api/suggestions/suggest-faculty`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formState, daysOfWeek: formState.selectedDays }),
            });
            if (!response.ok) throw new Error('Failed to fetch suggestions');
            const data = await response.json();
            const formattedSuggestions = data.suggestions.map((s: any) => ({...s, facultyId: String(s.facultyId)}));
            setSuggestions(formattedSuggestions);
        } catch (error) {
            console.error("Error fetching suggestions:", error);
            toast({ variant: "destructive", title: "Search Failed", description: "An error occurred while fetching suggestions." });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleQuickCreate = (faculty: FacultySuggestion) => {
        setSelectedSuggestion(faculty);
        setConfirmDialogOpen(true);
    };

    const handleViewSchedule = (faculty: FacultySuggestion) => {
        setSelectedSuggestion(faculty);
        setPreviewDialogOpen(true);
    };

    const renderResults = () => {
        if (isLoading) return <SuggestionSkeleton />;
        if (!hasSearched) return <SuggestionPlaceholder icon={<Search size={48} />} title="Find the Perfect Faculty" message="Fill out the form above to get started." />;
        if (suggestions.length === 0) return <SuggestionPlaceholder icon={<ListX size={48} />} title="No Suggestions Found" message="Try adjusting your criteria or broadening your search." />;

        const availableNow = suggestions.filter(s => s.status === 'available');
        const availableLater = suggestions.filter(s => s.status === 'available_other_times');
        
        return (
            <div className="space-y-6">
                {availableNow.length > 0 && (
                    <Card className="border-green-200 dark:border-green-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-green-600"><CheckCircle size={20}/> Available for Requested Time</CardTitle>
                            <CardDescription>These faculty are qualified and available during the exact time you specified.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Faculty Name</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {availableNow.map(faculty => (
                                        <TableRow key={faculty.facultyId}>
                                            <TableCell className="font-medium">{faculty.name}</TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" onClick={() => handleQuickCreate(faculty)}><PlusCircle className="mr-2 h-4 w-4"/> Quick Create</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
                 {availableLater.length > 0 && (
                     <Card className="border-blue-200 dark:border-blue-800">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-blue-600"><Clock size={20}/> Other Suggestions</CardTitle>
                            <CardDescription>These faculty are qualified but available at different times on the selected days.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader><TableRow><TableHead>Faculty Name</TableHead><TableHead>Common Available Slots</TableHead><TableHead className="text-right">Action</TableHead></TableRow></TableHeader>
                                <TableBody>
                                    {availableLater.map(faculty => (
                                        <TableRow key={faculty.facultyId}>
                                            <TableCell className="font-medium">{faculty.name}</TableCell>
                                            <TableCell><div className="flex flex-wrap gap-2">{faculty.commonSlots.map((slot, i) => (<Badge key={i} variant="secondary">{slot.start} - {slot.end}</Badge>))}</div></TableCell>
                                            <TableCell className="text-right">
                                                {/* --- MODIFICATION: "Create" button removed --- */}
                                                <Button variant="outline" size="sm" onClick={() => handleViewSchedule(faculty)}><CalendarDays className="mr-2 h-4 w-4" /> View Schedule</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}
            </div>
        );
    };

    const selectedSkillObject = skills.find(s => s.id === formState.skillId);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Faculty Suggestion Engine</h1>
                <p className="text-muted-foreground">Intelligently find the best available faculty for your next batch.</p>
            </div>
            <Card>
                 <CardHeader>
                    <CardTitle>Find Available Faculty</CardTitle>
                    <CardDescription>Enter batch requirements to get a list of suitable faculty members.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="skillId">Subject/Skill (Required)</Label>
                            <Select onValueChange={(value) => setFormState(p => ({ ...p, skillId: value }))} value={formState.skillId}><SelectTrigger><SelectValue placeholder="Select a skill" /></SelectTrigger><SelectContent>{skills.map(skill => (<SelectItem key={skill.id} value={skill.id}>{skill.name}</SelectItem>))}</SelectContent></Select>
                        </div>
                         <div className="space-y-2">
                            <Label>Days of the Week (Required)</Label>
                            <ToggleGroup type="multiple" value={formState.selectedDays} onValueChange={(days) => setFormState(p => ({...p, selectedDays: days}))} variant="outline" className="flex-wrap justify-start">
                                {daysOfWeek.map(day => (<ToggleGroupItem key={day} value={day}>{day}</ToggleGroupItem>))}
                            </ToggleGroup>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2"><Label htmlFor="startDate">Start Date (Required)</Label><Input id="startDate" type="date" value={formState.startDate} onChange={handleInputChange} /></div>
                            <div className="space-y-2"><Label htmlFor="endDate">End Date (Required)</Label><Input id="endDate" type="date" value={formState.endDate} onChange={handleInputChange} /></div>
                            <div className="space-y-2"><Label htmlFor="startTime">Start Time (Optional)</Label><Input id="startTime" type="time" value={formState.startTime} onChange={handleInputChange} /></div>
                            <div className="space-y-2"><Label htmlFor="endTime">End Time (Optional)</Label><Input id="endTime" type="time" value={formState.endTime} onChange={handleInputChange} /></div>
                        </div>
                        <Button type="submit" disabled={isLoading || !isFormValid}>{isLoading ? "Calculating..." : "Find Faculty"}</Button>
                    </form>
                </CardContent>
            </Card>

            {renderResults()}

            {selectedSuggestion && selectedSkillObject && (
                <ConfirmBatchDialog
                    open={confirmDialogOpen}
                    onOpenChange={setConfirmDialogOpen}
                    suggestion={selectedSuggestion}
                    formState={formState}
                    selectedSkill={selectedSkillObject}
                    onBatchCreated={() => {
                        setConfirmDialogOpen(false);
                    }}
                />
            )}
             {selectedSuggestion && (
                <FacultySchedulePreviewDialog
                    open={previewDialogOpen}
                    onOpenChange={setPreviewDialogOpen}
                    faculty={selectedSuggestion}
                    dateRange={{ from: new Date(formState.startDate), to: new Date(formState.endDate) }}
                />
            )}
        </div>
    );
}