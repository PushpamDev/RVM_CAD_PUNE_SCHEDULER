// types/ticketManagement.ts

// Represents a user or admin who can be assigned a ticket
export interface Admin {
  id: string;
  username: string;
}

// Represents the student who created the ticket
export interface Student {
  id: string;
  name: string;
}

// Represents a single ticket object from the API
export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'Open' | 'In Progress' | 'Resolved';
  priority: 'Low' | 'Medium' | 'High';
  category: string;
  created_at: string;
  updated_at: string;
  student: Student;   // Nested object from Supabase relation
  assignee: Admin | null; // Can be null if unassigned
  assignee_id: string | null;
}

// For paginated API responses from the tickets endpoint
export interface PaginatedTickets {
  items: Ticket[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Represents a single chat message object from the API.
 * This aligns with the response from your chatController.
 */
export interface ChatMessage {
  id: string;
  ticket_id: string;
  message: string;
  sender_user_id: string | null;    // Will have a value if sender is an admin/user
  sender_student_id: string | null; // Will have a value if sender is a student
  created_at: string;
  sender_name: string; // This is added by the controller for convenience
}

/**
 * Defines the shape of the data sent to the API when a student creates a new ticket.
 */
export interface NewTicketPayload {
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High';
  category: string;
  student_id: string;
}