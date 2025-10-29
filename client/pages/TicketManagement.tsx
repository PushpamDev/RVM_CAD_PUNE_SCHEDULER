import { useState, useEffect, useRef, FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search, MessageSquare, ChevronLeft, ChevronRight, SendHorizontal, Info, CornerDownLeft, Tag } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useTicketData } from "../hooks/useTicketData";
import type { Ticket, ChatMessage, Admin } from "../types/ticketManagement";
import { fetchChatMessages, sendChatMessage } from "@/lib/services/api";
import { toast } from "sonner";
import { jwtDecode } from "jwt-decode";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/AuthContext";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// --- Helper: Decode User ID from Token ---
const getUserIdFromToken = (token: string): string | null => {
  try {
    const decoded = jwtDecode<{ id?: string; userId?: string }>(token);
    return decoded.id || decoded.userId || null;
  } catch (error) {
    console.error("Failed to decode token:", error);
    return null;
  }
};


// ============================================================================
// --- Sub-Components ---
// ============================================================================

// --- Chat Interface Component ---
const ChatInterface = ({ ticket, admins, token }: { ticket: Ticket; admins: Admin[]; token: string | null }) => {
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['chat', ticket.id],
    queryFn: () => fetchChatMessages(token!, ticket.id),
    enabled: !!token && !!ticket.id,
    // --- FIX: Ensure the response is always an array ---
    select: (data: any) => (Array.isArray(data) ? data : data?.messages || []),
  });

  const sendMessageMutation = useMutation({
    mutationFn: (payload: { message: string; sender_user_id: string }) => 
      sendChatMessage(token, ticket.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat', ticket.id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      setNewMessage("");
    },
    onError: (error: Error) => toast.error("Failed to send message", { description: error.message }),
  });

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  const handleSendMessage = (e?: FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !token) return;
    const sender_user_id = getUserIdFromToken(token);
    if (!sender_user_id) {
      toast.error("Authentication error", { description: "Could not retrieve user ID." });
      return;
    }
    sendMessageMutation.mutate({ message: newMessage, sender_user_id });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  }

  return (
    <>
      <div ref={chatContainerRef} className="flex-1 space-y-1 overflow-y-auto pr-2 pb-4">
        {isLoadingMessages ? (
          <div className="space-y-4">
            <div className="flex items-end gap-2 justify-start"><Skeleton className="h-8 w-8 rounded-full" /><Skeleton className="h-16 w-3/5 rounded-lg" /></div>
            <div className="flex items-end gap-2 justify-end"><Skeleton className="h-12 w-1/2 rounded-lg" /><Skeleton className="h-8 w-8 rounded-full" /></div>
          </div>
        ) : (
          <AnimatePresence>
            {messages.map((msg, index) => {
              const isLastInGroup = !(messages[index + 1] && (messages[index + 1].sender_user_id === msg.sender_user_id && messages[index + 1].sender_student_id === msg.sender_student_id));
              return (
                <motion.div key={msg.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}
                  className={`flex items-end gap-2 ${msg.sender_user_id ? 'justify-end' : 'justify-start'} ${isLastInGroup ? 'mb-3' : 'mb-1'}`}>
                  {!msg.sender_user_id && <Avatar className={`h-8 w-8 self-end transition-opacity ${isLastInGroup ? 'opacity-100' : 'opacity-0'}`}><AvatarFallback>{ticket.student.name.charAt(0)}</AvatarFallback></Avatar>}
                  <div className={`max-w-[70%] p-3 rounded-lg ${msg.sender_user_id ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                      {isLastInGroup && (
                        <p className="text-xs opacity-70 mt-1 text-right">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</p>
                      )}
                  </div>
                  {msg.sender_user_id && <Avatar className={`h-8 w-8 self-end transition-opacity ${isLastInGroup ? 'opacity-100' : 'opacity-0'}`}><AvatarFallback>{admins.find(a => a.id === msg.sender_user_id)?.username.charAt(0) || 'A'}</AvatarFallback></Avatar>}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
      <form onSubmit={handleSendMessage} className="relative flex w-full items-center">
        <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="Type your message..." rows={1}
          className="min-h-[40px] max-h-48 resize-y pr-20" disabled={sendMessageMutation.isPending}/>
        <div className="absolute right-2 flex items-center gap-1">
            <p className="text-xs text-muted-foreground hidden sm:block">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100"><CornerDownLeft className="h-3 w-3"/></kbd> Send
            </p>
            <Button type="submit" size="icon" disabled={sendMessageMutation.isPending || !newMessage.trim()}><SendHorizontal className="h-4 w-4" /></Button>
        </div>
      </form>
    </>
  );
};


// --- Ticket Detail View Component ---
const TicketDetailView = ({ ticket, admins, updateTicket, token }: { ticket: Ticket; admins: Admin[]; updateTicket: (ticketId: string, payload: any) => void; token: string | null }) => (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <CardTitle className="mb-1">{ticket.title}</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
              <CategoryBadge category={ticket.category} />
              <PriorityBadge priority={ticket.priority} />
              <span>ID: {ticket.id}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={ticket.assignee_id || 'unassigned'} onValueChange={(adminId) => updateTicket(ticket.id, { assignee_id: adminId === 'unassigned' ? null : adminId })}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Assign ticket..." /></SelectTrigger>
              <SelectContent><SelectItem value="unassigned">Unassigned</SelectItem><Separator className="my-1"/>{admins.map(admin => (<SelectItem key={admin.id} value={admin.id}>{admin.username}</SelectItem>))}</SelectContent>
            </Select>
            
            {/* UPDATED: Status dropdown now allows selecting 'Resolved' */}
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {/* The onValueChange handler allows the user to trigger the update */}
                        <Select value={ticket.status} onValueChange={(newStatus) => updateTicket(ticket.id, { status: newStatus })}>
                            <SelectTrigger className="w-full sm:w-[180px]">
                                <SelectValue placeholder="Ticket Status" />
                            </SelectTrigger>
                            <SelectContent>
                                {/* These options are disabled to guide the user to the correct workflow */}
                                <SelectItem value="Open" disabled>Open</SelectItem>
                                <SelectItem value="In Progress" disabled>In Progress</SelectItem>
                                {/* This is the only manually selectable option */}
                                <SelectItem value="Resolved">Resolved</SelectItem>
                            </SelectContent>
                        </Select>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Status becomes 'In Progress' on reply. You can manually set to 'Resolved'.</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 pt-0 overflow-hidden">
        <Separator/>
        <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <Info className="h-5 w-5 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-sm text-blue-800 dark:text-blue-300">Student's Complaint</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300/90 mt-1">{ticket.description}</p>
            </div>
        </div>
        <ChatInterface ticket={ticket} admins={admins} token={token} />
      </CardContent>
    </Card>
);

// --- Badge Components ---
const StatusBadge = ({ status }: { status: string }) => {
  const statusClasses: { [key: string]: string } = { Open: "bg-blue-100 text-blue-800", "In Progress": "bg-yellow-100 text-yellow-800", Resolved: "bg-green-100 text-green-800" };
  return <Badge className={`whitespace-nowrap ${statusClasses[status]} hover:${statusClasses[status]}`}>{status}</Badge>;
};
const PriorityBadge = ({ priority }: { priority: string }) => {
    const priorityClasses: { [key: string]: string } = { High: "bg-red-100 text-red-800", Medium: "bg-orange-100 text-orange-800", Low: "bg-gray-100 text-gray-800" };
    return <Badge variant="outline" className={`${priorityClasses[priority]}`}>{priority}</Badge>;
};
const CategoryBadge = ({ category }: { category: string }) => (
    <Badge variant="secondary" className="font-normal">
        <Tag className="mr-1 h-3 w-3" />
        {category}
    </Badge>
);


// ============================================================================
// --- Main Ticket Management Component ---
// ============================================================================
export default function TicketManagement() {
  const { 
    tickets, 
    admins, 
    loading: loadingTickets, 
    pagination, 
    filters,
    searchTerm,
    setSearchTerm,
    setPage,
    setStatusFilter,
    setCategoryFilter,
    categories,
    isLoadingCategories,
    updateTicket, 
  } = useTicketData();

  const { token } = useAuth();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    if (!selectedTicket && tickets.length > 0) {
      setSelectedTicket(tickets[0]);
    }
    if (selectedTicket && !tickets.find(t => t.id === selectedTicket.id)) {
      setSelectedTicket(tickets.length > 0 ? tickets[0] : null);
    }
  }, [tickets, selectedTicket]);

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-screen overflow-hidden">
      <ResizablePanelGroup direction="horizontal" className="h-full max-h-[calc(100vh-4rem)] rounded-lg border">
        <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
          <div className="flex flex-col gap-4 h-full p-4">
              <Card>
                <CardHeader><CardTitle>Filter & Search</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search by title..." className="pl-8" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                  </div>
                  <Select value={filters.status} onValueChange={setStatusFilter}>
                    <SelectTrigger><SelectValue placeholder="Filter by status" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="All">All Statuses</SelectItem>
                        <SelectItem value="Open">Open</SelectItem>
                        <SelectItem value="In Progress">In Progress</SelectItem>
                        <SelectItem value="Resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                  {isLoadingCategories ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select value={filters.category} onValueChange={setCategoryFilter}>
                        <SelectTrigger><SelectValue placeholder="Filter by category" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="All">All Categories</SelectItem>
                            {categories.map(category => (
                                <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                  )}
                </CardContent>
              </Card>
              <Card className="flex-grow flex flex-col overflow-hidden">
                <CardHeader>
                  <CardTitle>Ticket Queue</CardTitle>
                  <CardDescription>Showing {tickets.length} of {pagination.total} tickets.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 flex-grow overflow-y-auto">
                  {loadingTickets ? <div className="p-4 space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
                   : <div className="space-y-1 p-2">
                      {tickets.map((ticket) => (
                        <div key={ticket.id} onClick={() => setSelectedTicket(ticket)} className={`p-3 rounded-lg cursor-pointer border-l-4 transition-colors ${selectedTicket?.id === ticket.id ? 'bg-muted border-primary' : 'hover:bg-muted/50 border-transparent'}`}>
                          <div className="flex justify-between items-start">
                            <p className="font-semibold text-sm pr-2 truncate">{ticket.title}</p>
                            <StatusBadge status={ticket.status} />
                          </div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                            <CategoryBadge category={ticket.category} />
                            <div className="flex items-center gap-2">
                                <span className="truncate">{ticket.student.name}</span>
                                {ticket.assignee && (<Avatar className="h-5 w-5"><AvatarFallback title={ticket.assignee.username}>{ticket.assignee.username.charAt(0).toUpperCase()}</AvatarFallback></Avatar>)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>}
                </CardContent>
                <CardFooter className="p-2 border-t justify-center">
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setPage(pagination.page - 1)} disabled={pagination.page <= 1}><ChevronLeft className="h-4 w-4" /> Prev</Button>
                    <span className="text-sm font-medium">Page {pagination.page} of {totalPages || 1}</span>
                    <Button variant="outline" size="sm" onClick={() => setPage(pagination.page + 1)} disabled={pagination.page >= totalPages}>Next <ChevronRight className="h-4 w-4" /></Button>
                  </div>
                </CardFooter>
              </Card>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={75}>
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedTicket ? selectedTicket.id : "empty"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="h-full p-4"
            >
              {selectedTicket ? (
                <TicketDetailView ticket={selectedTicket} admins={admins} updateTicket={updateTicket} token={token} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                  <MessageSquare className="h-16 w-16 mb-4 text-gray-400"/>
                  <h2 className="text-xl font-semibold">No Ticket Selected</h2>
                  <p className="max-w-xs">Select a ticket from the queue to view its details and engage in the conversation.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}