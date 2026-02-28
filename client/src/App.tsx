import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LayoutShell } from "@/components/layout-shell";
import { useAuth } from "@/hooks/use-auth";

import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import JobsPage from "@/pages/jobs";
import InventoryPage from "@/pages/inventory";
import ExpensesPage from "@/pages/expenses";
import WorkersPage from "@/pages/workers";
import CustomersPage from "@/pages/customers";
import TravelPage from "@/pages/travel";
import NotesPage from "@/pages/notes";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  if (!user) {
    return <AuthPage />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      <Route path="/">
        <LayoutShell>
          <ProtectedRoute component={Dashboard} />
        </LayoutShell>
      </Route>
      
      <Route path="/jobs">
        <LayoutShell>
          <ProtectedRoute component={JobsPage} />
        </LayoutShell>
      </Route>

      <Route path="/inventory">
        <LayoutShell>
          <ProtectedRoute component={InventoryPage} />
        </LayoutShell>
      </Route>

      <Route path="/expenses">
        <LayoutShell>
          <ProtectedRoute component={ExpensesPage} />
        </LayoutShell>
      </Route>

      <Route path="/workers">
        <LayoutShell>
          <ProtectedRoute component={WorkersPage} />
        </LayoutShell>
      </Route>

      <Route path="/customers">
        <LayoutShell>
          <ProtectedRoute component={CustomersPage} />
        </LayoutShell>
      </Route>

      <Route path="/travel">
        <LayoutShell>
          <ProtectedRoute component={TravelPage} />
        </LayoutShell>
      </Route>

      <Route path="/notes">
        <LayoutShell>
          <ProtectedRoute component={NotesPage} />
        </LayoutShell>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
