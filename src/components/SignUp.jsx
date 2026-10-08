import React, { useState } from 'react';
import { signUpUser } from '../services/api';

export default function SignUp({ onSignUpSuccess, onSwitchToSignIn }) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    student_id: '',
    course: 'BSCS',
    section: '3-A',
    birth_date: '',
    email: '',
    username: '',
    password: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

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
        setSuccess('Registration successful! You can now sign in.');
        setTimeout(() => {
          onSignUpSuccess();
        }, 1500);
      } else {
        setError(res.message || 'Registration failed');
      }
    } catch (err) {
      setError('Connection error to backend API.');
    } finally {
      setLoading(false);
    }
  };

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
              {loading ? 'Creating Account...' : 'Complete Registration'}
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
