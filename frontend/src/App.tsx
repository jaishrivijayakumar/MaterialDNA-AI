import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Cpu,
  ClipboardCheck,
  Fingerprint,
  Database,
  Upload,
  BarChart3,
  ScrollText,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import Welcome from './pages/Welcome';
import Overview from './pages/Dashboard';
import MaterialMaster from './pages/MaterialMaster';
import AIMatching from './pages/AIMatching';
import ReviewQueue from './pages/ReviewQueue';
import MaterialDNA from './pages/MaterialDNA';
import Analytics from './pages/Analytics';
import DataImport from './pages/DataImport';
import AuditTrail from './pages/AuditTrail';
import { getReviews } from './api/client';

function AppShell() {
  const [pendingReviews, setPendingReviews] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem('materialdna_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const location = useLocation();

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('materialdna_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  useEffect(() => {
    getReviews('pending').then(r => setPendingReviews(r.length)).catch(() => {});
    const iv = setInterval(() => {
      getReviews('pending').then(r => setPendingReviews(r.length)).catch(() => {});
    }, 30000);
    return () => clearInterval(iv);
  }, []);

  // Welcome page renders without sidebar
  if (location.pathname === '/') {
    return <Welcome />;
  }

  return (
    <div className={`app-layout ${isCollapsed ? 'app-layout--collapsed' : ''}`}>
      <aside className="sidebar" aria-label="Application Sidebar">
        {/* Global Branding & Collapse Control */}
        <div className="sidebar-brand">
          <a href="/" className="sidebar-brand-link" title="MaterialDNA AI — Home">
            <div className="sidebar-brand-mark">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="5" cy="6" r="2.2" fill="#fff" opacity="0.8" />
                <circle cx="5" cy="12" r="2.2" fill="#fff" opacity="0.95" />
                <circle cx="5" cy="18" r="2.2" fill="#fff" opacity="0.8" />
                <line x1="7.2" y1="6" x2="14" y2="12" stroke="#fff" strokeWidth="1.3" opacity="0.6" />
                <line x1="7.2" y1="12" x2="14" y2="12" stroke="#fff" strokeWidth="1.3" opacity="0.85" />
                <line x1="7.2" y1="18" x2="14" y2="12" stroke="#fff" strokeWidth="1.3" opacity="0.6" />
                <polygon points="18,7 22,12 18,17 14,12" fill="#fff" />
              </svg>
            </div>
            {!isCollapsed && <span className="sidebar-brand-name">MaterialDNA AI</span>}
          </a>

          <button
            type="button"
            className="sidebar-toggle-btn"
            onClick={toggleSidebar}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main Navigation">
          <NavLink
            to="/overview"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={isCollapsed ? 'Overview' : undefined}
          >
            <LayoutDashboard />
            {!isCollapsed && <span>Overview</span>}
          </NavLink>

          {isCollapsed ? (
            <div className="sidebar-divider" />
          ) : (
            <div className="sidebar-section">Workflow</div>
          )}

          <NavLink
            to="/matching"
            className={({ isActive }) => `nav-item hero-item ${isActive ? 'active' : ''}`}
            title={isCollapsed ? 'AI Matching' : undefined}
          >
            <Cpu />
            {!isCollapsed && <span>AI Matching</span>}
          </NavLink>

          <NavLink
            to="/reviews"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={isCollapsed ? `Review Queue (${pendingReviews})` : undefined}
          >
            <ClipboardCheck />
            {!isCollapsed && <span>Review Queue</span>}
            {pendingReviews > 0 && (
              isCollapsed ? (
                <span className="nav-badge-dot" />
              ) : (
                <span className="nav-badge">{pendingReviews}</span>
              )
            )}
          </NavLink>

          <NavLink
            to="/identities"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={isCollapsed ? 'MaterialDNA' : undefined}
          >
            <Fingerprint />
            {!isCollapsed && <span>MaterialDNA</span>}
          </NavLink>

          {isCollapsed ? (
            <div className="sidebar-divider" />
          ) : (
            <div className="sidebar-section">Data</div>
          )}

          <NavLink
            to="/materials"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={isCollapsed ? 'Material Master' : undefined}
          >
            <Database />
            {!isCollapsed && <span>Material Master</span>}
          </NavLink>

          <NavLink
            to="/import"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={isCollapsed ? 'Data Import' : undefined}
          >
            <Upload />
            {!isCollapsed && <span>Data Import</span>}
          </NavLink>

          {isCollapsed ? (
            <div className="sidebar-divider" />
          ) : (
            <div className="sidebar-section">Insights</div>
          )}

          <NavLink
            to="/analytics"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={isCollapsed ? 'Analytics' : undefined}
          >
            <BarChart3 />
            {!isCollapsed && <span>Analytics</span>}
          </NavLink>

          <NavLink
            to="/audit"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={isCollapsed ? 'Audit Trail' : undefined}
          >
            <ScrollText />
            {!isCollapsed && <span>Audit Trail</span>}
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" title={isCollapsed ? 'Engineer · CodeUnify' : undefined}>
            <div className="sidebar-user-dot" />
            {!isCollapsed && (
              <>
                <span className="sidebar-user-name">Engineer</span>
                <span className="sidebar-user-org">CodeUnify</span>
              </>
            )}
          </div>
        </div>
      </aside>

      <main className="main">
        <Routes>
          <Route path="/overview" element={<Overview />} />
          <Route path="/materials" element={<MaterialMaster />} />
          <Route path="/matching" element={<AIMatching />} />
          <Route path="/reviews" element={<ReviewQueue />} />
          <Route path="/identities" element={<MaterialDNA />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/import" element={<DataImport />} />
          <Route path="/audit" element={<AuditTrail />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
