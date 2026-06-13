import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";

const queryClient = new QueryClient();

const LandingPage = lazy(() => import("./pages/LandingPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const ModulePage = lazy(() => import("./pages/ModulePage"));
const QuizPage = lazy(() => import("./pages/QuizPage"));
const FlashcardsPage = lazy(() => import("./pages/FlashcardsPage"));
const EvidencePage = lazy(() => import("./pages/EvidencePage"));
const SimulatorPage = lazy(() => import("./pages/SimulatorPage"));
const DebatePage = lazy(() => import("./pages/DebatePage"));
const PoetryPage = lazy(() => import("./pages/PoetryPage"));
const CoDesignPage = lazy(() => import("./pages/CoDesignPage"));
const AlegriaPage = lazy(() => import("./pages/AlegriaPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const ProfilePage = lazy(() => import("./pages/ProfilePage"));
const BreathingPage = lazy(() => import("./pages/BreathingPage"));
const LifeWheelPage = lazy(() => import("./pages/LifeWheelPage"));
const GratitudePage = lazy(() => import("./pages/GratitudePage"));
const MemoryGamePage = lazy(() => import("./pages/MemoryGamePage"));
const MindMapPage = lazy(() => import("./pages/MindMapPage"));
const EmotionTrackerPage = lazy(() => import("./pages/EmotionTrackerPage"));
const Challenge21Page = lazy(() => import("./pages/Challenge21Page"));
const HypothesisLabPage = lazy(() => import("./pages/HypothesisLabPage"));
const SocialMissionsPage = lazy(() => import("./pages/SocialMissionsPage"));
const SubscriptionPage = lazy(() => import("./pages/SubscriptionPage"));
const ConstellationPage = lazy(() => import("./pages/ConstellationPage"));
const CognitiveMirrorPage = lazy(() => import("./pages/CognitiveMirrorPage"));
const FutureSelfPage = lazy(() => import("./pages/FutureSelfPage"));
const SignatureStrengthsPage = lazy(() => import("./pages/SignatureStrengthsPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteFallback = () => (
  <div className="min-h-screen bg-background" aria-busy="true" />
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <ScrollToTop />
        <Suspense fallback={<RouteFallback />}>
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
            <Route path="/mirror" element={<CognitiveMirrorPage />} />
            <Route path="/future-self" element={<FutureSelfPage />} />
            <Route path="/strengths" element={<SignatureStrengthsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
