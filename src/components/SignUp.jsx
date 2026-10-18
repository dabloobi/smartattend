import React, { useState } from 'react';
import { signUpUser, verifyEmail, resendVerificationCode } from '../services/api';

export default function SignUp({ onSignUpSuccess, onSwitchToSignIn, onLoginSuccess }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    student_id: '',
    course: 'BSIT',
    section: '3-1',
    birth_date: '',
    email: '',
    username: '',
    password: '',
  });

  // State: 'form' or 'verify'
  const [step, setStep] = useState('form');
  const [verificationCode, setVerificationCode] = useState('');
  const [verifyEmailAddress, setVerifyEmailAddress] = useState('');
  const [verifyUsername, setVerifyUsername] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await signUpUser(formData);
      if (res.status === 'success') {
        if (res.requires_verification) {
          setVerifyUsername(res.username || formData.username);
          setVerifyEmailAddress(res.email || formData.email);
          setSuccess(res.message || 'Verification code sent to your email.');
          setStep('verify');
        } else {
          setSuccess('Registration successful! You can now sign in.');
          setTimeout(() => {
            if (onSignUpSuccess) onSignUpSuccess();
            else if (onSwitchToSignIn) onSwitchToSignIn();
          }, 1500);
        }
      } else {
        setError(res.message || 'Registration failed');
      }
    } catch (err) {
      setError('Connection error to backend API.');
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
    setSuccess('');
    setLoading(true);

    try {
      const res = await verifyEmail(verifyUsername, verificationCode.trim());
      if (res.status === 'success') {
        setSuccess('Email verified successfully!');
        setTimeout(() => {
          if (onLoginSuccess && res.user) {
            onLoginSuccess(res.user);
          } else if (onSignUpSuccess) {
            onSignUpSuccess();
          } else if (onSwitchToSignIn) {
            onSwitchToSignIn();
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
      const res = await resendVerificationCode(verifyUsername);
      if (res.status === 'success') {
        setSuccess(res.message || 'A new code has been sent to your email.');
      } else {
        setError(res.message || 'Failed to resend code.');
      }
    } catch (err) {
      setError('Error resending verification email.');
    } finally {
      setResending(false);
    }
  };

  // STEP 2: VERIFICATION SCREEN
  if (step === 'verify') {
    return (
      <div className="auth-card-wrapper">
        <div className="card auth-card">
          <div className="card-header text-center">
            <div className="brand-logo-icon auth-logo" style={{ margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h2>Verify Your Email</h2>
            <p className="subtitle">
              We sent a 6-digit verification code to <br />
              <strong style={{ color: 'var(--primary, #388bfd)' }}>{verifyEmailAddress}</strong>
            </p>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <form onSubmit={handleVerifySubmit} className="auth-form">
            <div className="form-group text-center">
              <label htmlFor="code">Enter 6-Digit Code</label>
              <input
                id="code"
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
              <small className="text-muted mt-2 d-block">The code expires in 15 minutes.</small>
            </div>

            <button type="submit" className="btn btn-primary btn-block btn-lg mt-3" disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Continue'}
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
                onClick={() => setStep('form')}
              >
                Back to Sign Up
              </button>
            </div>
          </form>

          <div className="card-footer mt-3">
            <p>
              Already verified?{' '}
              <button className="link-button" onClick={onSwitchToSignIn}>
                Sign In here
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // STEP 1: REGISTRATION FORM
  return (
    <div className="auth-card-wrapper wide">
      <div className="card auth-card">
        <div className="card-header">
          <h2>Student Registration / Sign Up</h2>
          <p className="subtitle">Fill in your information to register in SmartAttend</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} className="auth-form grid-2">
          <div className="form-group">
            <label>First Name</label>
            <input
              type="text"
              name="first_name"
              className="form-control"
              placeholder="e.g. Juan"
              value={formData.first_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Last Name</label>
            <input
              type="text"
              name="last_name"
              className="form-control"
              placeholder="e.g. Dela Cruz"
              value={formData.last_name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Student ID</label>
            <input
              type="text"
              name="student_id"
              className="form-control"
              placeholder="e.g. 2026-00100"
              value={formData.student_id}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Course</label>
            <input
              type="text"
              name="course"
              className="form-control"
              placeholder="e.g. BSCS"
              value={formData.course}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Section</label>
            <input
              type="text"
              name="section"
              className="form-control"
              placeholder="e.g. 3-A"
              value={formData.section}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Birth Date</label>
            <input
              type="date"
              name="birth_date"
              className="form-control"
              value={formData.birth_date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group full-width">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              className="form-control"
              placeholder="e.g. juan@university.edu"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              name="username"
              className="form-control"
              placeholder="Create username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              className="form-control"
              placeholder="Create password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group full-width">
            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Creating Account & Sending Email...' : 'Complete Registration'}
            </button>
          </div>
        </form>

        <div className="card-footer">
          <p>
            Already registered?{' '}
            <button className="link-button" onClick={onSwitchToSignIn}>
              Sign In here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
