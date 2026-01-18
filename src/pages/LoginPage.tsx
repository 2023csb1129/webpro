import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import LoginForm from '@/components/auth/LoginForm';
import { Button } from '@/components/ui/button';
import { GraduationCap, BookOpen, UserCheck, Shield, ArrowRight } from 'lucide-react';

const LoginPage = () => {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (email: string, role: UserRole, userId: string, name: string) => {
    // Login with real user data from API
    login({
      id: userId,
      email: email,
      name: name,
      role: role,
      department: 'Computer Science'
    });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section - Compact when form is shown */}
      <div className={`gradient-hero text-primary-foreground transition-all duration-500 ${showLoginForm ? 'pb-4' : ''}`}>
        <div className={`container px-4 transition-all duration-500 ${showLoginForm ? 'py-8' : 'py-16 md:py-20'}`}>
          <div className="max-w-3xl mx-auto text-center space-y-4">
            <div className="flex justify-center">
              <div className={`flex items-center justify-center rounded-2xl bg-primary-foreground/10 backdrop-blur transition-all duration-500 ${showLoginForm ? 'h-14 w-14' : 'h-20 w-20'}`}>
                <GraduationCap className={`transition-all duration-500 ${showLoginForm ? 'h-8 w-8' : 'h-12 w-12'}`} />
              </div>
            </div>
            <h1 className={`font-heading font-bold leading-tight transition-all duration-500 ${showLoginForm ? 'text-2xl md:text-3xl' : 'text-4xl md:text-5xl lg:text-6xl'}`}>
              micro-AIMS
            </h1>
            <p className={`text-primary-foreground/80 max-w-2xl mx-auto transition-all duration-500 ${showLoginForm ? 'text-sm hidden' : 'text-lg md:text-xl'}`}>
              Academic Information Management System - Streamlined course enrollment
              with instructor and advisor approvals
            </p>

            {/* Feature Icons - Hide when form is shown */}
            {!showLoginForm && (
              <div className="flex flex-wrap justify-center gap-8 pt-6 animate-fade-in">
                <div className="flex flex-col items-center gap-2 text-primary-foreground/80">
                  <div className="p-3 rounded-full bg-primary-foreground/10">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <span className="text-sm">Browse Courses</span>
                </div>
                <div className="flex flex-col items-center gap-2 text-primary-foreground/80">
                  <div className="p-3 rounded-full bg-primary-foreground/10">
                    <UserCheck className="h-6 w-6" />
                  </div>
                  <span className="text-sm">Easy Approval</span>
                </div>
                <div className="flex flex-col items-center gap-2 text-primary-foreground/80">
                  <div className="p-3 rounded-full bg-primary-foreground/10">
                    <Shield className="h-6 w-6" />
                  </div>
                  <span className="text-sm">Secure Access</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Wave Divider - Only show when form is hidden */}
        {!showLoginForm && (
          <div className="h-16 bg-background" style={{
            clipPath: 'ellipse(70% 100% at 50% 100%)',
            marginTop: '-4rem',
          }} />
        )}
      </div>

      {/* Login Section */}
      <div className="container px-4 py-6 flex-1 flex flex-col justify-start">
        {showLoginForm ? (
          <div className="space-y-4 animate-fade-in">
            <LoginForm onLogin={handleLogin} />
            <div className="text-center">
              <Button variant="ghost" onClick={() => setShowLoginForm(false)}>
                ← Back
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex justify-center pt-4">
            <Button
              variant="hero"
              size="lg"
              onClick={() => setShowLoginForm(true)}
              className="gap-2 px-8 py-6 text-lg"
            >
              Sign in with Email
              <ArrowRight className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-auto">
        <div className="container px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 micro-AIMS. Academic Information Management System</p>
        </div>
      </footer>
    </div>
  );
};

export default LoginPage;
