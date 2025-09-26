import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import { useAuth } from "../hooks/AuthContext";
import { formatDistanceToNow } from "date-fns"; // For relative dates

// --- UI Component Imports ---
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { BellRing, Eye, Inbox, Trash2 } from "lucide-react"; // --- ICONS ---

// --- Type Definitions ---
interface Announcement {
  id: string;
  title: string;
  message: string;
  scope: "all" | "batch";
  batch_id?: string | null;
  created_at?: string;
  batch?: { name: string } | null;
}

interface Batch {
  id: string;
  name: string;
}

const MESSAGE_MAX_LENGTH = 500; // Character limit for the announcement message

// --- Main Component ---
export default function Announcements() {
  const { token } = useAuth();
  const { toast } = useToast();

  // Form State
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");

  // Data State
  const [batches, setBatches] = useState<Batch[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // UI State
  const [isLoading, setIsLoading] = useState(false); // For form submission
  const [isDataLoading, setIsDataLoading] = useState(true); // For initial data fetch
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }),
    [token]
  );

  // --- Data Fetching ---
  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      setIsDataLoading(true);
      try {
        const [batchesRes, announcementsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/batches`, { headers }),
          fetch(`${API_BASE_URL}/api/announcements`, { headers }),
        ]);

        if (!batchesRes.ok) throw new Error("Failed to fetch batches");
        const batchesData = await batchesRes.json();
        setBatches(Array.isArray(batchesData) ? batchesData : []);

        if (!announcementsRes.ok) throw new Error("Failed to fetch announcements");
        const announcementsData = await announcementsRes.json();
        setAnnouncements(Array.isArray(announcementsData) ? announcementsData : (announcementsData.items ?? []));
        
      } catch (e: any) {
        toast({ title: "Error fetching data", description: e.message, variant: "destructive" });
      } finally {
        setIsDataLoading(false);
      }
    };

    fetchData();
  }, [token]);

  // --- Form Handling ---
  const resetForm = () => {
    setTitle("");
    setMessage("");
    setSendToAll(true);
    setSelectedBatchId("");
  };

  const handleCreate = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Please fill title and message", variant: "destructive" });
      return;
    }
    if (!sendToAll && !selectedBatchId) {
      toast({ title: "Select a batch or send to all", variant: "destructive" });
      return;
    }

    const payload = {
      title: title.trim(),
      message: message.trim(),
      scope: sendToAll ? "all" : "batch",
      batch_id: sendToAll ? null : selectedBatchId,
    };

    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/announcements`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create announcement");
      }
      const newAnnouncement = await res.json();
      setAnnouncements(prev => [newAnnouncement, ...prev]);
      toast({ title: "Announcement sent successfully!" });
      resetForm();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // --- Action Handlers for List ---
  const openDeleteDialog = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowDeleteConfirm(true);
  };
  
  const openViewDialog = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setShowViewDialog(true);
  };

  const handleDelete = async () => {
    if (!selectedAnnouncement) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/announcements/${selectedAnnouncement.id}`, {
        method: "DELETE",
        headers: { Authorization: headers.Authorization },
      });
      if (!res.ok) throw new Error("Failed to delete announcement");
      setAnnouncements((prev) => prev.filter((a) => a.id !== selectedAnnouncement.id));
      toast({ title: "Announcement deleted" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setShowDeleteConfirm(false);
      setSelectedAnnouncement(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BellRing className="h-8 w-8" />
          Announcements
        </h1>
        <p className="text-muted-foreground">Create and manage announcements for everyone or specific batches.</p>
      </div>

      {/* --- Announcement Creation Form --- */}
      <Card>
        <CardHeader>
          <CardTitle>New Announcement</CardTitle>
          <CardDescription>Send a message to all users or a selected batch.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="E.g., Holiday Notice" />
            </div>
            <div className="space-y-2">
              <Label>Target Audience</Label>
              <div className="flex items-center gap-3 rounded-md border p-3 h-10">
                <Switch id="send-to-all" checked={sendToAll} onCheckedChange={setSendToAll} />
                <Label htmlFor="send-to-all" className="font-normal">Send to Everyone</Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea 
              id="message" 
              value={message} 
              onChange={(e) => setMessage(e.target.value)} 
              placeholder="Write your announcement..." 
              rows={5}
              maxLength={MESSAGE_MAX_LENGTH}
            />
            <p className="text-sm text-muted-foreground text-right">
              {message.length} / {MESSAGE_MAX_LENGTH}
            </p>
          </div>

          {!sendToAll && (
            <div className="space-y-2 animate-in fade-in-50">
              <Label>Select Batch</Label>
              <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Click to select a batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex gap-3">
            <Button onClick={handleCreate} disabled={isLoading}>{isLoading ? "Sending..." : "Send Announcement"}</Button>
            <Button type="button" variant="outline" onClick={resetForm}>Clear</Button>
          </div>
        </CardContent>
      </Card>

      {/* --- Previous Announcements List --- */}
      <Card>
        <CardHeader>
          <CardTitle>Previous Announcements</CardTitle>
          <CardDescription>A log of all announcements sent, most recent first.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isDataLoading ? (
                // --- Loading Skeleton ---
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-64" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : announcements.length === 0 ? (
                // --- Enhanced Empty State ---
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Inbox className="h-10 w-10 text-muted-foreground" />
                      <p className="font-medium">No Announcements Yet</p>
                      <p className="text-sm text-muted-foreground">Create one using the form above.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                // --- Data Rows ---
                announcements.map((a) => {
                  const created = a.created_at ? new Date(a.created_at) : null;
                  const batchName = a.batch?.name ?? a.batch_id ?? "N/A";
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.title}</TableCell>
                      <TableCell className="max-w-[400px] truncate">{a.message}</TableCell>
                      <TableCell>
                        <Badge variant={a.scope === "all" ? "default" : "secondary"}>
                          {a.scope === "all" ? "All" : `Batch: ${batchName}`}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {created ? formatDistanceToNow(created, { addSuffix: true }) : "-"}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="ghost" size="icon" aria-label="View" onClick={() => openViewDialog(a)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" aria-label="Delete" onClick={() => openDeleteDialog(a)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* --- Dialogs for Actions --- */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the announcement titled "{selectedAnnouncement?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAnnouncement?.title}</DialogTitle>
            <DialogDescription>
              Sent {selectedAnnouncement?.created_at ? formatDistanceToNow(new Date(selectedAnnouncement.created_at), { addSuffix: true }) : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="prose prose-sm dark:prose-invert max-w-none break-words py-4">
            {selectedAnnouncement?.message}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}