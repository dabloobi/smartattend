import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { fetchStudents, fetchAttendanceLogs, generateMasterQRCode, fetchMasterQRCode } from '../services/api';

export default function TeacherPortal({ currentUser }) {
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'attendance'
  const [students, setStudents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filter States: Section, Specific Student, Date, Search Term
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState('All');
  const [selectedDate, setSelectedDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Master QR Code State
  const [masterQRToken, setMasterQRToken] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [generatingQR, setGeneratingQR] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showProjectorModal, setShowProjectorModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Duration Modal Form State
  const [durationValue, setDurationValue] = useState('30');
  const [durationUnit, setDurationUnit] = useState('minutes'); // 'minutes' | 'hours' | 'days' | 'never'

  useEffect(() => {
    loadData();
    loadActiveQR();
  }, []);

  useEffect(() => {
    if (masterQRToken) {
      QRCode.toDataURL(masterQRToken, {
        width: 320,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('QR rendering error:', err));
    } else {
      setQrDataUrl('');
    }
  }, [masterQRToken]);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [studentsData, logsData] = await Promise.all([
        fetchStudents(),
        fetchAttendanceLogs()
      ]);
      setStudents(Array.isArray(studentsData) ? studentsData : []);
      setLogs(Array.isArray(logsData) ? logsData : []);
    } catch (err) {
      setError('Failed to load data from backend server.');
    } finally {
      setLoading(false);
    }
  };

  const loadActiveQR = async () => {
    try {
      const res = await fetchMasterQRCode();
      if (res.status === 'success' && res.active && res.code) {
        setMasterQRToken(res.code);
        setExpiresAt(res.expires_at || null);
      } else {
        setMasterQRToken('');
        setExpiresAt(null);
      }
    } catch (err) {
      console.error('Failed to load active QR code');
    }
  };

  const handleGenerateQRSubmit = async (e) => {
    if (e) e.preventDefault();
    setGeneratingQR(true);
    setCopied(false);
    try {
      const val = durationUnit === 'never' ? 0 : parseInt(durationValue, 10);
      const res = await generateMasterQRCode(val, durationUnit);
      if (res.status === 'success' && res.code) {
        setMasterQRToken(res.code);
        setExpiresAt(res.expires_at || null);
        setShowConfigModal(false);
      } else {
        alert(res.message || 'Failed to generate QR code.');
      }
    } catch (err) {
      alert('Error connecting to backend server.');
    } finally {
      setGeneratingQR(false);
    }
  };

  const handleCopyQR = () => {
    if (masterQRToken) {
      navigator.clipboard.writeText(masterQRToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const formatExpiration = (expStr) => {
    if (!expStr) return 'No Expiration (Active)';
    const expDate = new Date(expStr);
    const now = new Date();
    if (expDate <= now) return 'Expired';
    return `Expires: ${expDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (${expDate.toLocaleDateString()})`;
  };

  const handleResetFilters = () => {
    setSelectedSection('All');
    setSelectedStudent('All');
    setSelectedDate('');
    setSearchTerm('');
  };

  // Filter only student accounts (exclude Teacher & Admin)
  const onlyStudents = students.filter((s) => (s.role || 'Student').toLowerCase() === 'student');

  // Helper to format Course + Section title (e.g. BSIT 3-1)
  const getCourseSectionLabel = (sec) => {
    if (sec === 'All') return 'All Sections';
    const match = onlyStudents.find((s) => s.section === sec);
    if (match && match.course && match.course !== '-' && match.course !== 'Teacher') {
      return `${match.course} ${sec}`;
    }
    return `Section ${sec}`;
  };

  // Get list of unique sections (from student records only)
  const sectionsList = ['All', ...Array.from(new Set(onlyStudents.map((s) => s.section).filter((sec) => sec && sec !== '-' && sec !== 'Faculty')))];

  // Filtered Students by Section, Specific Student & Search (ONLY Students)
  const filteredStudents = onlyStudents.filter((s) => {
    const matchesSection = selectedSection === 'All' || s.section === selectedSection;
    const matchesStudent =
      selectedStudent === 'All' ||
      s.student_id === selectedStudent ||
      s.username === selectedStudent;
    const matchesSearch =
      !searchTerm.trim() ||
      s.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.course?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSection && matchesStudent && matchesSearch;
  });

  // Filtered Logs by Section, Specific Student, Date, & Search
  const filteredLogs = logs.filter((l) => {
    // 1. Section Filter
    const matchesSection =
      selectedSection === 'All' ||
      (l.course_section && l.course_section.includes(selectedSection)) ||
      students.some((st) => st.student_id === l.student_id && st.section === selectedSection);

    // 2. Specific Student Filter
    const matchesStudent =
      selectedStudent === 'All' ||
      l.student_id === selectedStudent;

    // 3. Date Filter
    let matchesDate = true;
    if (selectedDate) {
      const rawDate = l.check_in_time || l.created_at || l.timestamp;
      if (rawDate) {
        const d = new Date(rawDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const localISO = `${yyyy}-${mm}-${dd}`;
        matchesDate = localISO === selectedDate || d.toISOString().startsWith(selectedDate);
      }
    }

    // 4. Search Keyword Filter
    const matchesSearch =
      !searchTerm.trim() ||
      l.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      l.last_name?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSection && matchesStudent && matchesDate && matchesSearch;
  });

  return (
    <div className="teacher-container">
      <div className="admin-header">
        <div>
          <h2>Teacher Portal</h2>
          <p className="subtitle">Project QR Code & Manage Student Class Attendance</p>
        </div>

        <div className="tab-buttons">
          <button
            className={`btn ${activeTab === 'students' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('students')}
          >
            Students List ({filteredStudents.length})
          </button>
          <button
            className={`btn ${activeTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('attendance')}
          >
            Class Attendance Logs ({filteredLogs.length})
          </button>
        </div>
      </div>

      {/* MASTER CLASS ATTENDANCE QR CODE PANEL */}
      <div className="card qr-generator-card mb-4" style={{
        background: 'linear-gradient(135deg, rgba(24, 24, 27, 0.95) 0%, rgba(39, 39, 42, 0.95) 100%)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.75rem',
        marginBottom: '1.5rem',
        color: '#fff'
      }}>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* QR Code Display Box */}
          <div style={{
            background: '#ffffff',
            padding: '12px',
            borderRadius: 'var(--radius)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
            minWidth: '204px',
            minHeight: '204px',
            justifyContent: 'center'
          }}>
            {qrDataUrl ? (
              <>
                <img src={qrDataUrl} alt="Class Attendance QR Code" style={{ width: '180px', height: '180px', borderRadius: '4px' }} />
                <span style={{ color: '#09090b', fontWeight: 800, fontSize: '0.8rem', marginTop: '6px', letterSpacing: '0.05em' }}>
                  SmartAttend
                </span>
              </>
            ) : (
              <div style={{ padding: '1rem', textAlign: 'center', color: '#71717a' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#18181b', display: 'block' }}>
                  No Active QR Code
                </span>
              </div>
            )}
          </div>

          {/* QR Info & Actions */}
          <div style={{ flex: 1, minWidth: '260px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              <span className={`badge ${qrDataUrl ? 'badge-success' : 'badge-warning'}`} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                {qrDataUrl ? 'Active QR Code' : 'QR Not Generated'}
              </span>
              {qrDataUrl && (
                <span className="badge badge-id" style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
                  {formatExpiration(expiresAt)}
                </span>
              )}
            </div>

            <h3 style={{ margin: '0.25rem 0 0.25rem 0', fontSize: '1.4rem', fontWeight: 800 }}>
              Classroom Attendance QR Code
            </h3>
            <p style={{ margin: 0, color: '#a1a1aa', fontSize: '0.92rem', lineHeight: '1.4' }}>
              Set an expiration timer (minutes, hours, or days).
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
              <button
                className="btn btn-success"
                onClick={() => setShowConfigModal(true)}
                style={{ fontWeight: 800 }}
              >
                {qrDataUrl ? 'Generate New / Change Expiration' : 'Generate QR Code'}
              </button>

              {qrDataUrl && (
                <>
                  <button
                    className="btn btn-primary"
                    onClick={() => setShowProjectorModal(true)}
                    style={{ fontWeight: 800 }}
                  >
                    Enlarge QR Code
                  </button>

                  <button
                    className="btn btn-outline-sm"
                    onClick={handleCopyQR}
                  >
                    {copied ? 'Copied Token!' : 'Copy Code Token'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DURATION & EXPIRATION CONFIGURATION MODAL */}
      {showConfigModal && (
        <div className="modal-backdrop" style={{ background: '#09090b99', backdropFilter: 'blur(8px)', zIndex: 9999 }}>
          <div className="modal-card" style={{ maxWidth: '480px', padding: '2rem', background: 'var(--bg-card)', color: 'var(--text-main)', border: 'var(--card-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800 }}>Generate Attendance QR Code</h3>
              <button className="btn btn-secondary" onClick={() => setShowConfigModal(false)} style={{ padding: '0.3rem 0.7rem' }}>
                ✕
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
              Specify how long this QR Code should remain.
            </p>

            <form onSubmit={handleGenerateQRSubmit}>
              <div className="form-group mb-3">
                <label style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.5rem', display: 'block' }}>
                  Expiration:
                </label>
                <select
                  className="form-control"
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                >
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                  <option value="never">No Expiration (Always Active)</option>
                </select>
              </div>

              {durationUnit !== 'never' && (
                <div className="form-group mb-4">
                  <label style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.5rem', display: 'block' }}>
                    Duration ({durationUnit}):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    className="form-control"
                    value={durationValue}
                    onChange={(e) => setDurationValue(e.target.value)}
                    placeholder={`Enter number of ${durationUnit}`}
                    required
                    style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius)', background: 'var(--bg-input)', color: 'var(--text-main)' }}
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowConfigModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" disabled={generatingQR}>
                  {generatingQR ? 'Generating...' : 'Confirm & Create QR Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULLSCREEN PROJECTOR MODAL FOR CLASSROOM SCREEN */}
      {showProjectorModal && (
        <div className="modal-backdrop" style={{ background: '#09090b99', backdropFilter: 'blur(12px)', zIndex: 9999 }}>
          <div className="modal-card text-center" style={{ maxWidth: '640px', padding: '2.5rem', background: '#18181b', color: '#fff', border: '1px solid #3f3f46' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800 }}>Classroom Attendance QR Code</h3>
              <button className="btn btn-secondary" onClick={() => setShowProjectorModal(false)} style={{ padding: '0.4rem 0.8rem' }}>
                Close [✕]
              </button>
            </div>

            <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '16px', display: 'inline-block', boxShadow: '0 12px 32px rgba(0,0,0,0.6)' }}>
              {qrDataUrl && <img src={qrDataUrl} alt="Class Attendance QR Code" style={{ width: '320px', height: '320px', display: 'block' }} />}
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 900, color: '#60a5fa', margin: '0 0 0.5rem 0', letterSpacing: '0.1em' }}>
                {masterQRToken}
              </h2>
              <p style={{ color: '#d4d4d8', fontSize: '1.1rem', margin: 0 }}>
                Point your phone camera at this screen to scan & record attendance
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ATTENDANCE LOG FILTERS TOOLBAR */}
      <div className="card filter-card mb-4" style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
            Attendance Log Filters
          </h4>
          {(selectedSection !== 'All' || selectedStudent !== 'All' || selectedDate || searchTerm) && (
            <button className="btn btn-outline-sm btn-logout" onClick={handleResetFilters} style={{ fontSize: '0.8rem', padding: '4px 10px' }}>
              Clear All Filters
            </button>
          )}
        </div>

        <div className="table-controls" style={{ margin: 0, gap: '1rem', display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {/* Filter 1: Section */}
          <div className="form-group" style={{ minWidth: '150px' }}>
            <label style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '4px', display: 'block' }}>Filter Section:</label>
            <select
              className="form-control"
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
            >
              {sectionsList.map((sec) => (
                <option key={sec} value={sec}>
                  {sec === 'All' ? 'All Sections' : getCourseSectionLabel(sec)}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 2: Specific Student */}
          <div className="form-group" style={{ minWidth: '220px', flex: 1 }}>
            <label style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '4px', display: 'block' }}>Filter Specific Student:</label>
            <select
              className="form-control"
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
            >
              <option value="All">All Students</option>
              {onlyStudents.map((st) => (
                <option key={st.id || st.student_id} value={st.student_id}>
                  {st.student_id} - {(st.last_name && st.last_name.trim()) ? `${st.last_name}, ${st.first_name}` : (st.first_name || st.name)} ({st.section})
                </option>
              ))}
            </select>
          </div>

          {/* Filter 3: Date */}
          <div className="form-group" style={{ minWidth: '160px' }}>
            <label style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '4px', display: 'block' }}>Filter Date:</label>
            <input
              type="date"
              className="form-control"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {/* Filter 4: Keyword Search */}
          <div className="form-group" style={{ minWidth: '200px', flex: 1 }}>
            <label style={{ fontWeight: 700, fontSize: '0.82rem', marginBottom: '4px', display: 'block' }}>Search Keyword:</label>
            <input
              type="text"
              className="form-control search-input"
              placeholder="Type name, Student ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ visibility: 'hidden', fontSize: '0.82rem', marginBottom: '4px', display: 'block' }}>Action</label>
            <button className="btn btn-secondary" onClick={loadData} style={{ height: '42px', padding: '0 1.25rem' }}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-3">{error}</div>}

      {/* PAGE 1: STUDENTS LIST BY SECTION */}
      {activeTab === 'students' && (
        <div className="card table-card">
          <div className="card-header mb-3">
            <h3>Enrolled Class Students ({selectedSection === 'All' ? 'All Sections' : getCourseSectionLabel(selectedSection)}) ({filteredStudents.length})</h3>
          </div>

          {loading ? (
            <div className="loading-spinner">Loading students...</div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Section</th>
                    <th>Student ID</th>
                    <th>Full Name</th>
                    <th>Course</th>
                    <th>Birth Date</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((s) => {
                      const displayName = (s.last_name && s.last_name.trim()) 
                        ? `${s.last_name}, ${s.first_name}` 
                        : (s.first_name || s.name || 'N/A');
                      return (
                        <tr key={s.id || s.user_id}>
                          <td><span className="badge badge-success">{s.course && s.course !== '-' ? `${s.course} ${s.section}` : s.section}</span></td>
                          <td><span className="badge badge-id">{s.student_id || s.username || 'N/A'}</span></td>
                          <td><strong>{displayName}</strong></td>
                          <td>{s.course || '-'}</td>
                          <td>{s.birth_date || 'N/A'}</td>
                          <td>{s.email || 'N/A'}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="empty-table">No students found for this section filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PAGE 2: ATTENDANCE LOGS BY SECTION */}
      {activeTab === 'attendance' && (
        <div className="card table-card">
          <div className="card-header mb-3">
            <h3>Attendance Log History ({selectedSection === 'All' ? 'All Sections' : getCourseSectionLabel(selectedSection)})</h3>
          </div>

          {loading ? (
            <div className="loading-spinner">Loading attendance records...</div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Section / Course</th>
                    <th>Student ID</th>
                    <th>Student Name</th>
                    <th>Status</th>
                    <th>Attendance Method</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length > 0 ? (
                    filteredLogs.map((l) => (
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
                        <td><span className="badge badge-success">{l.course_section}</span></td>
                        <td><span className="badge badge-id">{l.student_id}</span></td>
                        <td><strong>{l.student_name || `${l.first_name || ''} ${l.last_name || ''}`}</strong></td>
                        <td>
                          <span className={`badge ${l.status === 'Present' ? 'badge-success' : 'badge-danger'}`}>
                            {l.status || 'Absent'}
                          </span>
                        </td>
                        <td>{l.method}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="empty-table">No attendance logs found for this section filter.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
