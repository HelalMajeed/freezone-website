"use client";

import { Outlet, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import styles from "./AdminChrome.module.css";

export function AdminChrome() {
  const pathname = useLocation().pathname ?? "";
  const isLogin = pathname === "/admin/login";

  return (
    <div className={isLogin ? `admin-login-root ${styles.loginWrap}` : undefined}>
      <Toaster position="top-center" toastOptions={{ duration: 3500 }} />
      <Outlet />
    </div>
  );
}
