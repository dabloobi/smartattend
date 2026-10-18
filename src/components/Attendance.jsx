import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { logCheckIn } from '../services/api';

export default function Attendance({ currentUser, setActiveTab }) {
  const [manualToken, setManualToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastCheckIn, setLastCheckIn] = useState(null);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  const scannerRef = useRef(null);
  const isScannerInitialized = useRef(false);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  /*
  // Initialize Camera QR Scanner if user is logged in (COMMENTED OUT)
  useEffect(() => {
    if (currentUser && !isScannerInitialized.current) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        {
          fps: 5,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          rememberLastUsedCamera: true
        },
        false
      );

      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;
      isScannerInitialized.current = true;

      return () => {
        if (scannerRef.current) {
          scannerRef.current.clear().catch(err => console.error("Scanner clear error", err));
          isScannerInitialized.current = false;
        }
      };
    }
  }, [currentUser]);
  */

  const isProcessingRef = useRef(false);
  const scanLockedRef = useRef(false);

  const handleProcessScan = async (scannedCode) => {
    if (!currentUser || isProcessingRef.current || scanLockedRef.current) return;

    isProcessingRef.current = true;
    setLoading(true);
    setMessage('');
    setIsError(false);

    const studentId = currentUser.student_id || currentUser.username;

    try {
      const res = await logCheckIn(studentId, scannedCode.trim(), 'QR Code Scan');
      if (res.status === 'success') {
        scanLockedRef.current = true; // Permanent lock for this session once recorded
        const studentInfo = res.student || currentUser || {};
        const nowObj = new Date();
        setLastCheckIn({
          student_id: studentId,
          name: studentInfo.first_name ? `${studentInfo.first_name} ${studentInfo.last_name || ''}` : studentId,
          course: studentInfo.course ? `${studentInfo.course} - ${studentInfo.section || ''}` : 'Registered Student',
          date: nowObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }),
          time: nowObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }),
        });
        setMessage('Attendance Recorded Successfully! Status: Present');
        setManualToken('');

        // Pause camera scanner so it stops capturing frames
        if (scannerRef.current && scannerRef.current.pause) {
          try {
            scannerRef.current.pause(true);
          } catch (e) {}
        }
      } else {
        if (res.already_recorded) {
          scanLockedRef.current = true; // Lock scanning if already checked in today
          if (scannerRef.current && scannerRef.current.pause) {
            try { scannerRef.current.pause(true); } catch (e) {}
          }
        }
        setIsError(true);
        setMessage(`${res.message || 'Invalid QR Code or student account error.'}`);
      }
    } catch (err) {
      setIsError(true);
      setMessage('Connection error to backend server.');
    } finally {
      setLoading(false);
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 2000);
    }
  };

  const onScanSuccess = (decodedText) => {
    if (decodedText && !isProcessingRef.current) {
      handleProcessScan(decodedText);
    }
  };

  const onScanFailure = (error) => {
    // Silence continuous frame scan error logs
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualToken.trim()) return;
    handleProcessScan(manualToken.trim());
  };

  const formattedCurrentDate = currentDateTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'numeric',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="checkin-container">
      <div className="checkin-header text-center mb-4">
        <h2>Classroom QR Code Attendance</h2>
        <div className="date-clock-banner">
          <span className="current-date-badge">{formattedCurrentDate}</span>
        </div>
      </div>

      {!currentUser ? (
        /* ACCOUNT REQUIRED ALERT BANNER */
        <div className="card text-center" style={{ maxWidth: '680px', margin: '0 auto', padding: '2.5rem' }}>
          <div style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: 'var(--radius)',
            padding: '1.5rem',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{ color: '#ef4444', margin: '0 0 0.5rem 0', fontSize: '1.3rem', fontWeight: 800, textAlign: 'center'}}>
              Account Required
            </h3>
            <p style={{ margin: 0, color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: '1.5', textAlign: 'center'}}>
              You must be signed into your Account.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn btn-primary btn-lg"
              onClick={() => setActiveTab && setActiveTab('signin')}
              style={{ padding: '0.8rem 2rem', fontWeight: 800 }}
            >
              Sign In to Your Account
            </button>
          </div>
        </div>
      ) : (
        <div className="checkin-grid">
          {/* 
          ========================================================================
          CAMERA QR SCANNER & MANUAL TOKEN FORM (COMMENTED OUT)
          ========================================================================
          <div className="card camera-card" style={{ padding: '1.5rem' }}>
            <div style={{
              background: 'var(--bg-hover)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '0.85rem 1.25rem',
              marginBottom: '1.25rem',
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                  Authenticated Student
                </span>
                <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                  {currentUser.name || `${currentUser.first_name || ''} ${currentUser.last_name || ''}`}
                </h4>
              </div>
              <span className="badge badge-id" style={{ fontSize: '0.85rem' }}>
                ID: {currentUser.student_id || currentUser.username}
              </span>
            </div>

            <div className="scanner-wrapper" style={{ borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              <div id="reader" style={{ width: '100%' }}></div>
            </div>

            <form onSubmit={handleManualSubmit} className="mt-4" style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
              <div className="form-group mb-2">
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  Having camera trouble? Enter QR Code Token:
                </label>
                <div className="manual-token-row">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. SMARTATTEND-QR-00000"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-token-submit" disabled={loading || !manualToken.trim()}>
                    Submit
                  </button>
                </div>
              </div>
            </form>

            {message && (
              <div className={`alert ${isError ? 'alert-danger' : 'alert-success'} mt-3`}>
                {message}
              </div>
            )}
          </div>
          */}

          {/* Attendance Result Card */}
          <div className="card result-card" style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem', textAlign: 'center' }}>
              Live Attendance Status
            </h3>
            {lastCheckIn ? (
              <div className="checkin-success-box" style={{
                background: 'var(--success-bg)',
                border: '1px solid var(--success)',
                borderRadius: 'var(--radius)',
                padding: '1.5rem',
                textAlign: 'center'
              }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem', color: 'var(--success)' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div className="result-details">
                  <h4 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.5rem 0' }}>{lastCheckIn.name}</h4>
                  <p className="badge badge-id mb-2">{lastCheckIn.student_id}</p>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem' }}><strong>Course & Section:</strong> {lastCheckIn.course}</p>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem' }}><strong>Date:</strong> {lastCheckIn.date}</p>
                  <p style={{ margin: '4px 0', fontSize: '0.9rem' }}><strong>Time:</strong> {lastCheckIn.time}</p>
                  <span className="badge badge-success mt-2" style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
                    Status: Present
                  </span>
                </div>
              </div>
            ) : (
              <div className="empty-result text-center" style={{ padding: '2.5rem 1rem', color: 'var(--text-muted)' }}>
                <p style={{ fontWeight: 700, fontSize: '1.1rem', margin: '0 0 0.5rem 0', color: 'var(--text-main)' }}>Attendance Check-In</p>
                <small style={{ fontSize: '0.9rem' }}>Your attendance record status will display here upon check-in.</small>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
