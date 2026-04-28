"use client";

import { Outlet, useLocation } from "react-router-dom";
import styles from "./AdminChrome.module.css";

export function AdminChrome() {
  const pathname = useLocation().pathname ?? "";
  const isLogin = pathname === "/admin/login";

  return (
    <div className={isLogin ? `admin-login-root ${styles.loginWrap}` : undefined}>
      <Outlet />
    </div>
  );
}
