import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './pages/LandingPage';
import { PrototypeDemoPage } from './pages/PrototypeDemoPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { ImportRepoPage } from './pages/ImportRepoPage';
import { ProjectOverviewPage } from './pages/ProjectOverviewPage';
import { CodebaseExplorerPage } from './pages/CodebaseExplorerPage';
import { SecurityAuditPage } from './pages/SecurityAuditPage';
import { AiMentorPage } from './pages/AiMentorPage';
import { GuidedRepairPage } from './pages/GuidedRepairPage';
import { SkillTransferLabPage } from './pages/SkillTransferLabPage';
import { AnalyticsPage } from './pages/AnalyticsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <AppShell>{children}</AppShell>;
};

const IndexRoute: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return (
      <AppShell>
        <DashboardPage />
      </AppShell>
    );
  }

  return <LandingPage />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/" element={<IndexRoute />} />
          <Route path="/landing" element={<LandingPage />} />
          <Route path="/prototype" element={<PrototypeDemoPage />} />
          <Route path="/auth" element={<AuthPage />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          } />

          <Route path="/import" element={
            <ProtectedRoute>
              <ImportRepoPage />
            </ProtectedRoute>
          } />

          <Route path="/projects/:id" element={
            <ProtectedRoute>
              <ProjectOverviewPage />
            </ProtectedRoute>
          } />

          <Route path="/projects/:id/explorer" element={
            <ProtectedRoute>
              <CodebaseExplorerPage />
            </ProtectedRoute>
          } />

          <Route path="/projects/:id/audit" element={
            <ProtectedRoute>
              <SecurityAuditPage />
            </ProtectedRoute>
          } />

          <Route path="/projects/:id/security" element={
            <ProtectedRoute>
              <SecurityAuditPage />
            </ProtectedRoute>
          } />

          <Route path="/projects/:id/mentor" element={
            <ProtectedRoute>
              <AiMentorPage />
            </ProtectedRoute>
          } />

          <Route path="/projects/:id/repair" element={
            <ProtectedRoute>
              <GuidedRepairPage />
            </ProtectedRoute>
          } />

          <Route path="/projects/:id/transfer-lab" element={
            <ProtectedRoute>
              <SkillTransferLabPage />
            </ProtectedRoute>
          } />

          <Route path="/analytics" element={
            <ProtectedRoute>
              <AnalyticsPage />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
