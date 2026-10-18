import React, { useState, useEffect } from 'react';
import { fetchAttendanceLogs, verifyEmail, resendVerificationCode } from '../services/api';

export default function StudentPortal({ currentUser, onUserUpdate }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Email verification state
  const [isVerified, setIsVerified] = useState(() => {
    return Boolean(currentUser?.is_verified && Number(currentUser.is_verified) === 1);
  });
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [noticeMessage, setNoticeMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (currentUser && currentUser.student_id) {
      loadStudentLogs(currentUser.student_id);
    } else {
      setLoading(false);
    }
    if (currentUser && typeof currentUser.is_verified !== 'undefined') {
      setIsVerified(Boolean(Number(currentUser.is_verified) === 1));
    }
  }, [currentUser]);

  const loadStudentLogs = async (studentId) => {
    setLoading(true);
    try {
      const data = await fetchAttendanceLogs(studentId);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load student logs');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    setNoticeMessage({ type: '', text: '' });
    setActionLoading(true);
    try {
      const identifier = currentUser?.username || currentUser?.student_id;
      const emailParam = currentUser?.email || student?.email || '';
      const res = await resendVerificationCode(identifier, emailParam);
      if (res.status === 'success') {
        setShowOtpInput(true);
        setNoticeMessage({
          type: 'success',
          text: res.message || 'A 6-digit verification code has been sent to your email.'
        });
      } else {
        setNoticeMessage({ type: 'danger', text: res.message || 'Failed to send verification code.' });
      }
    } catch (err) {
      setNoticeMessage({ type: 'danger', text: 'Connection error while sending verification email.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setNoticeMessage({ type: 'danger', text: 'Please enter the 6-digit code.' });
      return;
    }

    setNoticeMessage({ type: '', text: '' });
    setActionLoading(true);
    try {
      const res = await verifyEmail(currentUser?.username || currentUser?.student_id, otpCode.trim());
      if (res.status === 'success') {
        setIsVerified(true);
        setShowOtpInput(false);
        setNoticeMessage({
          type: 'success',
          text: 'Email verified successfully! Your student account is now verified.'
        });

        // Update local session
        const updatedUser = { ...currentUser, is_verified: 1 };
        localStorage.setItem('smartattend_user', JSON.stringify(updatedUser));
        if (onUserUpdate) onUserUpdate(updatedUser);

        setTimeout(() => {
          setNoticeMessage({ type: '', text: '' });
        }, 5000);
      } else {
        setNoticeMessage({ type: 'danger', text: res.message || 'Invalid or expired verification code.' });
      }
    } catch (err) {
      setNoticeMessage({ type: 'danger', text: 'Error verifying code. Please check your connection.' });
    } finally {
      setActionLoading(false);
    }
  };

  const studentEmail = currentUser?.email || 'your registered email';

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h2>Student Attendance Portal</h2>
          <p className="subtitle">Welcome back, <strong>{currentUser?.first_name || currentUser?.username}</strong>!</p>
        </div>
      </div>

      {/* EMAIL VERIFICATION NOTICE IN ACCOUNT */}
      {!isVerified && (
        <div className="verify-notice-card">
          <div className="verify-notice-header">
            <span className="verify-notice-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            <div className="verify-notice-content">
              <h4>Action Required: Please Verify Your Email Address</h4>
              <p>
                Your account email (<strong>{studentEmail}</strong>) is not verified yet. Verifying ensures you receive official attendance records and can secure your account.
              </p>
            </div>
          </div>

          {noticeMessage.text && (
            <div className={`alert alert-${noticeMessage.type}`} style={{ margin: '0.5rem 0 0 0' }}>
              {noticeMessage.text}
            </div>
          )}

          <div className="verify-notice-actions">
            {!showOtpInput ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleSendCode}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Sending Email...' : 'Send Verification Code'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-sm"
                  onClick={() => setShowOtpInput(true)}
                >
                  I have a 6-digit code
                </button>
              </>
            ) : (
              <form onSubmit={handleVerifyOtp} className="verify-notice-otp-form">
                <input
                  type="text"
                  className="form-control verify-otp-input"
                  placeholder="123456"
                  maxLength="6"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ''))}
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Verifying...' : 'Verify Email'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-sm"
                  onClick={handleSendCode}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Sending...' : 'Resend Code'}
                </button>
                <button
                  type="button"
                  className="link-button"
                  style={{ fontSize: '0.85rem' }}
                  onClick={() => setShowOtpInput(false)}
                >
                  Cancel
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {isVerified && noticeMessage.text && (
        <div className={`alert alert-${noticeMessage.type} mb-4`}>
          {noticeMessage.text}
        </div>
      )}

      <div className="portal-stats-grid">
        <div className="card stat-card">
          <span className="stat-label">Total Attendance </span>
          <span className="stat-value">{logs.length}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Attendance Rate </span>
          <span className="stat-value">{logs.length > 0 ? '100%' : '0%'}</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Student ID </span>
          <span className="stat-value id">{currentUser?.student_id || 'N/A'}</span>
        </div>
      </div>

      <div className="card table-card">
        <div className="card-header">
          <h3>Your Attendance Records</h3>
        </div>

        {loading ? (
          <div className="loading-spinner">Loading history...</div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Status</th>
                  <th>Attendance Method</th>
                </tr>
              </thead>
              <tbody>
                {logs.length > 0 ? (
                  logs.map((l) => (
                    <tr key={l.id}>
                      <td>
                        {l.check_in_time || l.created_at || l.timestamp ? 
                          new Date(l.check_in_time || l.created_at || l.timestamp).toLocaleString('en-US', {
                            month: 'numeric',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                            hour12: true
                          }) : 'N/A'}
                      </td>
                      <td>
                        <span className="badge badge-success">
                          {l.status || 'Present'}
                        </span>
                      </td>
                      <td>{l.method}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="empty-table">No attendance records found for your account yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
