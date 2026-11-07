import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle, 
  KeyRound, 
  Mail, 
  User as UserIcon,
  CheckCircle2,
  Lock,
  Cpu,
  Info,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ArchitectureIllustration } from '../components/illustrations/ArchitectureIllustration';

export const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);

  const { login, register, loginWithGoogle, resetPassword, isFirebaseReady } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      if (isResetMode) {
        if (!email) {
          setError('Please provide an email address to send the password reset link.');
          setLoading(false);
          return;
        }
        await resetPassword(email);
        setInfoMessage('Password reset email sent. Please check your inbox.');
        setIsResetMode(false);
      } else if (isLogin) {
        await login(email, password);
        navigate('/dashboard');
      } else {
        await register(email, password, fullName);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setInfoMessage(null);

    if (!isFirebaseReady) {
      setInfoMessage('Google sign-in is not available in this environment yet. Please use email and password.');
      return;
    }

    setLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-text-primary flex flex-col justify-center items-center p-4 lg:p-8 relative selection:bg-blue-500/20 selection:text-blue-700">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 rounded-2xl bg-canvas-surface border border-border-subtle shadow-elevated overflow-hidden relative z-10">
        
        {/* Left Editorial Console Pane */}
        <div className="hidden lg:flex lg:flex-col lg:col-span-5 p-8 bg-canvas-elevated/40 border-b lg:border-b-0 lg:border-r border-border-subtle flex flex-col justify-between relative overflow-hidden">
          <div>
            {/* Branding Header */}
            <div 
              className="flex items-center space-x-3 mb-6 cursor-pointer" 
              onClick={() => navigate('/')}
            >
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-bold tracking-tight text-text-primary text-base">ProofForge</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500/15 text-blue-700 border border-blue-500/25">AI</span>
                </div>
                <p className="text-[10px] font-mono tracking-wider uppercase text-text-muted">
                  Your engineering workspace
                </p>
              </div>
            </div>

            <h1 className="text-xl font-bold text-text-primary tracking-tight mb-2">
              From Vibe Coding to Real Engineering
            </h1>
            <p className="text-xs text-text-secondary leading-relaxed mb-6">
              Deterministic security auditing, Socratic conceptual guidance, and fail-closed Docker sandbox verification.
            </p>

            <ArchitectureIllustration className="w-full my-8" />
            <p className="text-sm text-text-secondary leading-relaxed">Explore the code. Question the assumptions. Make a repair you can explain.</p>
          </div>
          <p className="text-xs text-text-muted mt-8">From code to capability.</p>
        </div>

        {/* Right Authentication Form Pane */}
        <div className="lg:col-span-7 p-8 bg-canvas-surface flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <button type="button" onClick={() => navigate('/')} className="text-sm font-semibold text-text-primary mb-8">← proofforge</button>
            
            {/* Header / Subheader */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-text-primary">
                {isResetMode ? 'Reset Password' : isLogin ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                {isResetMode 
                  ? 'Enter your account email to receive reset instructions' 
                  : isLogin 
                    ? 'Sign in to access your audited projects and verification sandboxes' 
                    : 'Start turning code generation into verified engineering mastery'}
              </p>
            </div>

            {/* Google OAuth Button */}
            {!isResetMode && (
              <>
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-3 py-2.5 px-4 rounded-xl border border-border-subtle bg-canvas-elevated hover:bg-canvas-elevated/80 transition-colors text-sm font-medium text-text-primary mb-5 shadow-sm disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                  {isFirebaseReady && (
                    <Badge variant="green" size="xs">Live</Badge>
                  )}
                </button>

                <div className="relative flex items-center justify-center mb-5">
                  <div className="absolute inset-x-0 top-1/2 border-t border-border-subtle" />
                  <span className="bg-canvas-surface px-3 text-[11px] font-mono text-text-muted uppercase tracking-wider relative z-10">
                    or email credentials
                  </span>
                </div>
              </>
            )}

            {/* Error & Info Alerts */}
            {error && (
              <div role="alert" className="mb-4 flex items-start space-x-2.5 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {infoMessage && (
              <div role="status" className="mb-4 flex items-start space-x-2.5 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl text-xs text-blue-700">
                <Info className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                <span>{infoMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && !isResetMode && (
                <div>
                  <label htmlFor="auth-name" className="block text-[11px] font-mono text-text-muted mb-1.5 uppercase tracking-wider">
                    Full name
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-text-muted absolute left-3 top-3" />
                    <input
                      id="auth-name" autoComplete="name"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ada Lovelace"
                      className="w-full bg-canvas-elevated border border-border-subtle focus:border-blue-500 rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none transition-colors font-mono"
                    />
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-[11px] font-mono text-text-muted mb-1.5 uppercase tracking-wider">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-text-muted absolute left-3 top-3" />
                  <input
                    id="auth-email" autoComplete="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="developer@company.com"
                    className="w-full bg-canvas-elevated border border-border-subtle focus:border-blue-500 rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none transition-colors font-mono"
                  />
                </div>
              </div>

              {!isResetMode && (
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="auth-password" className="text-[11px] font-mono text-text-muted uppercase tracking-wider">
                      Password
                    </label>
                    {isLogin && (
                      <button
                        type="button"
                        onClick={() => { setIsResetMode(true); setError(null); }}
                        className="text-[11px] text-blue-700 hover:text-blue-700 font-mono transition-colors"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-text-muted absolute left-3 top-3" />
                    <input
                      id="auth-password" autoComplete={isLogin ? 'current-password' : 'new-password'}
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-canvas-elevated border border-border-subtle focus:border-blue-500 rounded-xl pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none transition-colors font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  loading={loading}
                  variant="primary"
                  className="w-full py-2.5"
                >
                  {isResetMode 
                    ? 'Send Reset Instructions' 
                    : isLogin 
                      ? 'Sign In to Workspace' 
                      : 'Create account'}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </form>

            {/* Bottom Toggle */}
            <div className="mt-6 pt-5 border-t border-border-subtle text-center text-xs text-text-secondary">
              {isResetMode ? (
                <button
                  type="button"
                  onClick={() => { setIsResetMode(false); setError(null); }}
                  className="text-blue-700 hover:underline font-mono"
                >
                  Return to sign in
                </button>
              ) : isLogin ? (
                <span>
                  New to ProofForge?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsLogin(false); setError(null); }}
                    className="text-blue-700 hover:underline font-mono font-medium ml-1"
                  >
                    Create account
                  </button>
                </span>
              ) : (
                <span>
                  Already have an engineering account?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsLogin(true); setError(null); }}
                    className="text-blue-700 hover:underline font-mono font-medium ml-1"
                  >
                    Sign in
                  </button>
                </span>
              )}
            </div>

            <div className="mt-6 text-center text-[10px] font-mono text-text-muted">
              <span>Encrypted Session • Neon PostgreSQL • User-Scoped Isolation</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
export default AuthPage;
