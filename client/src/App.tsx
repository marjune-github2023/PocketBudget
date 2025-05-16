import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Tablets from "@/pages/tablets";
import Students from "@/pages/students";
import Borrowing from "@/pages/borrowing";
import Returns from "@/pages/returns";
import Reports from "@/pages/reports";
import DashboardLayout from "@/components/layout/dashboard-layout";
import AdminLogin from "@/pages/admin-login";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminChangePassword from "@/pages/admin-change-password";
import { useEffect } from "react";
import { useLocation } from "wouter";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    // Only check on non-admin-login pages
    if (!location.startsWith("/admin/login")) {
      fetch("/api/admin/me").then(res => {
        if (!res.ok) setLocation("/admin/login");
      });
    }
  }, [location, setLocation]);
  return <>{children}</>;
}

function Router() {
  return (
    <AuthGuard>
      <Switch>
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/change-password" component={AdminChangePassword} />
        <Route>
          <DashboardLayout>
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/tablets" component={Tablets} />
              <Route path="/students" component={Students} />
              <Route path="/borrowing" component={Borrowing} />
              <Route path="/returns" component={Returns} />
              <Route path="/reports" component={Reports} />
              <Route component={NotFound} />
            </Switch>
          </DashboardLayout>
        </Route>
      </Switch>
    </AuthGuard>
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
