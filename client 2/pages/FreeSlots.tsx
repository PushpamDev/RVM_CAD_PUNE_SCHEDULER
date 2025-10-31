import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Search, SlidersHorizontal, CalendarX } from "lucide-react";

import { API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/AuthContext";

// --- Type Definitions ---
interface Faculty {
  id: string;
  name: string;
}

interface Skill {
  id: string;
  name: string;
}

interface FreeSlot {
  faculty: Faculty;
  slots: { date: string; time: string[] }[];
}

// --- Helper Functions ---
const formatDisplayDate = (dateString: string): string => {
  const date = new Date(dateString.replace(/-/g, '\/'));
  return format(date, "EEEE, MMMM d, yyyy");
};

// --- Main Component ---
export default function FreeSlots() {
  const { toast } = useToast();
  const { token } = useAuth();

  // --- State Management ---
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [selectedFaculty, setSelectedFaculty] = useState<string>("");
  
  const [freeSlots, setFreeSlots] = useState<FreeSlot[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // --- Data Fetching ---
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [facultyRes, skillsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/faculty`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE_URL}/api/skills`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        if (!facultyRes.ok || !skillsRes.ok) throw new Error("Failed to fetch initial filter data.");
        
        const facultyData = await facultyRes.json();
        const skillsData = await skillsRes.json();
        setFaculties(Array.isArray(facultyData) ? facultyData : []);
        setSkills(Array.isArray(skillsData) ? skillsData : []);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load faculties and skills. Please try again later.",
        });
      } finally {
        setIsInitialLoading(false);
      }
    };
    fetchInitialData();
  }, [toast, token]);

  const handleSearch = async () => {
    if (!startDate || !endDate) {
      toast({
        variant: "destructive",
        title: "Invalid Date Range",
        description: "Please select both a start and end date.",
      });
      return;
    }
    
    if (new Date(startDate) > new Date(endDate)) {
      toast({
        variant: "destructive",
        title: "Invalid Date Range",
        description: "The start date cannot be after the end date.",
      });
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setFreeSlots([]);

    const params = new URLSearchParams({ startDate, endDate });

    // --- THIS IS THE FIX ---
    // Changed parameter names to match the backend API
    if (selectedFaculty) params.append('selectedFaculty', selectedFaculty);
    if (selectedSkill) params.append('selectedSkill', selectedSkill);

    try {
      const response = await fetch(`${API_BASE_URL}/api/free-slots?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "An unknown error occurred."}));
        throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
      }
      const data: FreeSlot[] = await response.json();
      setFreeSlots(data);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Search Failed",
        description: error.message || "Could not fetch free slots. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setStartDate("");
    setEndDate("");
    setSelectedFaculty("");
    setSelectedSkill("");
    setFreeSlots([]);
    setHasSearched(false);
  };
  
  const renderResults = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }
    if (!hasSearched) {
      return (
        <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-48">
          <Search className="h-12 w-12 mb-4" />
          <p className="font-medium">Find available slots</p>
          <p className="text-sm">Use the filters above and click "Search" to see results.</p>
        </div>
      );
    }
    if (freeSlots.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-48">
          <CalendarX className="h-12 w-12 mb-4" />
          <p className="font-medium">No Free Slots Found</p>
          <p className="text-sm">Try adjusting your filters or selecting a different date range.</p>
        </div>
      );
    }
    return (
      <div className="space-y-6">
        {freeSlots.map(({ faculty, slots }) => (
          <Card key={faculty.id} className="overflow-hidden">
            <CardHeader><CardTitle className="text-lg">{faculty.name}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {slots.map(slot => (
                <div key={slot.date} className="p-4 border rounded-md">
                  <h4 className="font-semibold text-primary mb-2">{formatDisplayDate(slot.date)}</h4>
                  <div className="flex flex-wrap gap-2">
                    {slot.time.length > 0 ? (
                      slot.time.map((time, index) => <Badge key={index} variant="secondary">{time}</Badge>)
                    ) : (
                      <p className="text-sm text-muted-foreground">No specific slots available on this day.</p>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Find Free Slots</h1>
        <p className="text-muted-foreground">Search for available faculty teaching slots by skill and date.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-5 w-5"/>
            <CardTitle>Search Filters</CardTitle>
          </div>
          <CardDescription>Select a start and end date, then optionally filter by faculty or skill.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <div className="space-y-2">
              <Label htmlFor="start-date">Start date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="faculty-select">Faculty (Optional)</Label>
              <Select value={selectedFaculty} onValueChange={setSelectedFaculty} disabled={isInitialLoading}>
                <SelectTrigger id="faculty-select">
                  <SelectValue placeholder={isInitialLoading ? "Loading..." : "Any Faculty"} />
                </SelectTrigger>
                <SelectContent>
                  {faculties.map((faculty) => <SelectItem key={faculty.id} value={faculty.id}>{faculty.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="skill-select">Skill (Optional)</Label>
              <Select value={selectedSkill} onValueChange={setSelectedSkill} disabled={isInitialLoading}>
                <SelectTrigger id="skill-select">
                  <SelectValue placeholder={isInitialLoading ? "Loading..." : "Any Skill"} />
                </SelectTrigger>
                <SelectContent>
                  {skills.map((skill) => <SelectItem key={skill.id} value={skill.id}>{skill.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={handleClear}>Clear</Button>
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? "Searching..." : "Search"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Available Slots</h2>
        {renderResults()}
      </div>
    </div>
  );
}