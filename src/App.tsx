import { lazy, Suspense, type ReactElement } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import RequireAuth from "@/components/routing/RequireAuth";
import RequireRole from "@/components/routing/RequireRole";
import RequireGuardianConsent from "@/components/routing/RequireGuardianConsent";

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
const GuardianConsentPage = lazy(() => import("./pages/GuardianConsentPage"));
const SubscriptionSuccessPage = lazy(() => import("./pages/SubscriptionSuccessPage"));
const SubscriptionPendingPage = lazy(() => import("./pages/SubscriptionPendingPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteFallback = () => (
  <div className="min-h-screen bg-background" aria-busy="true" />
);

type AppRole = "student" | "teacher" | "manager";
type PrivateRoute = {
  path: string;
  element: ReactElement;
  roles?: AppRole[];
};

const privateRoutes: PrivateRoute[] = [
  { path: "/dashboard", element: <DashboardPage /> },
  { path: "/module/:id", element: <ModulePage /> },
  { path: "/quiz", element: <QuizPage /> },
  { path: "/flashcards", element: <FlashcardsPage /> },
  { path: "/evidence", element: <EvidencePage /> },
  { path: "/simulator", element: <SimulatorPage /> },
  { path: "/debate", element: <DebatePage /> },
  { path: "/poetry", element: <PoetryPage /> },
  { path: "/codesign", element: <CoDesignPage /> },
  { path: "/alegria", element: <AlegriaPage /> },
  { path: "/admin", element: <AdminPage />, roles: ["teacher", "manager"] },
  { path: "/profile", element: <ProfilePage /> },
  { path: "/breathing", element: <BreathingPage /> },
  { path: "/lifewheel", element: <LifeWheelPage /> },
  { path: "/gratitude", element: <GratitudePage /> },
  { path: "/memory", element: <MemoryGamePage /> },
  { path: "/mindmap", element: <MindMapPage /> },
  { path: "/emotions", element: <EmotionTrackerPage /> },
  { path: "/challenge21", element: <Challenge21Page /> },
  { path: "/hypothesis", element: <HypothesisLabPage /> },
  { path: "/missions", element: <SocialMissionsPage /> },
  { path: "/subscription", element: <SubscriptionPage /> },
  { path: "/constellation", element: <ConstellationPage /> },
  { path: "/mirror", element: <CognitiveMirrorPage /> },
  { path: "/future-self", element: <FutureSelfPage /> },
  { path: "/strengths", element: <SignatureStrengthsPage /> },
];

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
            <Route
              path="/consentimento-responsavel"
              element={
                <RequireAuth>
                  <GuardianConsentPage />
                </RequireAuth>
              }
            />
            {/* Retorno do checkout: atrás de RequireAuth, mas fora do gate de
                consentimento — quem acabou de pagar não deve ser bloqueado
                aqui. A ativação real é confirmada via get_my_plan/webhook. */}
            <Route
              path="/assinatura/sucesso"
              element={
                <RequireAuth>
                  <SubscriptionSuccessPage />
                </RequireAuth>
              }
            />
            <Route
              path="/assinatura/pendente"
              element={
                <RequireAuth>
                  <SubscriptionPendingPage />
                </RequireAuth>
              }
            />
            {privateRoutes.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={
                  <RequireAuth>
                    <RequireGuardianConsent>
                      {route.roles ? (
                        <RequireRole allowedRoles={route.roles}>{route.element}</RequireRole>
                      ) : (
                        route.element
                      )}
                    </RequireGuardianConsent>
                  </RequireAuth>
                }
              />
            ))}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
