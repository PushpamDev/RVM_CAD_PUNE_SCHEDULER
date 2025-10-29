import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchTickets, 
  getAdmins, 
  updateTicket as apiUpdateTicket,
  // REMOVED: We no longer need to fetch categories from the API
  // fetchTicketCategories 
} from '@/lib/services/api';
import type { PaginatedTickets, Ticket } from '@/types/ticketManagement';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

// NEW: Hardcoded list of ticket categories
const TICKET_CATEGORIES = [
  'Fee', 
  'Certificate', 
  'Placement', 
  'Infrastructure', // Corrected spelling
  'Faculty', 
  'Other'
];

export function useTicketData() {
  const queryClient = useQueryClient();
  const { token } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');

  const [filters, setFilters] = useState({
    status: 'All',
    search: '',
    category: 'All',
    page: 1,
    limit: 15,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => ({ ...prev, search: searchTerm, page: 1 }));
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, [searchTerm]);

  const queryKey = ['tickets', filters];

  const { data, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: () => fetchTickets(token, filters),
    keepPreviousData: true,
  });

  const { data: admins = [], isLoading: adminsLoading } = useQuery({
    queryKey: ['admins'],
    queryFn: () => getAdmins(token),
    enabled: !!token,
  });

  // REMOVED: The useQuery for fetching categories is no longer needed.
  /*
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['ticketCategories'],
    queryFn: () => fetchTicketCategories(token),
    enabled: !!token,
  });
  */

  const updateMutation = useMutation({
    mutationFn: ({ ticketId, payload }: { ticketId: string; payload: Partial<Ticket> }) =>
      apiUpdateTicket(token, ticketId, payload),
    
    onMutate: async ({ ticketId, payload }) => {
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<PaginatedTickets>(queryKey);
      if (previousData) {
        queryClient.setQueryData<PaginatedTickets>(queryKey, {
          ...previousData,
          items: previousData.items.map(ticket =>
            ticket.id === ticketId ? { ...ticket, ...payload } : ticket
          ),
        });
      }
      toast.success('Ticket updated instantly!');
      return { previousData };
    },
    
    onError: (err: Error, variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
        toast.error('Update failed, restoring previous data.', {
          description: err.message,
        });
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const setPage = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const setStatusFilter = (status: string) => {
    setFilters(prev => ({...prev, status, page: 1}));
  };
  
  const setCategoryFilter = (category: string) => {
    setFilters(prev => ({...prev, category, page: 1}));
  };

  const updateTicket = (ticketId: string, payload: { status?: string; assignee_id?: string | null }) => {
    updateMutation.mutate({ ticketId, payload });
  };

  return {
    tickets: data?.items || [],
    pagination: { 
      total: data?.total || 0, 
      page: data?.page || 1, 
      limit: data?.limit || 15, 
    },
    loading: isLoading || adminsLoading,
    isError,
    error,
    
    // Values and setters for filters
    searchTerm,
    setSearchTerm,
    filters,
    setPage,
    setStatusFilter,
    setCategoryFilter,

    // Data for dropdowns
    admins,
    // UPDATED: Return the hardcoded list and set loading to false
    categories: TICKET_CATEGORIES,
    isLoadingCategories: false,

    // Actions
    updateTicket,
  };
}