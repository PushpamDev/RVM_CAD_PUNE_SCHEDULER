import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Users, BookOpen, CalendarSearch, CalendarX } from 'lucide-react';
import { useBatchData } from '../hooks/useBatchData';
import { useAuth } from '@/hooks/AuthContext';
import { cn } from '@/lib/utils';

// --- Types & Constants ---
type ViewMode = 'week' | 'day';
const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// --- Helper Functions ---
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setHours(0, 0, 0, 0);
  return new Date(d.setDate(diff));
};

const formatTime = (timeStr: string): string => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const date = new Date();
  date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

const colorClasses = [
    'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700',
    'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-700',
    'bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700',
    'bg-indigo-100 text-indigo-800 border-indigo-300 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-700',
    'bg-pink-100 text-pink-800 border-pink-300 hover:bg-pink-200 dark:bg-pink-900/50 dark:text-pink-300 dark:border-pink-700',
    'bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-200 dark:bg-sky-900/50 dark:text-sky-300 dark:border-sky-700',
];

const getConsistentColor = (id: string): string => {
    const charCodeSum = id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colorClasses[charCodeSum % colorClasses.length];
};

// --- Child Components ---

const ScheduleSkeleton = () => (
    <Card>
        <CardHeader>
            <Skeleton className="h-8 w-1/2 rounded-md" />
            <Skeleton className="h-4 w-1/3 rounded-md" />
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-8 border rounded-lg">
                <div className="p-2 border-r"><Skeleton className="h-6 w-full rounded-md" /></div>
                {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="p-2 text-center border-r last:border-r-0">
                        <Skeleton className="h-6 w-1/2 mx-auto rounded-md" />
                        <Skeleton className="h-4 w-1/3 mx-auto mt-1 rounded-md" />
                    </div>
                ))}
                {Array.from({ length: 5 }).map((_, rowIndex) => (
                    <React.Fragment key={rowIndex}>
                        <div className="p-2 border-t border-r"><Skeleton className="h-10 w-full rounded-md" /></div>
                        {Array.from({ length: 7 }).map((_, colIndex) => (
                            <div key={colIndex} className="p-2 border-t border-r last:border-r-0"><Skeleton className="h-10 w-full rounded-md" /></div>
                        ))}
                    </React.Fragment>
                ))}
            </div>
        </CardContent>
    </Card>
);

const SchedulePlaceholder = ({ message, children }: { message: string; children: React.ReactNode }) => (
    <Card className="flex items-center justify-center h-96">
        <div className="text-center text-muted-foreground">
            {children}
            <p className="mt-4 font-semibold">{message}</p>
        </div>
    </Card>
);

// --- Main Component ---
export default function ScheduleView() {
    const { faculties, batches, loading } = useBatchData();
    const { user } = useAuth();

    const [selectedFaculty, setSelectedFaculty] = useState<string>('');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('week');

    useEffect(() => {
        if (user?.role === 'faculty' && user.id) {
            setSelectedFaculty(user.id);
        }
    }, [user]);

    const weekStart = getWeekStart(currentDate);

    const handleDateChange = (direction: 'prev' | 'next') => {
        const increment = viewMode === 'week' ? 7 : 1;
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            newDate.setDate(newDate.getDate() + (direction === 'prev' ? -increment : increment));
            return newDate;
        });
    };

    const weekViewData = useMemo(() => {
        if (!selectedFaculty || loading) return null;
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const facultyBatches = batches.filter(b => b.faculty_id === selectedFaculty && new Date(b.start_date) <= weekEnd && new Date(b.end_date) >= weekStart);
        const timePoints = new Set<string>();
        facultyBatches.forEach(b => { timePoints.add(b.start_time); timePoints.add(b.end_time); });
        const sortedTimePoints = Array.from(timePoints).sort((a, b) => a.localeCompare(b));
        const timeSlots = sortedTimePoints.slice(0, -1).map((start, i) => ({ start, end: sortedTimePoints[i + 1] })).filter(slot => slot.start !== slot.end);

        const dayDates = daysOfWeek.reduce((acc, day, index) => {
            const date = new Date(weekStart);
            date.setDate(date.getDate() + index);
            acc[day] = date;
            return acc;
        }, {} as { [day: string]: Date });

        const grid = daysOfWeek.reduce((acc, day) => {
            acc[day] = timeSlots.reduce((timeAcc, slot) => {
                timeAcc[slot.start] = [];
                return timeAcc;
            }, {} as { [time: string]: any[] });
            return acc;
        }, {} as { [day: string]: { [time: string]: any[] } });

        facultyBatches.forEach(batch => {
            batch.days_of_week.forEach(day => {
                const currentDate = dayDates[day];
                if (grid[day] && currentDate >= new Date(batch.start_date) && currentDate <= new Date(batch.end_date)) {
                    timeSlots.forEach(slot => {
                        if (batch.start_time < slot.end && batch.end_time > slot.start) {
                            grid[day][slot.start].push(batch);
                        }
                    });
                }
            });
        });

        return { grid, timeSlots, hasBatchesThisWeek: facultyBatches.length > 0 };
    }, [selectedFaculty, batches, weekStart, loading]);

    const dayViewData = useMemo(() => {
        if (!selectedFaculty || loading) return null;
        const dayOfWeek = daysOfWeek[currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1];
        
        const dayBatches = batches.filter(b => 
            b.faculty_id === selectedFaculty &&
            b.days_of_week.includes(dayOfWeek) &&
            currentDate >= new Date(b.start_date) &&
            currentDate <= new Date(b.end_date)
        ).sort((a, b) => a.start_time.localeCompare(b.start_time));
        
        return { batches: dayBatches };
    }, [selectedFaculty, batches, currentDate, loading]);


    const renderContent = () => {
        if (loading) return <ScheduleSkeleton />;
        if (!selectedFaculty) return <SchedulePlaceholder message="Please select a faculty to view their schedule."><CalendarSearch className="h-16 w-16 text-gray-300" /></SchedulePlaceholder>;

        if (viewMode === 'week') {
            if (!weekViewData || !weekViewData.hasBatchesThisWeek) return <SchedulePlaceholder message="No batches scheduled for this faculty in the selected week."><CalendarX className="h-16 w-16 text-gray-300" /></SchedulePlaceholder>;

            return (
                <Card>
                    <CardHeader>
                        <CardTitle>Schedule for {faculties.find(f => f.id === selectedFaculty)?.name}</CardTitle>
                        <CardDescription>Displaying scheduled batches for the selected week.</CardDescription>
                    </CardHeader>
                    <CardContent className="overflow-x-auto">
                        <div className="grid border rounded-lg" style={{ gridTemplateColumns: 'minmax(120px, auto) repeat(7, minmax(140px, 1fr))' }}>
                            <div className="font-semibold p-3 bg-muted/50 border-b border-r sticky left-0 z-10 bg-background">Time</div>
                            {daysOfWeek.map((day, index) => {
                                const date = new Date(weekStart);
                                date.setDate(date.getDate() + index);
                                const isToday = date.toDateString() === new Date().toDateString();
                                return (
                                    <div key={day} className={cn("font-semibold p-3 border-b text-center", isToday ? "bg-primary/10 text-primary" : "bg-muted/50")}>
                                        <span>{day}</span>
                                        <div className="text-xs font-normal">{date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</div>
                                    </div>
                                );
                            })}
                            {weekViewData.timeSlots.map((slot, index) => (
                                <React.Fragment key={slot.start}>
                                    <div className={cn("font-semibold p-3 border-b border-r text-sm text-muted-foreground whitespace-nowrap sticky left-0 z-10", index % 2 === 1 ? "bg-background" : "bg-muted/20")}>
                                        {`${formatTime(slot.start)} - ${formatTime(slot.end)}`}
                                    </div>
                                    {daysOfWeek.map(day => (
                                        <div key={`${day}-${slot.start}`} className={cn("p-2 border-b border-r min-h-[60px] space-y-1.5", index % 2 === 1 ? "bg-background" : "bg-muted/20")}>
                                            {weekViewData.grid[day]?.[slot.start]?.map(batch => (
                                                <Popover key={batch.id}>
                                                    <PopoverTrigger asChild>
                                                        <Badge variant="outline" className={cn("text-xs w-full block truncate text-left p-2 h-auto font-normal cursor-pointer border-2", getConsistentColor(batch.id))}>
                                                            <p className="font-semibold">{batch.name}</p>
                                                            <p className="opacity-80">{batch.skill?.name ?? 'N/A'}</p>
                                                        </Badge>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-64">
                                                        <div className="space-y-2">
                                                            <h4 className="font-medium leading-none">{batch.name}</h4>
                                                            <p className="text-sm text-muted-foreground">{formatTime(batch.start_time)} - {formatTime(batch.end_time)}</p>
                                                            <div className="flex items-center pt-2">
                                                                <BookOpen className="mr-2 h-4 w-4 opacity-70" />
                                                                <span className="text-xs text-muted-foreground">{batch.skill?.name ?? 'N/A'}</span>
                                                            </div>
                                                            <div className="flex items-center">
                                                                <Users className="mr-2 h-4 w-4 opacity-70" />
                                                                <span className="text-xs text-muted-foreground">{batch.students.length} / {batch.max_students} Students</span>
                                                            </div>
                                                        </div>
                                                    </PopoverContent>
                                                </Popover>
                                            )) ?? null}
                                        </div>
                                    ))}
                                </React.Fragment>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            );
        }

        if (viewMode === 'day') {
             if (!dayViewData || dayViewData.batches.length === 0) return <SchedulePlaceholder message="No batches scheduled for this day."><CalendarX className="h-16 w-16 text-gray-300" /></SchedulePlaceholder>;

             return (
                <Card>
                    <CardHeader>
                        <CardTitle>Schedule for {currentDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</CardTitle>
                        <CardDescription>Displaying all batches scheduled for {faculties.find(f => f.id === selectedFaculty)?.name} on this day.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {dayViewData.batches.map(batch => (
                             <Popover key={batch.id}>
                                <PopoverTrigger asChild>
                                    <div className={cn("flex items-center justify-between p-4 rounded-lg border-l-4 cursor-pointer", getConsistentColor(batch.id))}>
                                        <div>
                                            <p className="font-bold">{batch.name}</p>
                                            <p className="text-sm">{batch.skill?.name ?? 'N/A'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-sm">{formatTime(batch.start_time)} - {formatTime(batch.end_time)}</p>
                                            <p className="text-xs">{batch.students.length} / {batch.max_students} Students</p>
                                        </div>
                                    </div>
                                </PopoverTrigger>
                                {/* --- FIX: Added the missing Popover Content for Day View --- */}
                                <PopoverContent className="w-64">
                                    <div className="space-y-2">
                                        <h4 className="font-medium leading-none">{batch.name}</h4>
                                        <p className="text-sm text-muted-foreground">{formatTime(batch.start_time)} - {formatTime(batch.end_time)}</p>
                                        <div className="flex items-center pt-2">
                                            <BookOpen className="mr-2 h-4 w-4 opacity-70" />
                                            <span className="text-xs text-muted-foreground">{batch.skill?.name ?? 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center">
                                            <Users className="mr-2 h-4 w-4 opacity-70" />
                                            <span className="text-xs text-muted-foreground">{batch.students.length} / {batch.max_students} Students</span>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        ))}
                    </CardContent>
                </Card>
            );
        }

        return null;
    };


    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Faculty Schedule</h1>
                <p className="text-muted-foreground">A weekly overview of faculty batch schedules.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Schedule Filters</CardTitle>
                    <CardDescription>Select a view, faculty, and navigate to see their schedule.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <ToggleGroup type="single" value={viewMode} onValueChange={(value: ViewMode) => value && setViewMode(value)} aria-label="View Mode">
                            <ToggleGroupItem value="week" aria-label="Week view">Week</ToggleGroupItem>
                            <ToggleGroupItem value="day" aria-label="Day view">Day</ToggleGroupItem>
                        </ToggleGroup>
                        <Select value={selectedFaculty} onValueChange={setSelectedFaculty} disabled={loading || user?.role === 'faculty'}>
                            <SelectTrigger className="w-full sm:w-[250px]"><SelectValue placeholder={loading ? "Loading..." : "Select a faculty"} /></SelectTrigger>
                            <SelectContent>{faculties.map(f => (<SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>))}</SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2 justify-center">
                        <Button variant="outline" size="icon" onClick={() => handleDateChange('prev')}><ChevronLeft className="h-4 w-4" /></Button>
                        <Button variant="outline" className="w-full sm:w-auto" onClick={() => setCurrentDate(new Date())}><CalendarIcon className="mr-2 h-4 w-4" /> Today</Button>
                        <div className="text-center w-full sm:w-auto border rounded-md px-4 py-2 text-sm font-semibold">
                           {viewMode === 'week' ? `${weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}` : currentDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </div>
                        <Button variant="outline" size="icon" onClick={() => handleDateChange('next')}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                </CardContent>
            </Card>

            {renderContent()}
        </div>
    );
}