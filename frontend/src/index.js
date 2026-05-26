import React from "react";
import ReactDOM from "react-dom/client";
import "@/index.css";
import App from "@/App";
import { Toaster } from "react-hot-toast";
import { BrowserRouter } from "react-router-dom";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: "rgba(20, 20, 20, 0.92)",
            color: "#F7F7F7",
            border: "1px solid rgba(212, 175, 55, 0.3)",
            backdropFilter: "blur(20px)",
            fontFamily: "Outfit, sans-serif",
            fontSize: "14px",
            letterSpacing: "0.01em",
          },
          success: {
            iconTheme: { primary: "#D4AF37", secondary: "#0A0A0A" },
          },
          error: {
            iconTheme: { primary: "#E25555", secondary: "#0A0A0A" },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
