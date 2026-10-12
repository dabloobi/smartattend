import React, { useState, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { signInUser } from '../services/api';

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

  // CAPTCHA Token State
  const [captchaToken, setCaptchaToken] = useState(null);
  const recaptchaRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check if reCAPTCHA token exists
    if (!captchaToken) {
      setError('⚠️ Please complete the "I\'m not a robot" CAPTCHA verification before signing in.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await signInUser(username, password);
      if (res.status === 'success') {
        onLoginSuccess(res.user);
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

  const handleQuickDemo = (demoUsername) => {
    setUsername(demoUsername);
    setPassword('admin123');
    setCaptchaToken('demo-verified-token');
  };

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
            <label htmlFor="password">Password</label>
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
         <div className="auth-divider">
          <span>Quick Demo Shortcuts</span>
        </div>

        <div className="demo-buttons-grid">
          <button type="button" className="btn btn-secondary demo-btn" onClick={() => handleQuickDemo('admin')}>
            Admin
          </button>
          <button type="button" className="btn btn-secondary demo-btn" onClick={() => handleQuickDemo('teacher')}>
            Teacher
          </button>
          <button type="button" className="btn btn-secondary demo-btn" onClick={() => handleQuickDemo('00001')}>
            Student
          </button>
        </div> 
      </div>
    </div>
  );
}
