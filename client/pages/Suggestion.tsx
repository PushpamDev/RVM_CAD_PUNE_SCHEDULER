import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHeader, TableHead, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { API_BASE_URL } from "@/lib/api";
import { CheckCircle, Clock } from "lucide-react";

// --- Interfaces ---
interface Skill {
  id: string;
  name: string;
}
interface TimeSlot {
  start: string;
  end: string;
}
interface FacultySuggestion {
  id: number;
  name: string;
  commonSlots: TimeSlot[];
  status: 'available' | 'available_other_times';
}

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// --- Main Component ---
export default function Suggestion() {
    const [skills, setSkills] = useState<Skill[]>([]);
    const [suggestions, setSuggestions] = useState<FacultySuggestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [formState, setFormState] = useState({
        skillId: "",
        startDate: "",
        endDate: "",
        startTime: "", // Added back
        endTime: "",   // Added back
        selectedDays: new Set<string>(),
    });

    useEffect(() => {
        const fetchSkills = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/skills`);
                setSkills(await response.json());
            } catch (error) { console.error("Error fetching skills:", error); }
        };
        fetchSkills();
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormState(prev => ({ ...prev, [e.target.id]: e.target.value }));
    };
    const handleSelectChange = (value: string) => {
        setFormState(prev => ({ ...prev, skillId: value }));
    };
    const handleDayChange = (day: string) => {
        setFormState(prev => {
            const newSelectedDays = new Set(prev.selectedDays);
            newSelectedDays.has(day) ? newSelectedDays.delete(day) : newSelectedDays.add(day);
            return { ...prev, selectedDays: newSelectedDays };
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setSuggestions([]);
        try {
            const requestBody = {
                ...formState,
                daysOfWeek: Array.from(formState.selectedDays),
            };
            const response = await fetch(`${API_BASE_URL}/api/suggestions/suggest-faculty`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });
            if (!response.ok) throw new Error('Failed to fetch suggestions');
            const data = await response.json();
            setSuggestions(data.suggestions);
        } catch (error) {
            console.error("Error fetching suggestions:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    // Separate suggestions into two groups for rendering
    const availableNow = suggestions.filter(s => s.status === 'available');
    const availableLater = suggestions.filter(s => s.status === 'available_other_times');

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight">Faculty Suggestion</h1>
            <Card>
                <CardHeader>
                    <CardTitle>Find Available Faculty</CardTitle>
                    <CardDescription>Enter batch details to find the best faculty. Time is optional.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="skillId">Subject/Skill</Label>
                                <Select onValueChange={handleSelectChange} value={formState.skillId}><SelectTrigger><SelectValue placeholder="Select a skill" /></SelectTrigger><SelectContent>{skills.map(skill => (<SelectItem key={skill.id} value={skill.id}>{skill.name}</SelectItem>))}</SelectContent></Select>
                            </div>
                             <div className="space-y-2 md:col-span-2">
                                <Label>Days of the Week</Label>
                                <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">{daysOfWeek.map(day => (<div key={day} className="flex items-center space-x-2"><Checkbox id={day} checked={formState.selectedDays.has(day)} onCheckedChange={() => handleDayChange(day)} /><Label htmlFor={day} className="font-normal">{day}</Label></div>))}</div>
                            </div>
                            <div className="space-y-2"><Label htmlFor="startDate">Start Date</Label><Input id="startDate" type="date" value={formState.startDate} onChange={handleInputChange} /></div>
                            <div className="space-y-2"><Label htmlFor="endDate">End Date</Label><Input id="endDate" type="date" value={formState.endDate} onChange={handleInputChange} /></div>
                            <div className="space-y-2"><Label htmlFor="startTime">Start Time (Optional)</Label><Input id="startTime" type="time" value={formState.startTime} onChange={handleInputChange} /></div>
                            <div className="space-y-2"><Label htmlFor="endTime">End Time (Optional)</Label><Input id="endTime" type="time" value={formState.endTime} onChange={handleInputChange} /></div>
                        </div>
                        <Button type="submit" disabled={isLoading}>{isLoading ? "Calculating..." : "Find Faculty"}</Button>
                    </form>
                </CardContent>
            </Card>

            {/* --- MODIFIED RESULTS SECTION --- */}
            {suggestions.length > 0 && (
                <div className="space-y-6">
                    {/* Section for Directly Available Faculty */}
                    {availableNow.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-green-600"><CheckCircle size={20}/> Available for Requested Time</CardTitle>
                                <CardDescription>These faculty are free during the time you specified.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead>Faculty Name</TableHead>{!formState.startTime && <TableHead>Available Slots</TableHead>}</TableRow></TableHeader>
                                    <TableBody>
                                        {availableNow.map(faculty => (
                                            <TableRow key={faculty.id}>
                                                <TableCell className="font-medium">{faculty.name}</TableCell>
                                                {!formState.startTime && (
                                                    <TableCell><div className="flex flex-wrap gap-2">{faculty.commonSlots.map((slot, index) => (<Badge key={index} variant="secondary">{slot.start} - {slot.end}</Badge>))}</div></TableCell>
                                                )}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}

                    {/* Section for Other Suggestions */}
                    {availableLater.length > 0 && (
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-blue-600"><Clock size={20}/> Other Suggestions</CardTitle>
                                <CardDescription>These faculty are qualified but available at different times on the selected days.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader><TableRow><TableHead className="w-[200px]">Faculty Name</TableHead><TableHead>Common Available Slots</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {availableLater.map(faculty => (
                                            <TableRow key={faculty.id} className="align-top">
                                                <TableCell className="font-medium">{faculty.name}</TableCell>
                                                <TableCell><div className="flex flex-wrap gap-2">{faculty.commonSlots.map((slot, index) => (<Badge key={index} variant="secondary">{slot.start} - {slot.end}</Badge>))}</div></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
