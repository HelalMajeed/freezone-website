"use client";

import { Outlet, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { Toaster as SonnerToaster } from "sonner";
import { applyDarkModeFromStorage } from "@/lib/admin/admin-user-prefs";
import { useEffect } from "react";
import styles from "./AdminChrome.module.css";

export function AdminChrome() {
  const pathname = useLocation().pathname ?? "";
  const isLogin = pathname === "/admin/login";

  useEffect(() => {
    applyDarkModeFromStorage();
  }, []);

  return (
    <div className={isLogin ? `admin-login-root ${styles.loginWrap}` : undefined}>
      <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
      <SonnerToaster position="top-right" richColors closeButton duration={4000} visibleToasts={3} />
      <Outlet />
    </div>
  );
}
