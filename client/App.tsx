import "./global.css";

import { Toaster } from "@/components/ui/toaster";
import { createRoot } from "react-dom/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import FacultyManagement from "./pages/FacultyManagement";
import BatchManagement from "./pages/BatchManagement";
import SkillsManagement from "./pages/SkillsManagement";
import FreeSlots from "./pages/FreeSlots";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import { AuthProvider } from "./hooks/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import StudentManagement from "./pages/StudentManagement";
import Suggestion from "./pages/Suggestion";
import AttendanceManagement from "./pages/AttendanceManagement";
import Announcements from "./pages/Announcements";
import ScheduleView from "./pages/ScheduleView";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={<ProtectedRoute><Layout><Index /></Layout></ProtectedRoute>}
            />
            <Route
              path="/faculty"
              element={<ProtectedRoute requiredRole="admin"><Layout><FacultyManagement /></Layout></ProtectedRoute>}
            />
            <Route
              path="/batches"
              element={<ProtectedRoute><Layout><BatchManagement /></Layout></ProtectedRoute>}
            />
            <Route
              path="/skills"
              element={<ProtectedRoute requiredRole="admin"><Layout><SkillsManagement /></Layout></ProtectedRoute>}
            />
            <Route
              path="/free-slots"
              element={<ProtectedRoute><Layout><FreeSlots /></Layout></ProtectedRoute>}
            />
            <Route
              path="/students"
              element={<ProtectedRoute requiredRole="admin"><Layout><StudentManagement /></Layout></ProtectedRoute>}
            />
            <Route
              path="/suggestions"
              element={<ProtectedRoute requiredRole="admin"><Layout><Suggestion /></Layout></ProtectedRoute>}
            />
            <Route
              path="/attendance"
              element={<ProtectedRoute requiredRole={['admin', 'faculty']}><Layout><AttendanceManagement /></Layout></ProtectedRoute>}
            />
            <Route
              path="/announcements"
              element={<ProtectedRoute requiredRole="admin"><Layout><Announcements /></Layout></ProtectedRoute>}
            />
            <Route
              path="/schedule"
              element={<ProtectedRoute><Layout><ScheduleView /></Layout></ProtectedRoute>}
            />
            <Route
              path="/free-slots"
              element={<Layout><FreeSlots /></Layout>}
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

createRoot(document.getElementById("root")!).render(<App />);