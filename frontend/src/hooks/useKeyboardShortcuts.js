import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

// Atalhos globais. Ignora quando foco está em input/textarea.
export default function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const isTyping = (e) => {
      const t = e.target;
      const tag = (t?.tagName || "").toLowerCase();
      return tag === "input" || tag === "textarea" || t?.isContentEditable;
    };

    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(e)) return;

      switch (e.key.toLowerCase()) {
        case "g":
          navigate("/studio");
          break;
        case "b":
          navigate("/library");
          break;
        case "c":
          navigate("/compare");
          break;
        case "p":
          navigate("/calculator");
          break;
        case "h":
          navigate("/");
          break;
        case "?":
          toast(
            "Atalhos: H=Início · G=Studio · B=Biblioteca · C=Comparar · P=Proporções",
            { duration: 4500, icon: "⌨️" }
          );
          break;
        default:
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [navigate]);
}
