import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const Layout = () => {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen overflow-auto relative">
        {/* Animated background gradient */}
        <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 opacity-60"></div>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
