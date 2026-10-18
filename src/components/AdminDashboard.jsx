import React, { useState, useEffect } from 'react';
import { fetchStudents, addStudent, updateStudent, deleteStudent, fetchAttendanceLogs, addTeacher, purgeAttendanceLogs } from '../services/api';

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

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('students'); // 'students' | 'add-student' | 'add-teacher' | 'attendance'
  const [students, setStudents] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter States: Section, Specific Student, Date
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedStudent, setSelectedStudent] = useState('All');
  const [selectedDate, setSelectedDate] = useState('');

  // Modal State for Editing
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  // Form State for Add / Edit Student
  const [formData, setFormData] = useState({
    student_id: '',
    first_name: '',
    last_name: '',
    course: 'BSIT',
    section: '3-1',
    birth_date: '',
    email: '',
    username: '',
    password: '',
  });

  // Form State for Add Teacher
  const [teacherFormData, setTeacherFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
  });

  const [addMessage, setAddMessage] = useState({ type: '', text: '' });
  const [teacherMessage, setTeacherMessage] = useState({ type: '', text: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingTeacher, setIsSubmittingTeacher] = useState(false);

  // Password Visibility Toggle States
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [showTeacherPassword, setShowTeacherPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);

  useEffect(() => {
    if (activeTab === 'students' || activeTab === 'attendance') {
      loadData();
    }
  }, [activeTab]);

  const generateNextStudentId = (currentStudents = students) => {
    const prefix = '';
    let maxNum = 0;

    currentStudents.forEach((s) => {
      if (s.student_id) {
        const match = s.student_id.match(/(\d+)$/);
        if (match) {
          const numPart = parseInt(match[1], 10);
          if (!isNaN(numPart) && numPart > maxNum) maxNum = numPart;
        }
      }
    });

    const nextNum = maxNum + 1;
    return `${prefix}${String(nextNum).padStart(5, '0')}`;
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [studentsData, logsData] = await Promise.all([
        fetchStudents(),
        fetchAttendanceLogs()
      ]);
      const validStudents = Array.isArray(studentsData) ? studentsData : [];
      setStudents(validStudents);
      setLogs(Array.isArray(logsData) ? logsData : []);

      setFormData(prev => ({
        ...prev,
        student_id: prev.student_id || generateNextStudentId(validStudents)
      }));
    } catch (err) {
      setError('Failed to load data from backend server.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetForm = (studentsList = students) => {
    const nextId = generateNextStudentId(studentsList);
    setFormData({
      student_id: nextId,
      first_name: '',
      last_name: '',
      course: 'BSIT',
      section: '3-1',
      birth_date: '',
      email: '',
      username: nextId,
      password: '',
    });
  };

  const handleOpenEditModal = (account) => {
    setEditingStudent(account);
    setFormData({
      id: account.id,
      user_id: account.user_id,
      role: account.role || 'Student',
      student_id: account.student_id || account.username || '',
      username: account.username || account.student_id || '',
      name: account.name || `${account.first_name || ''} ${account.last_name || ''}`.trim(),
      first_name: account.first_name || account.name || '',
      last_name: account.last_name || '',
      course: account.course || 'BSIT',
      section: account.section || '3-1',
      birth_date: account.birth_date || '',
      email: account.email || '',
      is_verified: Number(account.is_verified) === 1 ? 1 : 0,
      password: '',
    });
    setShowEditModal(true);
  };

  const handleAddStudentSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setAddMessage({ type: '', text: '' });

    const payload = {
      ...formData,
      username: formData.student_id,
    };

    try {
      const res = await addStudent(payload);
      if (res.status === 'success') {
        setAddMessage({ type: 'success', text: `Student Account (${formData.student_id}) created successfully!` });
        await loadData();
        handleResetForm();
      } else {
        setAddMessage({ type: 'danger', text: `${res.message || 'Failed to create student.'}` });
      }
    } catch (err) {
      setAddMessage({ type: 'danger', text: 'Backend API connection error.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddTeacherSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingTeacher(true);
    setTeacherMessage({ type: '', text: '' });

    try {
      const res = await addTeacher(teacherFormData);
      if (res.status === 'success') {
        setTeacherMessage({ type: 'success', text: `Teacher Account (${teacherFormData.username}) created successfully!` });
        setTeacherFormData({ name: '', email: '', username: '', password: '' });
      } else {
        setTeacherMessage({ type: 'danger', text: `${res.message || 'Failed to create teacher account.'}` });
      }
    } catch (err) {
      setTeacherMessage({ type: 'danger', text: 'Backend API connection error.' });
    } finally {
      setIsSubmittingTeacher(false);
    }
  };

  const handleUpdateStudentSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await updateStudent({ id: editingStudent.id, ...formData });
      if (res.status === 'success') {
        setShowEditModal(false);
        loadData();
      } else {
        alert(res.message || 'Update failed');
      }
    } catch (err) {
      alert('Error updating student');
    }
  };

  const handleDelete = async (account) => {
    if (!window.confirm(`Are you sure you want to delete account '${account.username || account.name || account.student_id}'?`)) return;
    try {
      const res = await deleteStudent(account.id, account.user_id);
      if (res.status === 'success') {
        loadData();
      } else {
        alert(res.message || 'Delete failed');
      }
    } catch (err) {
      alert('Error deleting account');
    }
  };

  const handlePurgeLogs = async (purgeDate = null, purgeAll = false) => {
    const targetMsg = purgeAll 
      ? 'ALL attendance logs from the system database' 
      : `attendance logs for date '${purgeDate}'`;
    if (!window.confirm(`Are you sure you want to PURGE ${targetMsg}? This action cannot be undone.`)) return;

    try {
      const res = await purgeAttendanceLogs(purgeDate, purgeAll);
      if (res.status === 'success') {
        alert(res.message || 'Logs purged successfully');
        loadData();
      } else {
        alert(res.message || 'Failed to purge logs');
      }
    } catch (err) {
      alert('Error purging attendance logs');
    }
  };

  const filteredStudents = students.filter((s) => {
    const term = searchTerm.toLowerCase();
    const role = (s.role || 'Student').toLowerCase();
    const name = (s.name || `${s.first_name || ''} ${s.last_name || ''}`).toLowerCase();
    const username = (s.username || s.student_id || '').toLowerCase();
    const course = (s.course || '').toLowerCase();
    return name.includes(term) || username.includes(term) || role.includes(term) || course.includes(term);
  });

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'Admin':
        return 'badge-danger';
      case 'Teacher':
        return 'badge-warning';
      default:
        return 'badge-success';
    }
  };

  const handleResetFilters = () => {
    setSelectedSection('All');
    setSelectedStudent('All');
    setSelectedDate('');
    setSearchTerm('');
  };

  const sectionsList = ['All', ...Array.from(new Set(students.map((s) => s.section).filter(Boolean)))];

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
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h2>Admin Management Dashboard</h2>
          <p className="subtitle">Manage Accounts, Create Accounts & Attendance Reports</p>
        </div>

        <div className="tab-buttons">
          <button
            className={`btn ${activeTab === 'students' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('students')}
          >
            Accounts ({students.length})
          </button>
          <button
            className={`btn ${activeTab === 'add-student' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              handleResetForm();
              setAddMessage({ type: '', text: '' });
              setActiveTab('add-student');
            }}
          >
            Register Student Account
          </button>
          <button
            className={`btn ${activeTab === 'add-teacher' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => {
              setTeacherFormData({ name: '', email: '', username: '', password: '' });
              setTeacherMessage({ type: '', text: '' });
              setActiveTab('add-teacher');
            }}
          >
            Register Teacher Account
          </button>
          <button
            className={`btn ${activeTab === 'attendance' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('attendance')}
          >
            Attendance Logs ({logs.length})
          </button>
        </div>
      </div>

      {/* PAGE 1: ALL ACCOUNTS TABLE */}
      {activeTab === 'students' && (
        <div className="card table-card">
          <div className="table-controls">
            <input
              type="text"
              className="form-control search-input"
              placeholder="Search accounts by name, username, role, or course..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button className="btn btn-outline-sm" onClick={loadData}>
              Refresh
            </button>
          </div>

          {error && <div className="alert alert-danger m-3">{error}</div>}

          {loading ? (
            <div className="loading-spinner">Loading account database...</div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Username / ID</th>
                    <th>Role</th>
                    <th>Full Name</th>
                    <th>Course & Section / Department</th>
                    <th>Email</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length > 0 ? (
                    filteredStudents.map((s, idx) => {
                      const role = s.role || 'Student';
                      const displayName = (role !== 'Student')
                        ? (s.name || s.first_name || 'N/A')
                        : (s.last_name ? `${s.last_name}, ${s.first_name}` : (s.name || s.first_name || 'N/A'));
                      const accountId = s.username || s.student_id || 'N/A';
                      const deptOrCourse = (s.course && s.course !== '-' && s.course !== 'Teacher')
                        ? `${s.course} - ${s.section}`
                        : (role === 'Student' ? '-' : 'Faculty / Staff');

                      return (
                        <tr key={s.user_id || s.id || idx}>
                          <td><span className="badge badge-id">{accountId}</span></td>
                          <td>
                            <span className={`badge ${getRoleBadgeClass(role)}`}>
                              {role}
                            </span>
                          </td>
                          <td><strong>{displayName}</strong></td>
                          <td>{deptOrCourse}</td>
                          <td>
                            <div>{s.email || 'N/A'}</div>
                            {s.email && s.email !== 'N/A' && (
                              <div style={{ marginTop: '4px' }}>
                                {Number(s.is_verified) === 1 ? (
                                  <span className="badge badge-success" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                                    ✓ Verified
                                  </span>
                                ) : (
                                  <span className="badge badge-warning" style={{ fontSize: '0.68rem', padding: '2px 8px' }}>
                                    Pending Verification
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="action-buttons-cell">
                            <button className="btn btn-action btn-action-edit" onClick={() => handleOpenEditModal(s)}>Edit</button>
                            <button className="btn btn-action btn-action-danger" onClick={() => handleDelete(s)}>Delete</button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="empty-table">No account records found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PAGE 2: ADD NEW STUDENT / ACCOUNT FORM */}
      {activeTab === 'add-student' && (
        <div className="card form-card">
          <div className="card-header">
            <h3>Add New Student / Login Account</h3>
            {/* <p className="subtitle">Only administrators can add new student records and system login accounts</p> */}
          </div>

          {addMessage.text && (
            <div className={`alert alert-${addMessage.type}`}>
              {addMessage.text}
            </div>
          )}

          <form onSubmit={handleAddStudentSubmit} className="auth-form grid-2">
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <label style={{ margin: 0 }}>Student ID</label>
                {/* <span className="badge badge-success" style={{ fontSize: '0.72rem', padding: '2px 8px' }}>
                  Auto-Generated & Locked
                </span> */}
              </div>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 01-2627-00001"
                value={formData.student_id}
                readOnly
                style={{
                  background: 'var(--bg-hover)',
                  color: 'var(--text-main)',
                  fontWeight: 800,
                  cursor: 'not-allowed',
                  border: '1px solid var(--border)'
                }}
                required
              />
            </div>

            <div className="form-group">
              <label>First Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="First Name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Last Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="Last Name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Course</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. BSIT"
                value={formData.course}
                onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Section</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 3-A"
                value={formData.section}
                onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Birth Date</label>
              <input
                type="date"
                className="form-control"
                value={formData.birth_date}
                onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Password (Default: student123)</label>
              <div className="password-input-wrapper">
                <input
                  type={showStudentPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="Leave blank for default: student123"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowStudentPassword(!showStudentPassword)}
                  tabIndex="-1"
                  title={showStudentPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showStudentPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            {/* <div className="form-group full-width mt-3">
              <h4 style={{ margin: 0, color: 'var(--accent)' }}>Student Login Credentials</h4>
              <small className="text-muted">The Student ID will automatically serve as the login username.</small>
            </div> */}

            {/* <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                className="form-control"
                placeholder="Assign password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div> */}

            <div className="form-group full-width mt-3">
              <button type="submit" className="btn btn-success btn-lg" disabled={isSubmitting}>
                {isSubmitting ? 'Registering...' : 'Save Student & Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PAGE 3: ADD NEW TEACHER ACCOUNT FORM */}
      {activeTab === 'add-teacher' && (
        <div className="card form-card">
          <div className="card-header">
            <h3>Register New Teacher Account</h3>
            {/* <p className="subtitle">Administrators can create login accounts for Faculty & Teachers</p> */}
          </div>

          {teacherMessage.text && (
            <div className={`alert alert-${teacherMessage.type}`}>
              {teacherMessage.text}
            </div>
          )}

          <form onSubmit={handleAddTeacherSubmit} className="auth-form" style={{ maxWidth: '480px' }}>
            <div className="form-group mb-3">
              <label>Teacher Full Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="Full Name"
                value={teacherFormData.name}
                onChange={(e) => setTeacherFormData({ ...teacherFormData, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group mb-3">
              <label>Email Address</label>
              <input
                type="email"
                className="form-control"
                placeholder="email"
                value={teacherFormData.email}
                onChange={(e) => setTeacherFormData({ ...teacherFormData, email: e.target.value })}
              />
            </div>

            <div className="form-group mb-3">
              <label>Login Username</label>
              <input
                type="text"
                className="form-control"
                placeholder="username"
                value={teacherFormData.username}
                onChange={(e) => setTeacherFormData({ ...teacherFormData, username: e.target.value })}
                required
              />
            </div>

            <div className="form-group mb-4">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showTeacherPassword ? 'text' : 'password'}
                  className="form-control"
                  placeholder="••••••••"
                  value={teacherFormData.password}
                  onChange={(e) => setTeacherFormData({ ...teacherFormData, password: e.target.value })}
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowTeacherPassword(!showTeacherPassword)}
                  tabIndex="-1"
                  title={showTeacherPassword ? 'Hide Password' : 'Show Password'}
                >
                  {showTeacherPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>

            <div className="form-group mt-3">
              <button type="submit" className="btn btn-success btn-lg btn-block" disabled={isSubmittingTeacher}>
                {isSubmittingTeacher ? 'Creating Account...' : 'Create Teacher Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* PAGE 3: ATTENDANCE LOGS TABLE */}
      {activeTab === 'attendance' && (
        <div className="card table-card">
          {/* ATTENDANCE LOG FILTERS TOOLBAR */}
          <div className="card filter-card mb-4" style={{ padding: '1.25rem', background: 'var(--bg-main)', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <h4 style={{ margin: 0, fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                Attendance Report Filters
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
                <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Filter Section:</label>
                <select
                  className="form-control"
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                >
                  {sectionsList.map((sec) => (
                    <option key={sec} value={sec}>
                      {sec === 'All' ? 'All Sections' : `Section ${sec}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 2: Specific Student */}
              <div className="form-group" style={{ minWidth: '220px', flex: 1 }}>
                <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Filter Specific Student:</label>
                <select
                  className="form-control"
                  value={selectedStudent}
                  onChange={(e) => setSelectedStudent(e.target.value)}
                >
                  <option value="All">All Students</option>
                  {students.map((st) => (
                    <option key={st.id || st.student_id} value={st.student_id}>
                      {st.student_id} - {st.last_name}, {st.first_name} ({st.section})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter 3: Date */}
              <div className="form-group" style={{ minWidth: '160px' }}>
                <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Filter Date:</label>
                <input
                  type="date"
                  className="form-control"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              {/* Filter 4: Keyword Search */}
              <div className="form-group" style={{ minWidth: '200px', flex: 1 }}>
                <label style={{ fontWeight: 700, fontSize: '0.82rem' }}>Search Keyword:</label>
                <input
                  type="text"
                  className="form-control search-input"
                  placeholder="Search ID, student name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="form-group" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <button className="btn btn-secondary" onClick={loadData} style={{ height: '42px', padding: '0 1rem' }}>
                  Refresh
                </button>
                {selectedDate && (
                  <button 
                    className="btn btn-action btn-action-danger" 
                    onClick={() => handlePurgeLogs(selectedDate, false)}
                    style={{ height: '42px', padding: '0 1rem', fontSize: '0.85rem', fontWeight: 700 }}
                    title={`Purge all logs for ${selectedDate}`}
                  >
                    Purge Date ({selectedDate})
                  </button>
                )}
                <button 
                  className="btn btn-logout" 
                  onClick={() => handlePurgeLogs(null, true)}
                  style={{ height: '42px', padding: '0 1rem', fontSize: '0.85rem', fontWeight: 700 }}
                  title="Purge all attendance logs in system"
                >
                  Purge All Logs
                </button>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading-spinner">Loading attendance logs...</div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time Stamp</th>
                    <th>Student ID</th>
                    <th>Student Name</th>
                    <th>Status</th>
                    <th>Method</th>
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
                        <td><span className="badge badge-id">{l.student_id}</span></td>
                        <td>{l.first_name || l.student_name} {l.last_name}</td>
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
                      <td colSpan="5" className="empty-table">No attendance logs recorded yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Edit Account Modal */}
      {showEditModal && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <h3>Edit {formData.role || 'Account'} Record</h3>
              {/* <button className="close-btn" onClick={() => setShowEditModal(false)}>✕</button> */}
            </div>
            <form onSubmit={handleUpdateStudentSubmit} className="modal-body grid-2">
              {formData.role === 'Teacher' || formData.role === 'Admin' ? (
                <>
                  <div className="form-group full-width">
                    <label>Full Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name || `${formData.first_name} ${formData.last_name}`.trim()} 
                      onChange={(e) => setFormData({ ...formData, name: e.target.value, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Username / Account ID</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.username}
                      readOnly
                      style={{ background: 'var(--bg-hover)', cursor: 'not-allowed' }}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>New Password (leave blank to keep unchanged)</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        className="form-control"
                        placeholder="••••••••"
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        tabIndex="-1"
                        title={showEditPassword ? 'Hide Password' : 'Show Password'}
                      >
                        {showEditPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>Student ID</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.student_id}
                      onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>First Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Course</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Section</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.section}
                      onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Birth Date</label>
                    <input
                      type="date"
                      className="form-control"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label>New Password (leave blank to keep unchanged)</label>
                    <div className="password-input-wrapper">
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        className="form-control"
                        placeholder="••••••••"
                        value={formData.password || ''}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        tabIndex="-1"
                        title={showEditPassword ? 'Hide Password' : 'Show Password'}
                      >
                        {showEditPassword ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="form-group full-width" style={{ marginTop: '0.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={Number(formData.is_verified) === 1}
                    onChange={(e) => setFormData({ ...formData, is_verified: e.target.checked ? 1 : 0 })}
                  />
                  <span style={{ fontWeight: 600 }}>Email Verified</span>
                </label>
                <small className="text-muted d-block" style={{ marginTop: '2px' }}>
                  Check this to mark this user's email as verified. If unchecked, the user will see a verification notice in their account until verified.
                </small>
              </div>

              <div className="modal-footer full-width">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update {formData.role || 'Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
