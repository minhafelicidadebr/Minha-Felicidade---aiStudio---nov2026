import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import ModulePage from "./pages/ModulePage";
import QuizPage from "./pages/QuizPage";
import FlashcardsPage from "./pages/FlashcardsPage";
import EvidencePage from "./pages/EvidencePage";
import SimulatorPage from "./pages/SimulatorPage";
import DebatePage from "./pages/DebatePage";
import PoetryPage from "./pages/PoetryPage";
import CoDesignPage from "./pages/CoDesignPage";
import AlegriaPage from "./pages/AlegriaPage";
import AdminPage from "./pages/AdminPage";
import ProfilePage from "./pages/ProfilePage";
import BreathingPage from "./pages/BreathingPage";
import LifeWheelPage from "./pages/LifeWheelPage";
import GratitudePage from "./pages/GratitudePage";
import MemoryGamePage from "./pages/MemoryGamePage";
import MindMapPage from "./pages/MindMapPage";
import EmotionTrackerPage from "./pages/EmotionTrackerPage";
import Challenge21Page from "./pages/Challenge21Page";
import HypothesisLabPage from "./pages/HypothesisLabPage";
import SocialMissionsPage from "./pages/SocialMissionsPage";
import SubscriptionPage from "./pages/SubscriptionPage";
import ConstellationPage from "./pages/ConstellationPage";
import CognitiveMirrorPage from "./pages/CognitiveMirrorPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/module/:id" element={<ModulePage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/flashcards" element={<FlashcardsPage />} />
          <Route path="/evidence" element={<EvidencePage />} />
          <Route path="/simulator" element={<SimulatorPage />} />
          <Route path="/debate" element={<DebatePage />} />
          <Route path="/poetry" element={<PoetryPage />} />
          <Route path="/codesign" element={<CoDesignPage />} />
          <Route path="/alegria" element={<AlegriaPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/breathing" element={<BreathingPage />} />
          <Route path="/lifewheel" element={<LifeWheelPage />} />
          <Route path="/gratitude" element={<GratitudePage />} />
          <Route path="/memory" element={<MemoryGamePage />} />
          <Route path="/mindmap" element={<MindMapPage />} />
          <Route path="/emotions" element={<EmotionTrackerPage />} />
          <Route path="/challenge21" element={<Challenge21Page />} />
          <Route path="/hypothesis" element={<HypothesisLabPage />} />
          <Route path="/missions" element={<SocialMissionsPage />} />
          <Route path="/subscription" element={<SubscriptionPage />} />
          <Route path="/constellation" element={<ConstellationPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
