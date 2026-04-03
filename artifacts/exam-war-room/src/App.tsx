import { useEffect } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Tutor from "@/pages/tutor";
import Doubt from "@/pages/doubt";
import MockTest from "@/pages/mock-test";
import Planner from "@/pages/planner";
import Notes from "@/pages/notes";
import Profile from "@/pages/profile";
import { Layout } from "@/components/layout";

const queryClient = new QueryClient();

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/login");
    }
  }, [loading, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-primary font-mono uppercase tracking-widest animate-pulse">
        Initializing System...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Layout>
      <Component />
    </Layout>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/tutor">
        <ProtectedRoute component={Tutor} />
      </Route>
      <Route path="/doubt">
        <ProtectedRoute component={Doubt} />
      </Route>
      <Route path="/mock-test">
        <ProtectedRoute component={MockTest} />
      </Route>
      <Route path="/planner">
        <ProtectedRoute component={Planner} />
      </Route>
      <Route path="/notes">
        <ProtectedRoute component={Notes} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={Profile} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
          <SonnerToaster theme="dark" position="bottom-right" />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
