import { useEffect, useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Search, SlidersHorizontal, CalendarX } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { API_BASE_URL } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label"; // <-- ADD THIS IMPORT
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

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
const formatDateForAPI = (date: Date): string => format(date, "yyyy-MM-dd");

const formatDisplayDate = (dateString: string): string => {
  // The date from API is yyyy-mm-dd, which JS Date constructor handles correctly.
  const date = new Date(dateString);
  return format(date, "EEEE, MMMM d, yyyy");
};

// --- Main Component ---
export default function FreeSlots() {
  const { toast } = useToast();

  // --- State Management ---
  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [date, setDate] = useState<DateRange | undefined>();
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
          fetch(`${API_BASE_URL}/api/faculty`),
          fetch(`${API_BASE_URL}/api/skills`),
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
  }, [toast]);

  const handleSearch = async () => {
    if (!date?.from || !date?.to) {
      toast({
        variant: "destructive",
        title: "Invalid Date Range",
        description: "Please select a start and end date.",
      });
      return;
    }

    setIsLoading(true);
    setHasSearched(true);
    setFreeSlots([]);

    const params = new URLSearchParams({
      startDate: formatDateForAPI(date.from),
      endDate: formatDateForAPI(date.to),
    });

    if (selectedFaculty) params.append('facultyId', selectedFaculty);
    if (selectedSkill) params.append('skillId', selectedSkill);

    try {
      const response = await fetch(`${API_BASE_URL}/api/free-slots?${params.toString()}`);
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
    setDate(undefined);
    setSelectedFaculty("");
    setSelectedSkill("");
    setFreeSlots([]);
    setHasSearched(false);
  };

  // --- Render Logic ---
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
            <CardHeader>
              <CardTitle className="text-lg">{faculty.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {slots.map(slot => (
                <div key={slot.date} className="p-4 border rounded-md">
                  <h4 className="font-semibold text-primary mb-2">{formatDisplayDate(slot.date)}</h4>
                  <div className="flex flex-wrap gap-2">
                    {slot.time.length > 0 ? (
                      slot.time.map((time, index) => (
                        <Badge key={index} variant="secondary">{time}</Badge>
                      ))
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
          <CardDescription>Select a date range and optionally filter by faculty or skill.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {/* Date Range Picker */}
            <div className="space-y-2 lg:col-span-1">
              <Label>Date range</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date?.from ? (
                      date.to ? (
                        `${format(date.from, "LLL dd, y")} - ${format(date.to, "LLL dd, y")}`
                      ) : (
                        format(date.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={date?.from}
                    selected={date}
                    onSelect={setDate}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Faculty Filter */}
            <div className="space-y-2">
              <Label htmlFor="faculty-select">Faculty (Optional)</Label>
              <Select value={selectedFaculty} onValueChange={setSelectedFaculty} disabled={isInitialLoading}>
                <SelectTrigger id="faculty-select">
                  <SelectValue placeholder={isInitialLoading ? "Loading..." : "Any Faculty"} />
                </SelectTrigger>
                <SelectContent>
                  {faculties.map((faculty) => (
                    <SelectItem key={faculty.id} value={faculty.id}>{faculty.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Skill Filter */}
            <div className="space-y-2">
              <Label htmlFor="skill-select">Skill (Optional)</Label>
              <Select value={selectedSkill} onValueChange={setSelectedSkill} disabled={isInitialLoading}>
                <SelectTrigger id="skill-select">
                  <SelectValue placeholder={isInitialLoading ? "Loading..." : "Any Skill"} />
                </SelectTrigger>
                <SelectContent>
                  {skills.map((skill) => (
                    <SelectItem key={skill.id} value={skill.id}>{skill.name}</SelectItem>
                  ))}
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

      {/* Results Section */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Available Slots</h2>
        {renderResults()}
      </div>
    </div>
  );
}