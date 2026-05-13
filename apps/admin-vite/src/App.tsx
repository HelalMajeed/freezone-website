import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminShell } from "./components/main-admin-sidebar";
import { OffersAdminPage } from "./routePages";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/offers" element={<Navigate to="/admin/offers" replace />} />
        <Route element={<AdminShell />}>
          <Route path="/" element={<Navigate to="/admin/offers" replace />} />
          <Route path="/admin/offers" element={<OffersAdminPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin/offers" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
