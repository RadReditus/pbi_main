// src/components/Layout.tsx
import { PropsWithChildren } from 'react';
import { Link, Outlet } from 'react-router-dom';

function Layout({ children }: PropsWithChildren) {
  return (
    <div className="min-h-screen">
      <header className="p-3 border-b flex gap-4">
        <Link to="/">Главная</Link>
        <Link to="/tags">Теги</Link>
        <Link to="/logs">Логи</Link>
        <Link to="/odata">OData</Link>
      </header>
      <main className="p-4 max-w-6xl mx-auto">
        {children ?? <Outlet />}
      </main>
    </div>
  );
}

export default Layout;
// На всякий — оставлю и именованный:
export { Layout };
