import React, { useEffect, useState } from 'react';
import api from '@/lib/api';
import TeacherDashboard from './TeacherDashboard';
import StudentDashboard from './StudentDashboard';

const ROLE_LABELS = {
  teacher: 'Teacher',
  student: 'Student'
};

const AuthCard = ({ role, mode, onModeChange, onAuth }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await api.post(endpoint, { email, password, role });
      onAuth(res.data);
    } catch (err) {
      console.error('Login error:', err);
      let msg = 'Request failed';

      if (err.response) {
        msg = err.response.data?.message || `Server error: ${err.response.status}`;
      } else if (err.request) {
        msg = 'Cannot connect to server. Please make sure the backend is running on port 5000.';
      } else {
        msg = err.message || 'Request failed';
      }

      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.authCard}>
      <div style={styles.authHeader}>
        <h3 style={styles.authTitle}>
          {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          <span style={styles.roleBadge}>{ROLE_LABELS[role]}</span>
        </h3>
        <p style={styles.authSubtitle}>
          {mode === 'login'
            ? 'Enter your credentials to access your dashboard'
            : 'Sign up to get started with AI-powered paper correction'
          }
        </p>

        <div style={styles.toggleContainer}>
          <div style={styles.toggleButtons}>
            <button
              type="button"
              style={{
                ...styles.toggleButton,
                ...(mode === 'login' ? styles.toggleButtonActive : {})
              }}
              onClick={() => onModeChange('login')}
            >
              <span style={styles.toggleIcon}>🔐</span>
              Login
            </button>
            <button
              type="button"
              style={{
                ...styles.toggleButton,
                ...(mode === 'signup' ? styles.toggleButtonActive : {})
              }}
              onClick={() => onModeChange('signup')}
            >
              <span style={styles.toggleIcon}>📝</span>
              Sign Up
            </button>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={styles.authForm}>
        <div style={styles.inputGroup}>
          <label style={styles.inputLabel}>
            <span style={styles.inputIcon}>✉️</span>
            Email Address
          </label>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="you@example.com"
            required
            style={styles.input}
          />
        </div>

        <div style={styles.inputGroup}>
          <label style={styles.inputLabel}>
            <span style={styles.inputIcon}>🔒</span>
            Password
          </label>
          <div style={styles.passwordWrapper}>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              required
              style={styles.input}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={styles.passwordToggle}
            >
              {showPassword ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <span style={styles.errorIcon}>⚠️</span>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            ...styles.submitButton,
            ...(loading ? styles.submitButtonLoading : {})
          }}
        >
          {loading ? (
            <>
              <span style={styles.spinner}></span>
              Processing...
            </>
          ) : mode === 'login' ? 'Sign In' : 'Create Account'}
        </button>

        {mode === 'login' && (
          <div style={styles.forgotPassword}>
            <button type="button" style={styles.forgotPasswordButton}>
              Forgot password?
            </button>
          </div>
        )}
      </form>

      <div style={styles.authFooter}>
        <p style={styles.authFooterText}>
          {mode === 'login'
            ? "Don't have an account? "
            : "Already have an account? "
          }
          <button
            type="button"
            onClick={() => onModeChange(mode === 'login' ? 'signup' : 'login')}
            style={styles.footerButton}
          >
            {mode === 'login' ? 'Sign up here' : 'Login here'}
          </button>
        </p>
      </div>
    </div>
  );
};

const Dashboard = ({ user, onLogout }) => {
  if (user.role === 'teacher') {
    return <TeacherDashboard user={user} onLogout={onLogout} />;
  }


  return <StudentDashboard user={user} onLogout={onLogout} />;
};

const App = () => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [mode, setMode] = useState('login');
  const [showAuth, setShowAuth] = useState(false);
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return token && user ? { token, user: JSON.parse(user) } : null;
  });
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const rehydrate = async () => {
      if (!auth?.token) return;
      setChecking(true);
      try {
        const res = await api.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        setAuth({ token: auth.token, user: res.data.user });
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setAuth(null);
      } finally {
        setChecking(false);
      }
    };
    rehydrate();
  }, []);

  const handleAuthSuccess = ({ token, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setAuth({ token, user });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuth(null);
    setSelectedRole(null);
  };

  return (
    <div style={styles.layout}>
      {auth && !checking ? (
        <Dashboard user={auth.user} onLogout={handleLogout} />
      ) : (
        <div style={styles.container}>
          {/* Background Elements */}
          <div style={styles.background}></div>
          <div style={styles.floatingShapes}>
            <div style={styles.shape1}></div>
            <div style={styles.shape2}></div>
            <div style={styles.shape3}></div>
          </div>

          {/* Header Section */}
          <header style={styles.header}>
            <div style={styles.logoContainer}>
              <div style={styles.logoIcon}><svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 48 48">
                <path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" d="M25.875 3.944L29.39 17.23a1.94 1.94 0 0 0 1.38 1.379l13.287 3.515c1.924.51 1.924 3.24 0 3.75L30.769 29.39a1.94 1.94 0 0 0-1.379 1.38l-3.515 13.287c-.51 1.924-3.24 1.924-3.75 0L18.61 30.769a1.94 1.94 0 0 0-1.38-1.379L3.944 25.875c-1.924-.51-1.924-3.24 0-3.75l13.288-3.515a1.94 1.94 0 0 0 1.379-1.38l3.515-13.287c.51-1.924 3.24-1.924 3.75 0" />
              </svg></div>
              <h1 style={styles.logoText}>AI PaperCorrection</h1>
            </div>
            <p style={styles.tagline}>Smart Evaluation for Modern Education</p>
          </header>

          {/* Main Content */}
          <main style={styles.main}>
            <div style={styles.heroSection}>
              <div style={styles.heroContent}>
                <h2 style={styles.heroTitle}>
                  Revolutionize Paper Correction
                  <span style={styles.highlight}> with AI</span>
                </h2>
                <p style={styles.heroDescription}>
                  Experience the future of answer script evaluation.
                  Our platform combines advanced AI with intuitive design
                  to provide accurate, fast, and fair assessment for both
                  teachers and students.
                </p>

                <div style={styles.featuresGrid}>
                  <div style={styles.featureCard}>
                    <div style={styles.featureIcon}>⚡</div>
                    <h4>Fast Processing</h4>
                    <p>Evaluate papers in seconds, not hours</p>
                  </div>
                  <div style={styles.featureCard}>
                    <div style={styles.featureIcon}>🎯</div>
                    <h4>Accurate Grading</h4>
                    <p>AI-powered precision with human oversight</p>
                  </div>
                  <div style={styles.featureCard}>
                    <div style={styles.featureIcon}>🛡️</div>
                    <h4>Secure Platform</h4>
                    <p>Enterprise-grade security for all data</p>
                  </div>
                </div>

                {!showAuth ? (
                  <div style={styles.ctaSection}>
                    <button
                      onClick={() => setShowAuth(true)}
                      style={styles.ctaButton}
                    >
                      Get Started Now
                      <span style={styles.ctaArrow}>→</span>
                    </button>
                    <p style={styles.ctaSubtext}>
                      The future is here
                    </p>
                  </div>
                ) : (
                  <div style={styles.authSection}>
                    <div style={styles.roleSelector}>
                      <h3 style={styles.roleTitle}>Select Your Role</h3>
                      <p style={styles.roleSubtitle}>Choose how you want to use the platform</p>
                      <div style={styles.roleButtons}>
                        <button
                          style={{
                            ...styles.roleButton,
                            ...(selectedRole === 'teacher' ? styles.roleButtonActive : {})
                          }}
                          onClick={() => setSelectedRole('teacher')}
                        >
                          <span style={styles.roleButtonIcon}>👨‍🏫</span>
                          <div style={styles.roleButtonContent}>
                            <strong>Teacher</strong>

                          </div>
                          {selectedRole === 'teacher' && (
                            <span style={styles.checkmark}>✓</span>
                          )}
                        </button>
                        <button
                          style={{
                            ...styles.roleButton,
                            ...(selectedRole === 'student' ? styles.roleButtonActive : {})
                          }}
                          onClick={() => setSelectedRole('student')}
                        >
                          <span style={styles.roleButtonIcon}>👨‍🎓</span>
                          <div style={styles.roleButtonContent}>
                            <strong>Student</strong>

                          </div>
                          {selectedRole === 'student' && (
                            <span style={styles.checkmark}>✓</span>
                          )}
                        </button>
                      </div>
                    </div>

                    {selectedRole ? (
                      <AuthCard
                        role={selectedRole}
                        mode={mode}
                        onModeChange={setMode}
                        onAuth={handleAuthSuccess}
                      />
                    ) : (
                      <div style={styles.rolePrompt}>
                        <div style={styles.promptIcon}>👇</div>
                        <p style={styles.promptText}>Please select your role to continue</p>
                      </div>
                    )}

                    <button
                      onClick={() => {
                        setShowAuth(false);
                        setSelectedRole(null);
                      }}
                      style={styles.backButton}
                    >
                      ← Back to Home
                    </button>
                  </div>
                )}
              </div>
            </div>
          </main>

          {/* Footer */}
          <footer style={styles.footer}>
            <p style={styles.footerText}>
              © 2024 AI PaperCorrection. All rights reserved.
            </p>
            <div style={styles.footerLinks}>
              <button style={styles.footerLink}>Privacy Policy</button>
              <button style={styles.footerLink}>Terms of Service</button>
              <button style={styles.footerLink}>Contact Support</button>
            </div>
          </footer>
        </div>
      )}
    </div>
  );
};

const styles = {
  layout: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
  },
  container: {
    minHeight: '100vh',
    position: 'relative',
    overflow: 'hidden',
    color: '#ffffff',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
    zIndex: 1,
  },
  floatingShapes: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
    overflow: 'hidden',
  },
  shape1: {
    position: 'absolute',
    top: '10%',
    left: '5%',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)',
    animation: 'float 20s infinite ease-in-out',
  },
  shape2: {
    position: 'absolute',
    bottom: '20%',
    right: '10%',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)',
    animation: 'float 25s infinite ease-in-out reverse',
  },
  shape3: {
    position: 'absolute',
    top: '50%',
    right: '20%',
    width: '150px',
    height: '150px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%)',
    animation: 'float 30s infinite ease-in-out',
  },
  header: {
    position: 'relative',
    zIndex: 3,
    padding: '24px 32px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    fontSize: '32px',
  },
  logoText: {
    fontSize: '24px',
    fontWeight: 'bold',
    background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0,
  },
  tagline: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
  },
  main: {
    position: 'relative',
    zIndex: 3,
    padding: '48px 32px',
  },
  heroSection: {
    maxWidth: '1200px',
    margin: '0 auto',
  },
  heroContent: {
    textAlign: 'center',
  },
  heroTitle: {
    fontSize: '48px',
    fontWeight: 'bold',
    margin: '0 0 24px 0',
    lineHeight: 1.2,
  },
  highlight: {
    background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  heroDescription: {
    fontSize: '18px',
    color: '#cbd5e1',
    maxWidth: '800px',
    margin: '0 auto 48px',
    lineHeight: 1.6,
  },
  featuresGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '24px',
    marginBottom: '48px',
  },
  featureCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '24px',
    transition: 'all 0.3s ease',
    '&:hover': {
      transform: 'translateY(-4px)',
      borderColor: 'rgba(96, 165, 250, 0.3)',
    },
  },
  featureIcon: {
    fontSize: '32px',
    marginBottom: '16px',
  },
  ctaSection: {
    marginTop: '48px',
  },
  ctaButton: {
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    padding: '16px 32px',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.3s ease',
    '&:hover': {
      backgroundColor: '#2563eb',
      transform: 'translateY(-2px)',
      boxShadow: '0 10px 20px rgba(59, 130, 246, 0.3)',
      '& $ctaArrow': {
        transform: 'translateX(4px)',
      },
    },
  },
  ctaArrow: {
    transition: 'transform 0.3s ease',
  },
  ctaSubtext: {
    fontSize: '14px',
    color: '#94a3b8',
    marginTop: '16px',
  },
  authSection: {
    maxWidth: '480px',
    margin: '0 auto',
  },
  roleSelector: {
    marginBottom: '32px',
  },
  roleTitle: {
    fontSize: '24px',
    fontWeight: '600',
    margin: '0 0 8px 0',
  },
  roleSubtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '0 0 24px 0',
  },
  roleButtons: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  roleButton: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    width: '100%',
    textAlign: 'left',
    color: 'white',
  },
  roleButtonActive: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  roleButtonIcon: {
    fontSize: '32px',
    flexShrink: 0,
  },
  roleButtonContent: {
    flex: 1,
    '& strong': {
      display: 'block',
      fontSize: '16px',
      fontWeight: '600',
      marginBottom: '4px',
    },
    '& small': {
      fontSize: '12px',
      color: '#94a3b8',
    },
  },
  checkmark: {
    color: '#10b981',
    fontSize: '20px',
    fontWeight: 'bold',
  },
  rolePrompt: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center',
  },
  promptIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  promptText: {
    fontSize: '16px',
    color: '#cbd5e1',
    margin: 0,
  },
  backButton: {
    backgroundColor: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#cbd5e1',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'block',
    margin: '32px auto 0',
    transition: 'all 0.3s ease',
  },
  footer: {
    position: 'relative',
    zIndex: 3,
    padding: '24px 32px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
  },
  footerLinks: {
    display: 'flex',
    gap: '24px',
  },
  footerLink: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#cbd5e1',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'color 0.3s ease',
  },
  authFooterText: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
  },
  // Auth Card Styles
  authCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '24px',
    padding: '32px',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
  },
  authHeader: {
    marginBottom: '32px',
  },
  authTitle: {
    fontSize: '28px',
    fontWeight: 'bold',
    margin: '0 0 8px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  roleBadge: {
    backgroundColor: '#3b82f6',
    color: 'white',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '14px',
    fontWeight: '500',
  },
  authSubtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '0 0 24px 0',
  },
  toggleContainer: {
    marginBottom: '24px',
  },
  toggleButtons: {
    display: 'flex',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '12px',
    padding: '4px',
  },
  toggleButton: {
    flex: 1,
    padding: '12px',
    border: 'none',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    cursor: 'pointer',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
  },
  toggleButtonActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#3b82f6',
  },
  toggleIcon: {
    fontSize: '16px',
  },
  authForm: {
    marginBottom: '24px',
  },
  inputGroup: {
    marginBottom: '24px',
  },
  inputLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#cbd5e1',
    marginBottom: '8px',
    fontWeight: '500',
  },
  inputIcon: {
    fontSize: '16px',
  },
  passwordWrapper: {
    position: 'relative',
  },
  input: {
    width: '100%',
    padding: '16px 20px',
    paddingRight: '48px',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    border: '2px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    color: 'white',
    fontSize: '16px',
    transition: 'all 0.3s ease',
    outline: 'none',
  },
  passwordToggle: {
    position: 'absolute',
    right: '16px',
    top: '50%',
    transform: 'translateY(-50%)',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '20px',
    padding: '4px',
  },
  errorAlert: {
    backgroundColor: 'rgba(220, 38, 38, 0.1)',
    border: '1px solid rgba(220, 38, 38, 0.3)',
    color: '#f87171',
    padding: '16px',
    borderRadius: '12px',
    fontSize: '14px',
    marginBottom: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  errorIcon: {
    fontSize: '16px',
  },
  submitButton: {
    width: '100%',
    padding: '18px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
  },
  submitButtonLoading: {
    opacity: 0.8,
    cursor: 'not-allowed',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  forgotPassword: {
    textAlign: 'center',
    marginTop: '16px',
  },
  forgotPasswordButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'color 0.3s ease',
  },
  authFooter: {
    textAlign: 'center',
  },
  footerButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#3b82f6',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '600',
  },
  // Dashboard Styles
  studentDashboard: {
    backgroundColor: '#0f172a',
    color: 'white',
    padding: '32px',
    minHeight: '100vh',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    padding: '12px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
  },
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-20px); }
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  * {
    box-sizing: border-box;
  }
  
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  button {
    font-family: inherit;
  }
  
  input:focus {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;
document.head.appendChild(styleSheet);

export default App;