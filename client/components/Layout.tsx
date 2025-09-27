import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Avatar, 
  AvatarFallback, 
  AvatarImage 
} from "@/components/ui/avatar";
import { useAuth } from "@/hooks/AuthContext";
import { useMemo } from "react";

import { 
  Calendar, 
  Users, 
  BookOpen, 
  Home, 
  Clock, 
  LogOut, 
  Megaphone, 
  Menu,
  Settings,
  UserCircle
} from "lucide-react";

// --- INTERFACE ---
interface LayoutProps {
  children: React.ReactNode;
}

// --- NAVIGATION ITEMS ---
const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Announcements", href: "/announcements", icon: Megaphone },
  { name: "Faculty Management", href: "/faculty", icon: Users },
  { name: "Batch Management", href: "/batches", icon: Calendar },
  { name: "Student Management", href: "/students", icon: Users },
  { name: "Attendance", href: "/attendance", icon: Calendar },
  { name: "Suggestions", href: "/suggestions", icon: Users },
  { name: "Free Slots", href: "/free-slots", icon: Clock },
  { name: "Skills", href: "/skills", icon: BookOpen },
  { name: "Schedule", href: "/schedule", icon: Calendar },
];

// --- SIDEBAR COMPONENT ---
const SidebarContent = ({ onLinkClick }: { onLinkClick?: () => void }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem("token");
    if (onLinkClick) onLinkClick();
    navigate("/login");
  };
  
  const filteredNavigation = useMemo(() => {
    if (user?.role === 'faculty') {
      return navigation.filter(item =>
        ["Dashboard", "Batch Management", "Free Slots", "Attendance", "Schedule"].includes(item.name)
      );
    }
    return navigation;
  }, [user]);
  
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold" onClick={onLinkClick}>
          <img src="/logo.png" alt="RVM CAD Logo" className="h-8 w-auto" />
          <span className="hidden sm:inline-block">RVM CAD</span>
        </Link>
      </div>
      
      {/* Main Navigation */}
      <nav className="flex-1 space-y-2 p-4">
        {filteredNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted",
                isActive && "bg-muted text-primary font-semibold"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout Button at the bottom */}
      <div className="mt-auto p-4 border-t">
         <Button onClick={handleLogout} variant="ghost" className="w-full justify-start">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
         </Button>
      </div>
    </div>
  );
};

// --- MAIN LAYOUT COMPONENT ---
export default function Layout({ children }: LayoutProps) {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden border-r bg-muted/40 md:block">
        <SidebarContent />
      </aside>

      <div className="flex flex-col">
        {/* --- HEADER --- */}
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6 sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
               <SidebarContent onLinkClick={() => document.querySelector<HTMLButtonElement>('[data-state="open"]')?.click()} />
            </SheetContent>
          </Sheet>

          {/* Header Right Side: User Menu */}
          <div className="ml-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <Avatar>
                    <AvatarImage src="https://ui.shadcn.com/avatars/01.png" alt="@user" />
                    <AvatarFallback>U</AvatarFallback>
                  </Avatar>
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem><UserCircle className="mr-2 h-4 w-4"/> Profile</DropdownMenuItem>
                <DropdownMenuItem><Settings className="mr-2 h-4 w-4"/> Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => document.querySelector<HTMLButtonElement>('#logout-btn-desktop')?.click()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Hidden button for DropdownMenu to trigger logout logic */}
            <button id="logout-btn-desktop" onClick={() => {
                localStorage.removeItem("token");
                window.location.href = "/login";
            }} className="hidden" />
          </div>
        </header>

        {/* --- MAIN CONTENT --- */}
        <main className="flex-1 p-4 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}