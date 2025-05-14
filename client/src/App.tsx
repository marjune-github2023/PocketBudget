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

function Router() {
  return (
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
