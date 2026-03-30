import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import InstitutionType from "./pages/create/InstitutionType";
import ClassDetails from "./pages/create/ClassDetails";
import StaffDetails from "./pages/create/StaffDetails";
import TimetableSetup from "./pages/create/TimetableSetup";
import ThemeSelection from "./pages/create/ThemeSelection";
import GenerateTimetable from "./pages/create/GenerateTimetable";
import TimetableView from "./pages/TimetableView";
import TimetableList from "./pages/TimetableList";
import Help from "./pages/Help";
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
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create" element={<InstitutionType />} />
            <Route path="/create/setup" element={<TimetableSetup />} />
            <Route path="/create/classes" element={<ClassDetails />} />
            <Route path="/create/staff" element={<StaffDetails />} />
            <Route path="/create/theme" element={<ThemeSelection />} />
            <Route path="/create/generate" element={<GenerateTimetable />} />
            <Route path="/timetable/:id" element={<TimetableView />} />
            <Route path="/timetables" element={<TimetableList />} />
            <Route path="/help" element={<Help />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
