import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';
import { User, UserRole } from '@/types';
import { authAPI } from '@/services/api';
import OTPInput from './OTPInput';

interface LoginFormProps {
  onLogin: (user: User) => void;
}

const LoginForm = ({ onLogin }: LoginFormProps) => {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [detectedRole, setDetectedRole] = useState<string | null>(null);

  const validateEmail = (email: string): { valid: boolean; error?: string } => {
    if (!email.trim()) {
      return { valid: false, error: 'Email is required' };
    }
    if (!email.includes('@')) {
      return { valid: false, error: 'Email must contain @' };
    }
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Please enter a valid email address' };
    }
    return { valid: true };
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      setError(emailValidation.error || 'Invalid email');
      return;
    }

    setIsLoading(true);

    // Send OTP
    const result = await authAPI.sendOTP(email, 'student'); // Role doesn't matter anymore

    setIsLoading(false);

    if (result.success) {
      // Store detected role if user exists
      if (result.data?.role) {
        setDetectedRole(result.data.role);
      }
      setSuccessMessage('OTP sent to your email!');
      setStep('otp');
    } else {
      setError(result.error || 'Failed to send OTP');
    }
  };

  const handleOTPVerify = async (otp: string) => {
    setIsLoading(true);
    setError('');

    // Verify OTP - backend will determine the role
    const result = await authAPI.verifyOTP(email, otp, 'student'); // Role handled by backend

    setIsLoading(false);

    if (result.success && result.data?.user) {
      onLogin(result.data.user as User);
    } else {
      setError(result.error || 'Invalid OTP. Please try again.');
    }
  };

  const handleResendOTP = async () => {
    setIsLoading(true);
    setError('');

    const result = await authAPI.sendOTP(email, 'student');

    setIsLoading(false);

    if (result.success) {
      setSuccessMessage('OTP resent to your email!');
    } else {
      setError(result.error || 'Failed to resend OTP');
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-0 animate-scale-in">
      <CardHeader className="space-y-1 text-center pb-2">
        <CardTitle className="text-2xl font-heading font-bold text-foreground">
          {step === 'email' ? 'Sign In' : 'Verify OTP'}
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {step === 'email'
            ? 'Enter your email to receive a one-time password'
            : `We've sent a 6-digit code to ${email}`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-4">
        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="your.name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-12"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Info message about role detection */}
            <p className="text-xs text-muted-foreground text-center">
              Your role will be detected automatically based on your registration.
              <br />
              Please use your registered University email.
            </p>

            {error && (
              <p className="text-sm text-destructive animate-fade-in">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full h-12"
              variant="hero"
              disabled={isLoading || !email}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Sending OTP...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>
        ) : (
          <div className="space-y-4">
            {/* Show detected role if available */}
            {detectedRole && (
              <div className="text-center p-3 rounded-lg bg-primary/10">
                <p className="text-sm text-primary font-medium">
                  Logging in as: {detectedRole.charAt(0).toUpperCase() + detectedRole.slice(1)}
                </p>
              </div>
            )}

            <OTPInput
              length={6}
              onComplete={handleOTPVerify}
              disabled={isLoading}
            />

            {successMessage && (
              <p className="text-sm text-green-600 text-center animate-fade-in">{successMessage}</p>
            )}

            {error && (
              <p className="text-sm text-destructive text-center animate-fade-in">{error}</p>
            )}

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Didn't receive the code?
              </p>
              <Button
                variant="link"
                onClick={handleResendOTP}
                disabled={isLoading}
                className="text-primary"
              >
                Resend OTP
              </Button>
            </div>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setStep('email')}
              disabled={isLoading}
            >
              Use a different email
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoginForm;
