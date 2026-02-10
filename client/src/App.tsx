import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import LoginPage from "./pages/LoginPage.tsx";
import CaseListPage from "./pages/CaseListPage.tsx";
import CaseCreatePage from "./pages/CaseCreatePage.tsx";
import CaseDetailPage from "./pages/CaseDetailPage.tsx";
import CaseReviewPage from "./pages/CaseReviewPage.tsx";
import ImportPage from "./pages/ImportPage.tsx";
import FieldMappingsPage from "./pages/FieldMappingsPage.tsx";
import AuthGuard from "./components/AuthGuard.tsx";
import Layout from "./components/Layout.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AuthGuard />}>
          <Route element={<Layout />}>
            <Route index element={<CaseListPage />} />
            <Route path="/cases/new" element={<CaseCreatePage />} />
            <Route path="/cases/:id" element={<CaseDetailPage />} />
            <Route path="/cases/:id/review" element={<CaseReviewPage />} />
            <Route path="/cases/:id/import" element={<ImportPage />} />
            <Route path="/settings/jira-mappings" element={<FieldMappingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
