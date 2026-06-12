import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { AccessibilityProvider } from "@/context/AccessibilityContext";
import AccessibilityWidget from "@/components/shared/AccessibilityWidget";
import ProtectedRoute from "@/routes/ProtectedRoute";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import CandidateDashboard from "./pages/candidate/CandidateDashboard";
import JobSearchPage from "./pages/candidate/JobSearchPage";
import JobDetailPage from "./pages/candidate/JobDetailPage";
import CandidateProfile from "./pages/candidate/CandidateProfile";
import RecruiterDashboard from "./pages/recruiter/RecruiterDashboard";
import JobApplicantsPage from "./pages/recruiter/JobApplicantsPage";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AccountSettings from "./pages/settings/AccountSettings";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AccessibilityProvider>
          <Toaster />
          <Sonner />
          <AccessibilityWidget />
          <BrowserRouter>
            <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/jobs" element={<JobSearchPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/candidate" element={<ProtectedRoute allowedRoles={["candidate"]}><CandidateDashboard /></ProtectedRoute>} />
            <Route path="/candidate/profile" element={<ProtectedRoute allowedRoles={["candidate"]}><CandidateProfile /></ProtectedRoute>} />
            <Route path="/recruiter" element={<ProtectedRoute allowedRoles={["recruiter"]}><RecruiterDashboard /></ProtectedRoute>} />
            <Route path="/recruiter/job/:jobId/applicants" element={<ProtectedRoute allowedRoles={["recruiter"]}><JobApplicantsPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute allowedRoles={["candidate", "recruiter", "admin"]}><AccountSettings /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </AccessibilityProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
