import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { ScrollToTop } from "@/routes/ScrollToTop";
import "./theme/tokens.css";
import "./theme/adaptive-density.css";
import "./theme/mobile-layout.css";
import "./globals.css";
import "@/app/admin/admin-shell.css";
import "@/app/admin/admin-dashboard-shell.css";
import "@/i18n/i18n";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ScrollToTop />
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
