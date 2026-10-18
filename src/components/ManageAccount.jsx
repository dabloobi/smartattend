import React, { useState, useEffect, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import {
  getProfile,
  updateProfile,
  requestEmailChangeOtp,
  confirmEmailChange,
  requestPasswordChangeOtp,
  confirmPasswordChange,
  resendVerificationCode,
  verifyEmail,
} from '../services/api';

// ============================================================================
// SVG ICONS (Feather / Lucide style - Zero Emojis)
// ============================================================================
function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
      <line x1="1" y1="1" x2="23" y2="23"></line>
    </svg>
  );
}

function UserIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  );
}

function MailIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
      <polyline points="22,6 12,13 2,6"></polyline>
    </svg>
  );
}

function LockIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  );
}

function AlertTriangleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  );
}

function CheckCircleIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}

function ShieldIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
    </svg>
  );
}

/**
 * Robust Client-Side Canvas Image Square-Crop & Compressor.
 * Converts ANY image (even high-res camera photos) into a lightweight 256x256 JPEG data URL (~25-35KB).
 */
function processAvatarImage(file, targetSize = 256, quality = 0.88) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Please select a valid image file (PNG, JPG, WebP).'));
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;
          const ctx = canvas.getContext('2d');

          // Center square crop computation
          const naturalW = img.naturalWidth || img.width;
          const naturalH = img.naturalHeight || img.height;
          const minDim = Math.min(naturalW, naturalH);
          const startX = (naturalW - minDim) / 2;
          const startY = (naturalH - minDim) / 2;

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, startX, startY, minDim, minDim, 0, 0, targetSize, targetSize);

          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (err) {
          reject(new Error('Failed to process image canvas.'));
        }
      };
      img.onerror = () => reject(new Error('Could not decode image file.'));
      img.src = event.target.result;
    };
    reader.onerror = () => reject(new Error('Error reading uploaded file.'));
    reader.readAsDataURL(file);
  });
}

export default function ManageAccount({ currentUser, onUserUpdate, onBack, darkMode }) {
  const [activeSubTab, setActiveSubTab] = useState('profile'); // 'profile' | 'email' | 'security'
  const fileInputRef = useRef(null);

  // CAPTCHA States & Refs
  const [profileCaptcha, setProfileCaptcha] = useState(null);
  const profileCaptchaRef = useRef(null);

  const [emailCaptcha, setEmailCaptcha] = useState(null);
  const emailCaptchaRef = useRef(null);

  const [passCaptcha, setPassCaptcha] = useState(null);
  const passCaptchaRef = useRef(null);

  // Profile State
  const [name, setName] = useState(currentUser?.name || currentUser?.first_name || '');
  const [avatar, setAvatar] = useState(currentUser?.avatar || '');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: '', text: '' });

  // Email Change State
  const [currentEmail, setCurrentEmail] = useState(currentUser?.email || '');
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailStep, setEmailStep] = useState('input'); // 'input' | 'otp'
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState({ type: '', text: '' });

  // Verification State for Unverified Accounts
  const [isVerified, setIsVerified] = useState(() => Number(currentUser?.is_verified) === 1);
  const [verifyOtp, setVerifyOtp] = useState('');
  const [showVerifyInput, setShowVerifyInput] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState({ type: '', text: '' });

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordOtp, setPasswordOtp] = useState('');
  const [passwordStep, setPasswordStep] = useState('request'); // 'request' | 'otp'
  const [passLoading, setPassLoading] = useState(false);
  const [passMsg, setPassMsg] = useState({ type: '', text: '' });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Sync state with fresh backend profile on mount
  useEffect(() => {
    if (currentUser?.id || currentUser?.username) {
      loadLatestProfile();
    }
  }, [currentUser?.id, currentUser?.username]);

  const loadLatestProfile = async () => {
    try {
      const res = await getProfile(currentUser?.id, currentUser?.username);
      if (res.status === 'success' && res.user) {
        setName(res.user.name || '');
        setAvatar(res.user.avatar || '');
        setCurrentEmail(res.user.email || '');
        setIsVerified(Number(res.user.is_verified) === 1);
        
        // Update session
        const merged = { ...currentUser, ...res.user };
        localStorage.setItem('smartattend_user', JSON.stringify(merged));
        if (onUserUpdate) onUserUpdate(merged);
      }
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  };

  // --------------------------------------------------------------------------
  // AVATAR UPLOAD HANDLER (Auto-compresses to 256x256 and Auto-saves)
  // --------------------------------------------------------------------------
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProfileLoading(true);
    setProfileMsg({ type: '', text: '' });

    try {
      const compressedDataUrl = await processAvatarImage(file, 256, 0.88);
      
      // Update local state preview immediately
      setAvatar(compressedDataUrl);

      // Auto-save immediately to server so it persists and reflects everywhere
      const displayName = name.trim() || currentUser?.name || currentUser?.username || 'User';
      const res = await updateProfile(currentUser?.id, { name: displayName, avatar: compressedDataUrl });

      if (res.status === 'success') {
        setProfileMsg({ type: 'success', text: 'Profile picture updated successfully!' });
        const updated = { ...currentUser, ...res.user, avatar: compressedDataUrl };
        localStorage.setItem('smartattend_user', JSON.stringify(updated));
        if (onUserUpdate) onUserUpdate(updated);
      } else {
        setProfileMsg({ type: 'danger', text: res.message || 'Failed to save profile picture to server.' });
      }
    } catch (err) {
      setProfileMsg({ type: 'danger', text: err.message || 'Failed to process image file.' });
    } finally {
      setProfileLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setProfileLoading(true);
    setProfileMsg({ type: '', text: '' });

    try {
      setAvatar('');
      const displayName = name.trim() || currentUser?.name || currentUser?.username || 'User';
      const res = await updateProfile(currentUser?.id, { name: displayName, avatar: '' });

      if (res.status === 'success') {
        setProfileMsg({ type: 'info', text: 'Profile picture removed.' });
        const updated = { ...currentUser, ...res.user, avatar: '' };
        localStorage.setItem('smartattend_user', JSON.stringify(updated));
        if (onUserUpdate) onUserUpdate(updated);
      } else {
        setProfileMsg({ type: 'danger', text: res.message || 'Failed to remove picture on server.' });
      }
    } catch (err) {
      setProfileMsg({ type: 'danger', text: 'Connection error removing profile picture.' });
    } finally {
      setProfileLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // --------------------------------------------------------------------------
  // SAVE PROFILE (Name & Avatar)
  // --------------------------------------------------------------------------
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setProfileMsg({ type: 'danger', text: 'Name cannot be empty.' });
      return;
    }
    if (!profileCaptcha) {
      setProfileMsg({ type: 'danger', text: 'Please complete the CAPTCHA.' });
      return;
    }

    setProfileLoading(true);
    setProfileMsg({ type: '', text: '' });

    try {
      const res = await updateProfile(currentUser?.id, { name: name.trim(), avatar });
      if (res.status === 'success') {
        setProfileMsg({ type: 'success', text: 'Profile updated successfully!' });
        const updated = { ...currentUser, ...res.user };
        localStorage.setItem('smartattend_user', JSON.stringify(updated));
        if (onUserUpdate) onUserUpdate(updated);
        if (profileCaptchaRef.current) profileCaptchaRef.current.reset();
        setProfileCaptcha(null);
      } else {
        setProfileMsg({ type: 'danger', text: res.message || 'Failed to update profile.' });
        if (profileCaptchaRef.current) profileCaptchaRef.current.reset();
        setProfileCaptcha(null);
      }
    } catch (err) {
      setProfileMsg({ type: 'danger', text: 'Error connecting to server.' });
      if (profileCaptchaRef.current) profileCaptchaRef.current.reset();
      setProfileCaptcha(null);
    } finally {
      setProfileLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // DIRECT ACCOUNT EMAIL VERIFICATION (for unverified accounts)
  // --------------------------------------------------------------------------
  const handleSendVerifyCode = async () => {
    setVerifyMsg({ type: '', text: '' });
    setVerifyLoading(true);
    try {
      const identifier = currentUser?.username || currentUser?.student_id;
      const emailParam = currentUser?.email || currentEmail || '';
      const res = await resendVerificationCode(identifier, emailParam);
      if (res.status === 'success') {
        setShowVerifyInput(true);
        setVerifyMsg({
          type: 'success',
          text: res.message || 'A 6-digit verification code has been sent to your email.'
        });
      } else {
        setVerifyMsg({ type: 'danger', text: res.message || 'Failed to send verification code.' });
      }
    } catch (err) {
      setVerifyMsg({ type: 'danger', text: 'Connection error sending verification code.' });
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleConfirmVerifyCode = async (e) => {
    e.preventDefault();
    if (!verifyOtp.trim()) {
      setVerifyMsg({ type: 'danger', text: 'Please enter the 6-digit code.' });
      return;
    }

    setVerifyLoading(true);
    setVerifyMsg({ type: '', text: '' });

    try {
      const identifier = currentUser?.username || currentUser?.student_id;
      const res = await verifyEmail(identifier, verifyOtp.trim());
      if (res.status === 'success') {
        setIsVerified(true);
        setShowVerifyInput(false);
        setVerifyMsg({
          type: 'success',
          text: 'Email address verified successfully!'
        });
        const updated = { ...currentUser, is_verified: 1 };
        localStorage.setItem('smartattend_user', JSON.stringify(updated));
        if (onUserUpdate) onUserUpdate(updated);
      } else {
        setVerifyMsg({ type: 'danger', text: res.message || 'Invalid or expired verification code.' });
      }
    } catch (err) {
      setVerifyMsg({ type: 'danger', text: 'Error verifying code.' });
    } finally {
      setVerifyLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // EMAIL CHANGE WITH OTP
  // --------------------------------------------------------------------------
  const handleRequestEmailChange = async (e) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      setEmailMsg({ type: 'danger', text: 'Please enter a new email address.' });
      return;
    }
    if (newEmail.trim().toLowerCase() === currentEmail.trim().toLowerCase()) {
      setEmailMsg({ type: 'danger', text: 'New email is identical to current email.' });
      return;
    }
    if (!emailCaptcha) {
      setEmailMsg({ type: 'danger', text: 'Please complete the CAPTCHA.' });
      return;
    }

    setEmailLoading(true);
    setEmailMsg({ type: '', text: '' });

    try {
      const res = await requestEmailChangeOtp(currentUser?.id, newEmail.trim());
      if (res.status === 'success') {
        setEmailStep('otp');
        setEmailMsg({
          type: 'success',
          text: `A 6-digit code was sent to ${newEmail}.`
        });
      } else {
        setEmailMsg({ type: 'danger', text: res.message || 'Failed to request email change.' });
        if (emailCaptchaRef.current) emailCaptchaRef.current.reset();
        setEmailCaptcha(null);
      }
    } catch (err) {
      setEmailMsg({ type: 'danger', text: 'Connection error while requesting email change.' });
      if (emailCaptchaRef.current) emailCaptchaRef.current.reset();
      setEmailCaptcha(null);
    } finally {
      setEmailLoading(false);
    }
  };

  const handleConfirmEmailChange = async (e) => {
    e.preventDefault();
    if (!emailOtp.trim()) {
      setEmailMsg({ type: 'danger', text: 'Please enter the 6-digit OTP code.' });
      return;
    }

    setEmailLoading(true);
    setEmailMsg({ type: '', text: '' });

    try {
      const res = await confirmEmailChange(currentUser?.id, emailOtp.trim());
      if (res.status === 'success') {
        setCurrentEmail(res.user?.email || newEmail);
        setIsVerified(true);
        setEmailStep('input');
        setNewEmail('');
        setEmailOtp('');
        setEmailMsg({
          type: 'success',
          text: 'Email address successfully updated and verified!'
        });
        const updated = { ...currentUser, ...res.user, is_verified: 1 };
        localStorage.setItem('smartattend_user', JSON.stringify(updated));
        if (onUserUpdate) onUserUpdate(updated);
      } else {
        setEmailMsg({ type: 'danger', text: res.message || 'Invalid or expired code.' });
      }
    } catch (err) {
      setEmailMsg({ type: 'danger', text: 'Connection error while confirming email change.' });
    } finally {
      setEmailLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // PASSWORD CHANGE WITH OTP
  // --------------------------------------------------------------------------
  const handleRequestPasswordOtp = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!currentEmail) {
      setPassMsg({ type: 'danger', text: 'No email address registered. Please add an email address in Change Email first.' });
      return;
    }
    if (!passCaptcha) {
      setPassMsg({ type: 'danger', text: 'Please complete the CAPTCHA.' });
      return;
    }

    setPassLoading(true);
    setPassMsg({ type: '', text: '' });

    try {
      const res = await requestPasswordChangeOtp(currentUser?.id);
      if (res.status === 'success') {
        setPasswordStep('otp');
        setPassMsg({
          type: 'success',
          text: `A 6-digit code has been sent to ${currentEmail}.`
        });
      } else {
        setPassMsg({ type: 'danger', text: res.message || 'Failed to send code.' });
        if (passCaptchaRef.current) passCaptchaRef.current.reset();
        setPassCaptcha(null);
      }
    } catch (err) {
      setPassMsg({ type: 'danger', text: 'Connection error while sending code.' });
      if (passCaptchaRef.current) passCaptchaRef.current.reset();
      setPassCaptcha(null);
    } finally {
      setPassLoading(false);
    }
  };

  const handleConfirmPasswordChange = async (e) => {
    e.preventDefault();
    if (!newPassword) {
      setPassMsg({ type: 'danger', text: 'Please enter a new password.' });
      return;
    }
    if (newPassword.length < 6) {
      setPassMsg({ type: 'danger', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassMsg({ type: 'danger', text: 'New password and confirm password do not match.' });
      return;
    }
    if (!passwordOtp.trim()) {
      setPassMsg({ type: 'danger', text: 'Please enter the 6-digit OTP code sent to your email.' });
      return;
    }

    setPassLoading(true);
    setPassMsg({ type: '', text: '' });

    try {
      const res = await confirmPasswordChange(currentUser?.id, {
        currentPassword,
        newPassword,
        code: passwordOtp.trim(),
      });
      if (res.status === 'success') {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordOtp('');
        setPasswordStep('request');
        setPassMsg({
          type: 'success',
          text: 'Password updated successfully! You can now use your new password.'
        });
      } else {
        setPassMsg({ type: 'danger', text: res.message || 'Failed to change password.' });
      }
    } catch (err) {
      setPassMsg({ type: 'danger', text: 'Connection error while changing password.' });
    } finally {
      setPassLoading(false);
    }
  };

  const avatarInitial = (name || currentUser?.username || 'U')[0].toUpperCase();

  return (
    <div className="manage-account-container">
      {/* Top Header */}
      <div className="manage-account-header">
        <div className="header-left">
          {onBack && (
            <button className="btn btn-outline-sm btn-back" onClick={onBack}>
              &larr; Back
            </button>
          )}
          <div>
            <h2>Manage Account</h2>
            <p className="subtitle">Customize your profile, update email address, and manage security settings.</p>
          </div>
        </div>
      </div>

      {/* Prominent Verification Notice Card if Unverified */}
      {!isVerified && (
        <div className="verify-notice-card" style={{ marginBottom: '1.5rem' }}>
          <div className="verify-notice-header">
            <span className="verify-notice-icon">
              <AlertTriangleIcon size={22} />
            </span>
            <div className="verify-notice-content">
              <h4>Account Verification Required</h4>
              <p>
                Your account email (<strong>{currentEmail || 'No Email'}</strong>) is currently <strong>Unverified</strong>. 
                Please verify your account secure it.
              </p>
            </div>
          </div>

          {verifyMsg.text && (
            <div className={`alert alert-${verifyMsg.type}`} style={{ margin: '0.75rem 0' }}>
              {verifyMsg.text}
            </div>
          )}

          <div className="verify-notice-actions">
            {!showVerifyInput ? (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleSendVerifyCode}
                  disabled={verifyLoading}
                >
                  {verifyLoading ? 'Sending Email...' : 'Send Verification OTP'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-sm"
                  onClick={() => setShowVerifyInput(true)}
                >
                  I already have a code
                </button>
              </>
            ) : (
              <form onSubmit={handleConfirmVerifyCode} className="verify-notice-otp-form">
                <input
                  type="text"
                  className="form-control verify-otp-input"
                  placeholder="123456"
                  maxLength="6"
                  value={verifyOtp}
                  onChange={(e) => setVerifyOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={verifyLoading || verifyOtp.length < 6}
                >
                  {verifyLoading ? 'Verifying...' : 'Verify Code'}
                </button>
                <button
                  type="button"
                  className="btn btn-outline-sm"
                  onClick={handleSendVerifyCode}
                  disabled={verifyLoading}
                >
                  Resend Code
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Main Account Tabs */}
      <div className="manage-account-layout">
        {/* Navigation Sidebar */}
        <aside className="manage-account-sidebar">
          <div className="sidebar-user-summary">
            <div className="summary-avatar">
              {avatar ? (
                <img src={avatar} alt="Profile" className="summary-avatar-img" />
              ) : (
                <span className="summary-avatar-initial">{avatarInitial}</span>
              )}
            </div>
            <div className="summary-details">
              <h4>{name || currentUser?.username}</h4>
              <span className="badge-role">{currentUser?.role || 'User'}</span>
              <div className="summary-status">
                {isVerified ? (
                  <span className="badge-verified-inline">Verified</span>
                ) : (
                  <span className="badge-unverified-inline">Unverified</span>
                )}
              </div>
            </div>
          </div>

          <nav className="account-nav-pills">
            <button
              className={`account-nav-btn ${activeSubTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('profile')}
            >
              <span className="btn-icon"><UserIcon size={16} /></span>
              Profile
            </button>
            <button
              className={`account-nav-btn ${activeSubTab === 'email' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('email')}
            >
              <span className="btn-icon"><MailIcon size={16} /></span>
              Change Email
            </button>
            <button
              className={`account-nav-btn ${activeSubTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveSubTab('security')}
            >
              <span className="btn-icon"><LockIcon size={16} /></span>
              Change Password
            </button>
          </nav>
        </aside>

        {/* Content Panel */}
        <div className="manage-account-content">
          {/* --------------------------------------------------------------- */}
          {/* TAB 1: PROFILE */}
          {/* --------------------------------------------------------------- */}
          {activeSubTab === 'profile' && (
            <div className="account-card">
              <div className="account-card-header">
                <h3>Profile</h3>
              </div>

              {profileMsg.text && (
                <div className={`alert alert-${profileMsg.type}`}>{profileMsg.text}</div>
              )}

              <form onSubmit={handleSaveProfile} className="account-form">
                {/* Avatar Uploader */}
                <div className="form-group avatar-upload-group">
                  <label>Profile Picture</label>
                  <div className="avatar-preview-container">
                    <div className="avatar-preview-box">
                      {avatar ? (
                        <img src={avatar} alt="Avatar Preview" className="avatar-preview-img" />
                      ) : (
                        <div className="avatar-preview-fallback">{avatarInitial}</div>
                      )}
                    </div>
                    <div className="avatar-upload-actions">
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/png, image/jpeg, image/webp"
                        style={{ display: 'none' }}
                        onChange={handleAvatarChange}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={profileLoading}
                      >
                        {profileLoading ? 'Processing...' : 'Upload Photo'}
                      </button>
                      {avatar && (
                        <button
                          type="button"
                          className="btn btn-danger-sm"
                          onClick={handleRemoveAvatar}
                          disabled={profileLoading}
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Dela Cruz"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Username</label>
                    <input
                      type="text"
                      className="form-control"
                      value={currentUser?.username || ''}
                      disabled
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Role</label>
                    <input
                      type="text"
                      className="form-control"
                      value={currentUser?.role || 'Student'}
                      disabled
                    />
                  </div>
                  {currentUser?.student_id && (
                    <div className="form-group">
                      <label>Student ID</label>
                      <input
                        type="text"
                        className="form-control"
                        value={currentUser.student_id}
                        disabled
                      />
                    </div>
                  )}
                </div>

                {/* reCAPTCHA for Profile Details */}
                <div className="manage-account-captcha-wrapper">
                  <ReCAPTCHA
                    ref={profileCaptchaRef}
                    sitekey="6Lf5hMktAAAAALQdEV5MCLWIVUW_S9tebI1w49HP"
                    onChange={(token) => setProfileCaptcha(token)}
                    onExpired={() => setProfileCaptcha(null)}
                    theme={darkMode ? 'dark' : 'light'}
                  />
                </div>

                <div className="form-actions" style={{ marginTop: '1.25rem' }}>
                  <button type="submit" className="btn btn-primary" disabled={profileLoading}>
                    {profileLoading ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* TAB 2: CHANGE EMAIL */}
          {/* --------------------------------------------------------------- */}
          {activeSubTab === 'email' && (
            <div className="account-card">
              <div className="account-card-header">
                <h3>Change Email</h3>
              </div>

              {emailMsg.text && (
                <div className={`alert alert-${emailMsg.type}`}>{emailMsg.text}</div>
              )}

              {/* Current Email Display */}
              <div className="current-email-box">
                <div>
                  <span className="sub-label">Current Email:</span>
                  <div className="email-value-row">
                    <strong className="email-display">{currentEmail || 'None registered'}</strong>
                    {isVerified ? (
                      <span className="badge-verified-pill">Verified</span>
                    ) : (
                      <span className="badge-unverified-pill">Unverified</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="email-change-section" style={{ marginTop: '1.25rem' }}>
                {emailStep === 'input' ? (
                  <form onSubmit={handleRequestEmailChange} className="account-form">
                    <div className="form-group">
                      <label>New Email Address</label>
                      <input
                        type="email"
                        className="form-control"
                        placeholder="name@example.com"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        required
                      />
                    </div>

                    {/* reCAPTCHA for Change Email */}
                    <div className="manage-account-captcha-wrapper">
                      <ReCAPTCHA
                        ref={emailCaptchaRef}
                        sitekey="6Lf5hMktAAAAALQdEV5MCLWIVUW_S9tebI1w49HP"
                        onChange={(token) => setEmailCaptcha(token)}
                        onExpired={() => setEmailCaptcha(null)}
                        theme={darkMode ? 'dark' : 'light'}
                      />
                    </div>

                    <div className="form-actions" style={{ marginTop: '1.25rem' }}>
                      <button type="submit" className="btn btn-primary" disabled={emailLoading || !newEmail}>
                        {emailLoading ? 'Sending...' : 'Send Code'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleConfirmEmailChange} className="account-form">
                    <div className="alert alert-info">
                      Enter the 6-digit code sent to <strong>{newEmail}</strong>.
                    </div>

                    <div className="form-group">
                      <label>6-Digit Code</label>
                      <input
                        type="text"
                        className="form-control verify-otp-input"
                        placeholder="123456"
                        maxLength="6"
                        value={emailOtp}
                        onChange={(e) => setEmailOtp(e.target.value.replace(/[^0-9]/g, ''))}
                        autoFocus
                        required
                      />
                    </div>

                    <div className="form-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <button type="submit" className="btn btn-primary" disabled={emailLoading || emailOtp.length < 6}>
                        {emailLoading ? 'Confirming...' : 'Confirm'}
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-sm"
                        onClick={handleRequestEmailChange}
                        disabled={emailLoading}
                      >
                        Resend Code
                      </button>
                      <button
                        type="button"
                        className="btn btn-text"
                        onClick={() => setEmailStep('input')}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* TAB 3: CHANGE PASSWORD */}
          {/* --------------------------------------------------------------- */}
          {activeSubTab === 'security' && (
            <div className="account-card">
              <div className="account-card-header">
                <h3>Change Password</h3>
              </div>

              {passMsg.text && (
                <div className={`alert alert-${passMsg.type}`}>{passMsg.text}</div>
              )}

              {passwordStep === 'request' ? (
                <form onSubmit={handleRequestPasswordOtp} className="account-form">
                  <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)' }}>
                    Send a 6-digit verification code to <strong>{currentEmail || 'your email'}</strong> to change your password.
                  </p>

                  {/* reCAPTCHA for Change Password */}
                  <div className="manage-account-captcha-wrapper">
                    <ReCAPTCHA
                      ref={passCaptchaRef}
                      sitekey="6Lf5hMktAAAAALQdEV5MCLWIVUW_S9tebI1w49HP"
                      onChange={(token) => setPassCaptcha(token)}
                      onExpired={() => setPassCaptcha(null)}
                      theme={darkMode ? 'dark' : 'light'}
                    />
                  </div>

                  <div className="form-actions" style={{ marginTop: '1.25rem' }}>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={passLoading || !currentEmail}
                    >
                      {passLoading ? 'Sending...' : 'Send Code'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleConfirmPasswordChange} className="account-form">
                  <div className="alert alert-info">
                    Enter the 6-digit code sent to <strong>{currentEmail}</strong> and your new password.
                  </div>

                  <div className="form-group">
                    <label>6-Digit Code</label>
                    <input
                      type="text"
                      className="form-control verify-otp-input"
                      placeholder="123456"
                      maxLength="6"
                      value={passwordOtp}
                      onChange={(e) => setPasswordOtp(e.target.value.replace(/[^0-9]/g, ''))}
                      autoFocus
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label>Current Password (Optional)</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showCurrentPass ? 'text' : 'password'}
                        className="form-control"
                        placeholder="Enter current password if known"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        tabIndex="-1"
                      >
                        {showCurrentPass ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>New Password</label>
                      <div className="password-input-wrapper">
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          className="form-control"
                          placeholder="At least 6 characters"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowNewPass(!showNewPass)}
                          tabIndex="-1"
                        >
                          {showNewPass ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Confirm New Password</label>
                      <div className="password-input-wrapper">
                        <input
                          type={showConfirmPass ? 'text' : 'password'}
                          className="form-control"
                          placeholder="Re-enter new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle-btn"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          tabIndex="-1"
                        >
                          {showConfirmPass ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="form-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '1.5rem' }}>
                    <button type="submit" className="btn btn-primary" disabled={passLoading || !newPassword || passwordOtp.length < 6}>
                      {passLoading ? 'Updating...' : 'Change Password'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-sm"
                      onClick={handleRequestPasswordOtp}
                      disabled={passLoading}
                    >
                      Resend Code
                    </button>
                    <button
                      type="button"
                      className="btn btn-text"
                      onClick={() => setPasswordStep('request')}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
