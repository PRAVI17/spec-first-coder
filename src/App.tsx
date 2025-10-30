import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Problems from "./pages/admin/Problems";
import CreateProblem from "./pages/admin/CreateProblem";
import Contests from "./pages/admin/Contests";
import CreateContest from "./pages/admin/CreateContest";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/problems"
              element={
                <ProtectedRoute requireAdmin>
                  <Problems />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/problems/create"
              element={
                <ProtectedRoute requireAdmin>
                  <CreateProblem />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/contests"
              element={
                <ProtectedRoute requireAdmin>
                  <Contests />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/contests/create"
              element={
                <ProtectedRoute requireAdmin>
                  <CreateContest />
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
