import { useEffect, useRef } from "react";
import { ClerkProvider, SignIn, SignUp, Show, useClerk } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { queryClient } from "@/lib/queryClient";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/LandingPage";
import OnboardingPage from "@/pages/OnboardingPage";
import SellerDashboard from "@/pages/seller/SellerDashboard";
import ListBusiness from "@/pages/seller/ListBusiness";
import MyListings from "@/pages/seller/MyListings";
import ContactRequests from "@/pages/seller/ContactRequests";
import Marketplace from "@/pages/investor/Marketplace";
import ListingDetail from "@/pages/investor/ListingDetail";
import WatchlistPage from "@/pages/investor/WatchlistPage";
import PrivateDeals from "@/pages/investor/PrivateDeals";
import Pipeline from "@/pages/investor/Pipeline";
import PricingPage from "@/pages/PricingPage";
import MessagesPage from "@/pages/MessagesPage";
import ProfilePage from "@/pages/ProfilePage";
import SettingsPage from "@/pages/SettingsPage";
import Analytics from "@/pages/investor/Analytics";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  baseTheme: dark,
  cssLayerName: "clerk" as const,
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "hsl(191 100% 50%)",
    colorForeground: "hsl(210 40% 96%)",
    colorMutedForeground: "hsl(215 20% 55%)",
    colorDanger: "hsl(0 72% 51%)",
    colorBackground: "hsl(222 47% 11%)",
    colorInput: "hsl(217 33% 15%)",
    colorInputForeground: "hsl(210 40% 96%)",
    colorNeutral: "hsl(217 33% 18%)",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[hsl(222_47%_11%)] border border-[hsl(217_33%_18%)] rounded-2xl w-[440px] max-w-full overflow-hidden shadow-2xl",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[hsl(210_40%_96%)] font-bold",
    headerSubtitle: "text-[hsl(215_20%_55%)]",
    socialButtonsBlockButtonText: "text-[hsl(210_40%_90%)]",
    formFieldLabel: "text-[hsl(210_40%_80%)]",
    footerActionLink: "text-[hsl(45_93%_55%)] hover:text-[hsl(45_93%_65%)]",
    footerActionText: "text-[hsl(215_20%_55%)]",
    dividerText: "text-[hsl(215_20%_45%)]",
    identityPreviewEditButton: "text-[hsl(45_93%_55%)]",
    formFieldSuccessText: "text-[hsl(142_71%_45%)]",
    alertText: "text-[hsl(210_40%_90%)]",
    logoBox: "flex justify-center",
    logoImage: "h-8",
    socialButtonsBlockButton: "border border-[hsl(217_33%_22%)] bg-[hsl(222_47%_13%)] hover:bg-[hsl(222_47%_16%)]",
    formButtonPrimary: "bg-[hsl(45_93%_55%)] text-[hsl(222_47%_8%)] hover:bg-[hsl(45_93%_62%)] font-semibold",
    formFieldInput: "bg-[hsl(217_33%_15%)] border-[hsl(217_33%_22%)] text-[hsl(210_40%_96%)]",
    footerAction: "border-t border-[hsl(217_33%_18%)]",
    dividerLine: "bg-[hsl(217_33%_18%)]",
    alert: "border border-[hsl(217_33%_22%)]",
    otpCodeFieldInput: "bg-[hsl(217_33%_15%)] border-[hsl(217_33%_22%)] text-[hsl(210_40%_96%)]",
    formFieldRow: "",
    main: "",
  },
};

function SignInPage() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/" /></Show>
      <Show when="signed-out">
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
        </div>
      </Show>
    </>
  );
}

function SignUpPage() {
  return (
    <>
      <Show when="signed-in"><Redirect to="/" /></Show>
      <Show when="signed-out">
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
          <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
        </div>
      </Show>
    </>
  );
}

function ClerkQueryClientCacheInvalidator() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const userId = user?.id ?? null;
      if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== userId) {
        qc.clear();
      }
      prevUserIdRef.current = userId;
    });
    return unsub;
  }, [addListener, qc]);

  return null;
}

function HomeRedirect() {
  const { data: user, isLoading } = useCurrentUser();
  if (isLoading) return null;
  if (!user) return <LandingPage />;
  if (!user.role) return <Redirect to="/onboarding" />;
  if (user.role === "seller") return <Redirect to="/seller/dashboard" />;
  return <Redirect to="/investor/marketplace" />;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out"><Redirect to="/" /></Show>
    </>
  );
}

function AppRoutes() {
  return (
    <Switch>
      <Route path="/" component={HomeRedirect} />
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route path="/onboarding">
        <ProtectedRoute><OnboardingPage /></ProtectedRoute>
      </Route>
      {/* Seller routes */}
      <Route path="/seller/dashboard">
        <ProtectedRoute><SellerDashboard /></ProtectedRoute>
      </Route>
      <Route path="/seller/list">
        <ProtectedRoute><ListBusiness /></ProtectedRoute>
      </Route>
      <Route path="/seller/listings">
        <ProtectedRoute><MyListings /></ProtectedRoute>
      </Route>
      <Route path="/seller/requests">
        <ProtectedRoute><ContactRequests /></ProtectedRoute>
      </Route>
      {/* Investor routes */}
      <Route path="/investor/marketplace">
        <ProtectedRoute><Marketplace /></ProtectedRoute>
      </Route>
      <Route path="/investor/marketplace/:id">
        {(params) => <ProtectedRoute><ListingDetail id={Number(params.id)} /></ProtectedRoute>}
      </Route>
      <Route path="/investor/watchlist">
        <ProtectedRoute><WatchlistPage /></ProtectedRoute>
      </Route>
      <Route path="/investor/private-deals">
        <ProtectedRoute><PrivateDeals /></ProtectedRoute>
      </Route>
      <Route path="/investor/pipeline">
        <ProtectedRoute><Pipeline /></ProtectedRoute>
      </Route>
      <Route path="/pricing">
        <PricingPage />
      </Route>
      {/* Investor analytics */}
      <Route path="/investor/analytics">
        <ProtectedRoute><Analytics /></ProtectedRoute>
      </Route>
      {/* Messages */}
      <Route path="/messages">
        <ProtectedRoute><MessagesPage /></ProtectedRoute>
      </Route>
      <Route path="/messages/:threadId">
        {(params) => <ProtectedRoute><MessagesPage threadId={Number(params.threadId)} /></ProtectedRoute>}
      </Route>
      {/* Account */}
      <Route path="/profile">
        <ProtectedRoute><ProfilePage /></ProtectedRoute>
      </Route>
      <Route path="/settings">
        <ProtectedRoute><SettingsPage /></ProtectedRoute>
      </Route>
      {/* Subscription — alias to pricing */}
      <Route path="/subscription">
        <PricingPage />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: "Welcome back to DealIntel", subtitle: "India's M&A intelligence platform" } },
        signUp: { start: { title: "Join DealIntel India", subtitle: "Connect with buyers and sellers across India" } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <ClerkQueryClientCacheInvalidator />
        <TooltipProvider>
          <AppRoutes />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}

export default App;
