import React, { useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import {
  signInUser,
  verifyEmail,
  resendVerificationCode,
  requestForgotPasswordOtp,
  resetPasswordWithOtp
} from '../services/api';

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

export default function SignIn({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Email Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyEmailAddress, setVerifyEmailAddress] = useState('');
  const [verifySuccess, setVerifySuccess] = useState('');
  const [resending, setResending] = useState(false);

  // Forgot Password State
  const [isForgot, setIsForgot] = useState(false);
  const [forgotStep, setForgotStep] = useState('input'); // 'input' | 'otp'
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPass, setShowForgotNewPass] = useState(false);
  const [showForgotConfirmPass, setShowForgotConfirmPass] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotCaptcha, setForgotCaptcha] = useState(null);
  const forgotRecaptchaRef = useRef(null);

  // CAPTCHA Token State
  const [captchaToken, setCaptchaToken] = useState(null);
  const recaptchaRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if reCAPTCHA token exists
    if (!captchaToken) {
      setError('Please complete the "I\'m not a robot" CAPTCHA verification before signing in.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await signInUser(username, password);
      if (res.status === 'success') {
        onLoginSuccess(res.user);
      } else if (res.requires_verification || res.status === 'unverified') {
        setIsVerifying(true);
        setVerifyEmailAddress(res.email || '');
        setError('');
        setVerifySuccess(res.message || 'Please enter the 6-digit verification code sent to your email.');
      } else {
        setError(res.message || 'Invalid username or password');
        if (recaptchaRef.current) recaptchaRef.current.reset();
        setCaptchaToken(null);
      }
    } catch (err) {
      setError('Connection error to backend API. Please check server.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e) => {
    e.preventDefault();
    if (!verificationCode.trim()) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setError('');
    setVerifySuccess('');
    setLoading(true);

    try {
      const res = await verifyEmail(username, verificationCode.trim());
      if (res.status === 'success') {
        setVerifySuccess('Email verified successfully! Logging you in...');
        setTimeout(() => {
          if (res.user) {
            onLoginSuccess(res.user);
          } else {
            setIsVerifying(false);
          }
        }, 1200);
      } else {
        setError(res.message || 'Invalid or expired code.');
      }
    } catch (err) {
      setError('Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setResending(true);
    try {
      const res = await resendVerificationCode(username);
      if (res.status === 'success') {
        setVerifySuccess(res.message || 'A new code has been sent to your email.');
      } else {
        setError(res.message || 'Failed to resend code.');
      }
    } catch (err) {
      setError('Error resending verification code.');
    } finally {
      setResending(false);
    }
  };

  const handleQuickDemo = (demoUsername, demoPassword) => {
    setUsername(demoUsername);
    setPassword(demoPassword);
    setCaptchaToken('demo-verified-token');
  };

  const handleForgotRequestOtp = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setForgotError('Please enter your Username, Student ID, or Email.');
      return;
    }
    if (!forgotCaptcha) {
      setForgotError('Please complete the CAPTCHA.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      const res = await requestForgotPasswordOtp(forgotIdentifier.trim());
      if (res.status === 'success') {
        setForgotStep('otp');
        setForgotSuccess(res.message || 'Verification code sent to your email.');
      } else {
        setForgotError(res.message || 'Failed to send verification code.');
        if (forgotRecaptchaRef.current) forgotRecaptchaRef.current.reset();
        setForgotCaptcha(null);
      }
    } catch (err) {
      setForgotError('Connection error to server.');
      if (forgotRecaptchaRef.current) forgotRecaptchaRef.current.reset();
      setForgotCaptcha(null);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleForgotResetSubmit = async (e) => {
    e.preventDefault();
    if (!forgotOtp.trim()) {
      setForgotError('Please enter the 6-digit code.');
      return;
    }
    if (forgotNewPassword.length < 6) {
      setForgotError('Password must be at least 6 characters.');
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setForgotLoading(true);
    setForgotError('');
    setForgotSuccess('');

    try {
      const res = await resetPasswordWithOtp(forgotIdentifier.trim(), forgotOtp.trim(), forgotNewPassword);
      if (res.status === 'success') {
        setForgotSuccess('Password updated successfully! Redirecting to sign in...');
        setTimeout(() => {
          setIsForgot(false);
          setForgotStep('input');
          setForgotIdentifier('');
          setForgotOtp('');
          setForgotNewPassword('');
          setForgotConfirmPassword('');
          setForgotSuccess('');
          setForgotError('');
        }, 1500);
      } else {
        setForgotError(res.message || 'Failed to reset password.');
      }
    } catch (err) {
      setForgotError('Connection error resetting password.');
    } finally {
      setForgotLoading(false);
    }
  };

  // FORGOT PASSWORD VIEW
  if (isForgot) {
    return (
      <div className="auth-card-wrapper">
        <div className="card auth-card">
          <div className="auth-brand-header text-center">
            <div className="brand-logo-icon auth-logo">SA</div>
            <h2>Forgot Password</h2>
          </div>

          {forgotError && <div className="alert alert-danger">{forgotError}</div>}
          {forgotSuccess && <div className="alert alert-success">{forgotSuccess}</div>}

          {forgotStep === 'input' ? (
            <form onSubmit={handleForgotRequestOtp} className="auth-form">
              <div className="form-group">
                <label htmlFor="forgotIdentifier">Username or Email</label>
                <input
                  id="forgotIdentifier"
                  type="text"
                  className="form-control"
                  placeholder="Enter your username or email"
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="captcha-container" style={{ display: 'flex', justifyContent: 'center', margin: '1.25rem 0' }}>
                <ReCAPTCHA
                  ref={forgotRecaptchaRef}
                  sitekey="6Lf5hMktAAAAALQdEV5MCLWIVUW_S9tebI1w49HP"
                  onChange={(token) => setForgotCaptcha(token)}
                  onExpired={() => setForgotCaptcha(null)}
                  theme="dark"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg mt-2"
                disabled={forgotLoading || !forgotIdentifier}
              >
                {forgotLoading ? 'Sending...' : 'Send Code'}
              </button>

              <div className="text-center mt-3">
                <button
                  type="button"
                  className="link-button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted, #94a3b8)',
                    cursor: 'pointer',
                    fontSize: '0.88rem'
                  }}
                  onClick={() => {
                    setIsForgot(false);
                    setForgotError('');
                    setForgotSuccess('');
                  }}
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleForgotResetSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="forgotOtp">6-Digit Code</label>
                <input
                  id="forgotOtp"
                  type="text"
                  className="form-control"
                  placeholder="123456"
                  maxLength="6"
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="forgotNewPass">New Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="forgotNewPass"
                    type={showForgotNewPass ? 'text' : 'password'}
                    className="form-control"
                    placeholder="At least 6 characters"
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowForgotNewPass(!showForgotNewPass)}
                    tabIndex="-1"
                  >
                    {showForgotNewPass ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="forgotConfirmPass">Confirm Password</label>
                <div className="password-input-wrapper">
                  <input
                    id="forgotConfirmPass"
                    type={showForgotConfirmPass ? 'text' : 'password'}
                    className="form-control"
                    placeholder="Confirm new password"
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowForgotConfirmPass(!showForgotConfirmPass)}
                    tabIndex="-1"
                  >
                    {showForgotConfirmPass ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-block btn-lg mt-2"
                disabled={forgotLoading || forgotOtp.length < 6 || !forgotNewPassword}
              >
                {forgotLoading ? 'Resetting...' : 'Reset Password'}
              </button>

              <div className="text-center mt-3">
                <button
                  type="button"
                  className="link-button"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted, #94a3b8)',
                    cursor: 'pointer',
                    fontSize: '0.88rem'
                  }}
                  onClick={() => {
                    setIsForgot(false);
                    setForgotError('');
                    setForgotSuccess('');
                  }}
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // VERIFICATION VIEW
  if (isVerifying) {
    return (
      <div className="auth-card-wrapper">
        <div className="card auth-card">
          <div className="auth-brand-header text-center">
            <div className="brand-logo-icon auth-logo" style={{ margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h2>Verify Your Email</h2>
            <p className="subtitle">
              Enter the 6-digit code sent to {verifyEmailAddress ? <strong style={{ color: 'var(--primary, #388bfd)' }}>{verifyEmailAddress}</strong> : 'your email'}
            </p>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}
          {verifySuccess && <div className="alert alert-success">{verifySuccess}</div>}

          <form onSubmit={handleVerifySubmit} className="auth-form">
            <div className="form-group text-center">
              <label htmlFor="verifyCode">6-Digit Verification Code</label>
              <input
                id="verifyCode"
                type="text"
                className="form-control"
                placeholder="123456"
                maxLength="6"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/[^0-9]/g, ''))}
                style={{
                  fontSize: '1.75rem',
                  letterSpacing: '8px',
                  textAlign: 'center',
                  fontWeight: '700',
                  fontFamily: 'monospace'
                }}
                autoFocus
                required
              />
              <small className="text-muted mt-2 d-block">The code is valid for 15 minutes.</small>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg mt-3"
              disabled={loading}
            >
              {loading ? 'Verifying...' : 'Verify & Sign In'}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', alignItems: 'center' }}>
              <button
                type="button"
                className="link-button"
                onClick={handleResend}
                disabled={resending}
              >
                {resending ? 'Sending...' : 'Resend Code'}
              </button>

              <button
                type="button"
                className="link-button"
                onClick={() => {
                  setIsVerifying(false);
                  setError('');
                  setVerifySuccess('');
                }}
              >
                Back to Sign In
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // SIGN IN VIEW
  return (
    <div className="auth-card-wrapper">
      <div className="card auth-card">
        {/* Brand Header */}
        <div className="auth-brand-header text-center">
          <div className="brand-logo-icon auth-logo">SA</div>
          <h2>Sign In to SmartAttend</h2>
          <p className="subtitle">Enter your login credentials to access your account</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">Username or Student ID</label>
            <input
              id="username"
              type="text"
              className="form-control"
              placeholder="Username here"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label htmlFor="password" style={{ margin: 0 }}>Password</label>
              <button
                type="button"
                className="link-button"
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  fontSize: '0.82rem',
                  color: 'var(--text-muted, #94a3b8)',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
                onClick={() => {
                  setIsForgot(true);
                  setError('');
                  setForgotError('');
                  setForgotSuccess('');
                  setForgotStep('input');
                }}
              >
                Forgot password?
              </button>
            </div>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-control"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          {/* react-google-recaptcha NPM Package Component */}
          <div className="captcha-container" style={{ display: 'flex', justifyContent: 'center', margin: '1.25rem 0' }}>
            <ReCAPTCHA
              ref={recaptchaRef}
              sitekey="6Lf5hMktAAAAALQdEV5MCLWIVUW_S9tebI1w49HP"
              onChange={(token) => setCaptchaToken(token)}
              onExpired={() => setCaptchaToken(null)}
              theme="dark"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg mt-2"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        {/* Demo Shortcuts Divider */}
        {/* <div className="auth-divider">
          <span>Quick Demo Shortcuts</span>
        </div>

        <div className="demo-buttons-grid">
          <button type="button" className="btn btn-secondary demo-btn" onClick={() => handleQuickDemo('admin', 'admin123')}>
            Admin
          </button>
          <button type="button" className="btn btn-secondary demo-btn" onClick={() => handleQuickDemo('teacher', 'teacher123')}>
            Teacher
          </button>
          <button type="button" className="btn btn-secondary demo-btn" onClick={() => handleQuickDemo('00002', 'student123')}>
            Student
          </button>
        </div>  */}
      </div>
    </div>
  );
}
