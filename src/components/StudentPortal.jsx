import React, { useState, useEffect } from 'react';
import { fetchAttendanceLogs } from '../services/api';

export default function StudentPortal({ currentUser }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser && currentUser.student_id) {
      loadStudentLogs(currentUser.student_id);
    } else {
      setLoading(false);
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

  return (
    <div className="portal-container">
      <div className="portal-header">
        <div>
          <h2>Student Attendance Portal</h2>
          <p className="subtitle">Welcome back, <strong>{currentUser?.first_name || currentUser?.username}</strong>!</p>
        </div>
      </div>

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
