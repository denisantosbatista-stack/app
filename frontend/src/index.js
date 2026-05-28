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
            background: "rgba(255, 255, 255, 0.95)",
            color: "#141414",
            border: "1px solid rgba(184, 149, 74, 0.3)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(60, 50, 30, 0.12)",
            fontFamily: "Outfit, sans-serif",
            fontSize: "14px",
            letterSpacing: "0.01em",
          },
          success: {
            iconTheme: { primary: "#B8954A", secondary: "#FFFFFF" },
          },
          error: {
            iconTheme: { primary: "#C04545", secondary: "#FFFFFF" },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
