import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import QuizPage from "./pages/QuizPage";
import FlashcardsPage from "./pages/FlashcardsPage";
import EvidencePage from "./pages/EvidencePage";
import ModulePage from "./pages/ModulePage";
import SimulatorPage from "./pages/SimulatorPage";
import DebatePage from "./pages/DebatePage";
import PoetryPage from "./pages/PoetryPage";
import CoDesignPage from "./pages/CoDesignPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/module/:id" element={<ModulePage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/flashcards" element={<FlashcardsPage />} />
          <Route path="/evidence" element={<EvidencePage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/debate" element={<DebatePage />} />
          <Route path="/poetry" element={<PoetryPage />} />
          <Route path="/codesign" element={<CoDesignPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
