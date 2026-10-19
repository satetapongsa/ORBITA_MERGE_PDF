import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider, useAuth } from './auth.jsx';
import { ToastProvider } from './components/Toast.jsx';
import Layout from './components/Layout.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Home from './pages/Home.jsx';
import MergeTool from './pages/MergeTool.jsx';
import SplitTool from './pages/SplitTool.jsx';
import OrganizeTool from './pages/OrganizeTool.jsx';
import Files from './pages/Files.jsx';
import Account from './pages/Account.jsx';
import Assistant from './pages/Assistant.jsx';
import './styles.css';

function Protected({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="center-screen"><Loader2 className="spin" /></div>;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-screen"><Loader2 className="spin" /></div>;
  return user ? <Navigate to="/" replace /> : children;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<GuestOnly><AuthPage mode="login" /></GuestOnly>} />
            <Route path="/register" element={<GuestOnly><AuthPage mode="register" /></GuestOnly>} />
            <Route element={<Protected><Layout /></Protected>}>
              <Route index element={<Home />} />
              <Route path="merge" element={<MergeTool />} />
              <Route path="split" element={<SplitTool />} />
              <Route path="organize" element={<OrganizeTool />} />
              <Route path="files" element={<Files />} />
              <Route path="account" element={<Account />} />
              <Route path="assistant" element={<Assistant />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
