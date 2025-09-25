import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthProvider';
import Login from './pages/Login';
import Records from './pages/Records';
// Если каких-то страниц нет — временно закомментируй соответствующий импорт/роут:
import Users from './pages/Users';
import Tags from './pages/Tags';
import Logs from './pages/Logs';
import OData from './pages/OData';
import Export from './pages/Export';
import Monitoring from './pages/Monitoring';
import Settings from './pages/Settings';
import Topbar from './components/Topbar';
import { ApiKeyBar } from './components/ApiKeyBar'; // если ранее добавляли панель ключа

function Private({ roles, children }: { roles?: string[]; children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles?.length && !user.roles.some(r => roles.includes(r))) return <Navigate to="/" replace />;
  return children;
}

function Layout() {
  return (
    <div>
      <Topbar />
      {typeof ApiKeyBar === 'function' ? <ApiKeyBar /> : null}
      <div style={{maxWidth: 1200, margin: '16px auto', padding: '0 16px'}}>
        <Outlet />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            <Route index element={<Private><Records /></Private>} />
            <Route path="/records" element={<Private><Records /></Private>} />
            <Route path="/users"   element={<Private roles={['ADMIN','ASSISTANT']}><Users /></Private>} />
            <Route path="/tags"    element={<Private roles={['ADMIN','ASSISTANT']}><Tags /></Private>} />
            <Route path="/logs"    element={<Private roles={['ADMIN']}><Logs /></Private>} />
            <Route path="/odata"   element={<Private roles={['ADMIN','ASSISTANT']}><OData /></Private>} />
            <Route path="/export"  element={<Private roles={['ADMIN']}><Export /></Private>} />
            <Route path="/monitoring" element={<Private roles={['ADMIN','ASSISTANT']}><Monitoring /></Private>} />
            <Route path="/settings" element={<Private roles={['ADMIN']}><Settings /></Private>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
