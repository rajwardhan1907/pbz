import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, 
  Package, 
  Wallet, 
  Users, 
  Briefcase, 
  UserSquare2, 
  Car, 
  NotebookPen, 
  LogOut,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

interface LayoutShellProps {
  children: React.ReactNode;
}

export function LayoutShell({ children }: LayoutShellProps) {
  const { logoutMutation, user } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return <>{children}</>;

  const navItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/" },
    { icon: UserSquare2, label: "Customers", href: "/customers" },
    { icon: Briefcase, label: "Jobs", href: "/jobs" },
    { icon: Package, label: "Inventory", href: "/inventory" },
    { icon: Wallet, label: "Expenses", href: "/expenses" },
    { icon: Users, label: "Workers", href: "/workers" },
    { icon: Car, label: "Travel", href: "/travel" },
    { icon: NotebookPen, label: "Notes", href: "/notes" },
  ];

  const NavContent = () => (
    <div className="flex flex-col h-full bg-slate-50 border-r border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-primary" />
          PaintBiz Pro
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-mono">v1.0.0 • Admin</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div 
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer
                  ${isActive 
                    ? "bg-white text-primary border border-slate-200 shadow-sm" 
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }
                `}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-slate-400"}`} />
                {item.label}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="flex items-center justify-between mb-4 px-2">
          <div className="text-sm font-medium text-slate-900">{user.username}</div>
        </div>
        <Button 
          variant="outline" 
          className="w-full justify-start text-slate-600 hover:text-destructive hover:bg-destructive/5"
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-white">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block w-64 fixed inset-y-0 z-50">
        <NavContent />
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-40">
        <div className="font-bold text-lg flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-primary" />
          PaintBiz
        </div>
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-8 pt-20 lg:pt-8 bg-white min-h-screen">
        <div className="max-w-6xl mx-auto space-y-6">
          {children}
        </div>
      </main>
    </div>
  );
}
