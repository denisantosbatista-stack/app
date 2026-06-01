import { Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Home from "@/pages/Home";
import Studio from "@/pages/Studio";
import Library from "@/pages/Library";
import Calculator from "@/pages/Calculator";
import Compare from "@/pages/Compare";
import Mixer from "@/pages/Mixer";
import Tips from "@/pages/Tips";
import Mentora from "@/pages/Mentora";
import Trends from "@/pages/Trends";
import Collections from "@/pages/Collections";
import Feed from "@/pages/Feed";
import Marketplace from "@/pages/Marketplace";
import Challenges from "@/pages/Challenges";
import PublicProfile from "@/pages/PublicProfile";
import PublicDNAPage from "@/pages/PublicDNAPage";
import WaitList from "@/pages/WaitList";
import Privacy from "@/pages/Privacy";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Pricing from "@/pages/Pricing";
import OpeningTour from "@/components/OpeningTour";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import UpgradeInfoModal from "@/components/UpgradeInfoModal";
import RequireAuth from "@/components/RequireAuth";
import { AuthProvider } from "@/contexts/AuthContext";
import { usePaletteStore } from "@/store/usePaletteStore";

function App() {
  const loadSaved = usePaletteStore((s) => s.loadSaved);
  const location = useLocation();
  const isPublic = location.pathname.startsWith("/dna/") || location.pathname === "/wait-list";
  const isAuthPage = location.pathname === "/login" || location.pathname === "/register";

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  if (isPublic) {
    return (
      <AuthProvider>
        <div className="min-h-screen bg-bone text-ink-text" data-testid="app-public">
          <Routes>
            <Route path="/dna/:id" element={<PublicDNAPage />} />
            <Route path="/wait-list" element={<WaitList />} />
          </Routes>
        </div>
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <div className="min-h-screen bg-ink text-ink-text relative overflow-x-hidden" data-testid="app-root">
        {!isAuthPage && <Navbar />}
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/studio" element={<Studio />} />
            <Route
              path="/library"
              element={
                <RequireAuth>
                  <Library />
                </RequireAuth>
              }
            />
            <Route
              path="/biblioteca"
              element={
                <RequireAuth>
                  <Library />
                </RequireAuth>
              }
            />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/calculadora" element={<Calculator />} />
            <Route path="/calculadora/:tab" element={<Calculator />} />
            <Route
              path="/compare"
              element={
                <RequireAuth>
                  <Compare />
                </RequireAuth>
              }
            />
            <Route path="/mixer" element={<Mixer />} />
            <Route path="/tips" element={<Tips />} />
            <Route path="/mentora" element={<Mentora />} />
            <Route path="/trends" element={<Trends />} />
            <Route path="/tendencias" element={<Trends />} />
            <Route
              path="/collections"
              element={
                <RequireAuth>
                  <Collections />
                </RequireAuth>
              }
            />
            <Route path="/feed" element={<Feed />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/u/:handle" element={<PublicProfile />} />
            <Route path="/privacidade" element={<Privacy />} />
            <Route path="/planos" element={<Pricing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
          </Routes>
        </main>
        {!isAuthPage && (
          <footer className="border-t border-black/[0.06] py-6 md:py-10 px-6 pb-36 md:pb-10 text-center text-[10px] md:text-xs tracking-[0.2em] uppercase text-ink-muted">
            <div className="flex items-center justify-center gap-3 flex-wrap">
              <span>LindArt · Studio de Resina Premium · © 2026</span>
              <span className="text-gold">·</span>
              <a href="/privacidade" className="hover:text-gold transition-colors" data-testid="footer-privacy-link">
                Privacidade
              </a>
            </div>
          </footer>
        )}
        {!isAuthPage && <MobileNav />}
        <OnboardingFlow />
        <OpeningTour />
        <UpgradeInfoModal />
      </div>
    </AuthProvider>
  );
}

export default App;
