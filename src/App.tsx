import { lazy, Suspense, type ReactElement } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "@/components/ScrollToTop";
import ErrorBoundary from "@/components/ErrorBoundary";
import RequireAuth from "@/components/routing/RequireAuth";
import RequireRole from "@/components/routing/RequireRole";
import RequireGuardianConsent from "@/components/routing/RequireGuardianConsent";
import RequireFeature from "@/components/routing/RequireFeature";

const queryClient = new QueryClient();

const LandingPage = lazy(() => import("./pages/LandingPage"));
const EscolasLandingPage = lazy(() => import("./pages/EscolasLandingPage"));
const AcceptInvitePage = lazy(() => import("./pages/AcceptInvitePage"));
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
const BirthDateCompletionPage = lazy(() => import("./pages/BirthDateCompletionPage"));
const OrgDashboardPage = lazy(() => import("./pages/OrgDashboardPage"));
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
  /** Canonical feature key (subscription_plans.features) required to access this route server-side. */
  feature?: string;
};

// Ferramentas premium: exigem a feature "modules" (planos pagos liberam o
// currículo completo) OU a feature específica listada no schema de planos.
// Rotas sem `feature` continuam abertas a qualquer conta autenticada
// (gratuitas por padrão: dashboard, quiz, flashcards, breathing, etc.)
const privateRoutes: PrivateRoute[] = [
  { path: "/dashboard", element: <DashboardPage /> },
  { path: "/module/:id", element: <ModulePage /> },
  { path: "/quiz", element: <QuizPage /> },
  { path: "/flashcards", element: <FlashcardsPage /> },
  { path: "/evidence", element: <EvidencePage />, feature: "evidence" },
  { path: "/simulator", element: <SimulatorPage />, feature: "simulator" },
  { path: "/debate", element: <DebatePage />, feature: "debate" },
  { path: "/poetry", element: <PoetryPage />, feature: "poetry" },
  { path: "/codesign", element: <CoDesignPage />, feature: "codesign" },
  { path: "/alegria", element: <AlegriaPage /> },
  { path: "/admin", element: <AdminPage />, roles: ["teacher", "manager"] },
  { path: "/profile", element: <ProfilePage /> },
  { path: "/breathing", element: <BreathingPage /> },
  { path: "/lifewheel", element: <LifeWheelPage /> },
  { path: "/gratitude", element: <GratitudePage /> },
  { path: "/memory", element: <MemoryGamePage /> },
  { path: "/mindmap", element: <MindMapPage />, feature: "mindmap" },
  { path: "/emotions", element: <EmotionTrackerPage /> },
  { path: "/challenge21", element: <Challenge21Page />, feature: "challenge21" },
  { path: "/hypothesis", element: <HypothesisLabPage />, feature: "hypothesis" },
  { path: "/missions", element: <SocialMissionsPage />, feature: "missions" },
  { path: "/subscription", element: <SubscriptionPage /> },
  { path: "/constellation", element: <ConstellationPage /> },
  { path: "/mirror", element: <CognitiveMirrorPage /> },
  { path: "/future-self", element: <FutureSelfPage /> },
  { path: "/strengths", element: <SignatureStrengthsPage /> },
  { path: "/org", element: <OrgDashboardPage /> },
];

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/escolas" element={<EscolasLandingPage />} />
              <Route path="/aceitar-convite" element={<AcceptInvitePage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route
                path="/consentimento-responsavel"
                element={
                  <RequireAuth>
                    <GuardianConsentPage />
                  </RequireAuth>
                }
              />
              {/* Captura de data de nascimento para contas legadas (sem birth_date).
                Atrás de RequireAuth, mas FORA do gate de consentimento — senão o
                próprio needs_birth_date redirecionaria de volta em loop. */}
              <Route
                path="/completar-cadastro"
                element={
                  <RequireAuth>
                    <BirthDateCompletionPage />
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
                        ) : route.feature ? (
                          <RequireFeature feature={route.feature}>{route.element}</RequireFeature>
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
  </ErrorBoundary>
);

export default App;
