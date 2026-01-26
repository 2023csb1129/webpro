import { ReactNode } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container px-0 md:px-6 flex">
        <Sidebar />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
