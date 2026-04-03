import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  ShieldAlert,
  Target,
  Crosshair,
  Map,
  BookOpen,
  UserCircle,
  LogOut,
  Swords,
  Menu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const NAVIGATION = [
  { name: "HQ", fullName: "War Room HQ", href: "/", icon: ShieldAlert },
  { name: "Tutor", fullName: "Mission Briefing", href: "/tutor", icon: Target },
  { name: "Doubt", fullName: "Doubt Solver", href: "/doubt", icon: Crosshair },
  { name: "Arena", fullName: "Battle Arena", href: "/mock-test", icon: Swords },
  { name: "Planner", fullName: "Study Planner", href: "/planner", icon: Map },
  { name: "Intel", fullName: "Intel Database", href: "/notes", icon: BookOpen },
  { name: "Record", fullName: "Service Record", href: "/profile", icon: UserCircle },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLocation("/login");
  };

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {NAVIGATION.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.href;
        return (
          <Link key={item.name} href={item.href}>
            <span
              onClick={onNavigate}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all font-semibold uppercase tracking-wider text-sm cursor-pointer ${
                isActive
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.fullName}
            </span>
          </Link>
        );
      })}
    </>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border/50 bg-card sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <span className="font-bold uppercase tracking-widest text-primary text-sm">Exam War Room</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-primary h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] bg-background border-r border-primary/20 p-0">
            <div className="flex flex-col h-full">
              <div className="p-5 border-b border-primary/20">
                <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest">
                  <ShieldAlert className="h-6 w-6" />
                  War Room
                </div>
              </div>
              <div className="p-4 border-b border-primary/10 flex items-center gap-3 bg-black/20">
                <Avatar className="h-8 w-8 border border-primary/50">
                  <AvatarImage src={user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold text-xs">
                    {user?.user_metadata?.full_name?.[0]?.toUpperCase() || 'C'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-xs font-bold uppercase truncate">{user?.user_metadata?.full_name || 'Cadet'}</span>
                  <span className="text-[10px] text-muted-foreground truncate">{user?.email}</span>
                </div>
              </div>
              <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                <NavLinks />
              </nav>
              <div className="p-4 border-t border-primary/20">
                <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 uppercase tracking-widest font-bold text-xs" onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Abort Mission
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-primary/20 bg-card/50 backdrop-blur-sm shadow-xl shadow-black/50 relative z-10">
        <div className="p-6 border-b border-primary/20">
          <div className="flex items-center gap-3 text-primary font-bold uppercase tracking-widest text-xl">
            <ShieldAlert className="h-8 w-8" />
            <span>War Room</span>
          </div>
        </div>

        <div className="p-4 border-b border-primary/10 flex items-center gap-3 bg-black/20">
          <Avatar className="h-10 w-10 border-2 border-primary/50">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary/20 text-primary font-bold">
              {user?.user_metadata?.full_name?.[0]?.toUpperCase() || 'C'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden">
            <span className="text-sm font-bold uppercase truncate text-foreground">
              {user?.user_metadata?.full_name || 'Cadet'}
            </span>
            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <NavLinks />
        </nav>

        <div className="p-4 border-t border-primary/20 bg-black/40">
          <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 uppercase tracking-widest font-bold transition-all" onClick={handleLogout}>
            <LogOut className="mr-2 h-5 w-5" />
            Abort Mission
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,136,0.03)_0,transparent_100%)] pointer-events-none" />
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-8 pb-20 md:pb-8">
          <div className="max-w-6xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-primary/20 z-50">
        <div className="flex items-center justify-around h-14">
          {NAVIGATION.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href}>
                <button className={`flex flex-col items-center gap-0.5 px-1 py-1 min-w-[44px] transition-colors ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  <Icon className={`h-5 w-5 ${isActive ? 'drop-shadow-[0_0_6px_rgba(0,255,136,0.8)]' : ''}`} />
                  <span className={`text-[8px] uppercase tracking-wider font-bold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    {item.name}
                  </span>
                </button>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
