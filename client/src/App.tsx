import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import LoginPage from "./pages/LoginPage.tsx";
import CaseListPage from "./pages/CaseListPage.tsx";
import CaseCreatePage from "./pages/CaseCreatePage.tsx";
import AuthGuard from "./components/AuthGuard.tsx";
import Layout from "./components/Layout.tsx";

function CaseDetailPlaceholder() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-foreground">Case Detail</h1>
      <p className="text-muted-foreground">Coming soon in Phase 2 Plan 5</p>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AuthGuard />}>
          <Route element={<Layout />}>
            <Route index element={<CaseListPage />} />
            <Route path="/cases/new" element={<CaseCreatePage />} />
            <Route path="/cases/:id" element={<CaseDetailPlaceholder />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
