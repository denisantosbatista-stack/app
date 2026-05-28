import { Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "@/components/Navbar";
import MobileNav from "@/components/MobileNav";
import Home from "@/pages/Home";
import Studio from "@/pages/Studio";
import Library from "@/pages/Library";
import Calculator from "@/pages/Calculator";
import Compare from "@/pages/Compare";
import Tips from "@/pages/Tips";
import { usePaletteStore } from "@/store/usePaletteStore";

function App() {
  const loadSaved = usePaletteStore((s) => s.loadSaved);

  useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  return (
    <div className="min-h-screen bg-ink text-ink-text relative overflow-x-hidden" data-testid="app-root">
      <Navbar />
      <main className="pb-24 md:pb-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/studio" element={<Studio />} />
          <Route path="/library" element={<Library />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/tips" element={<Tips />} />
        </Routes>
      </main>
      <MobileNav />
      <footer className="border-t border-black/[0.06] py-10 px-6 text-center text-xs tracking-[0.2em] uppercase text-ink-muted">
        LindArt · Studio de Resina Premium · © 2026
      </footer>
    </div>
  );
}

export default App;
