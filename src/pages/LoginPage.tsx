import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import LoginForm from '@/components/auth/LoginForm';
import { User } from '@/types';

const LoginPage = () => {
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleLogin = (user: User) => {
        login(user);
        navigate('/dashboard');
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center space-y-2">
                    <div className="inline-block p-3 rounded-2xl bg-primary/10 mb-2">
                        <svg
                            className="h-10 w-10 text-primary"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-heading font-bold tracking-tight text-foreground">
                        CourseCompass
                    </h1>
                    <p className="text-muted-foreground text-lg">
                        Your bridge to academic excellence
                    </p>
                </div>

                <LoginForm onLogin={handleLogin} />

                <p className="text-center text-sm text-balance text-muted-foreground">
                    By signing in, you agree to our Terms of Service and Privacy Policy.
                </p>
            </div>
        </div>
    );
};

export default LoginPage;
