import { ReactNode } from 'react';
import Header from './Header';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container px-4 py-6 md:px-6 md:py-8">
        {children}
      </main>
    </div>
  );
};

export default DashboardLayout;
