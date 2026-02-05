// TeacherDashboard.jsx - Modified version
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { SplineSceneBasic } from '@/components/ui/demo';
import UploadStudentPapers from './UploadStudentPapers';
import AnswerKey from './AnswerKey'; // Import the new component
import StartGrading from './StartGrading';
import PreviousResult from './PreviousResult';


const TeacherDashboard = ({ user, onLogout }) => {
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [toast, setToast] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard', 'upload-papers', 'upload-answer-key', 'start-grading'
  const [pendingGradingParams, setPendingGradingParams] = useState(null); // New state for passing data between pages
  const [viewTextModal, setViewTextModal] = useState({
    isOpen: false,
    text: '',
    fileName: ''
  });

  // Fetch files from backend
  useEffect(() => {
    fetchRecentUploads();
  }, [user.id, currentPage]); // Refresh when page changes back to dashboard

  const fetchRecentUploads = async () => {
    try {
      const token = localStorage.getItem('token');
      const userId = user.id || user._id; // Handle both id formats
      if (!userId) return;

      const response = await axios.get(`http://localhost:5000/api/papers/user/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUploadedFiles(response.data);
    } catch (error) {
      console.error('Error fetching files:', error);
      showToast('Failed to load recent uploads', 'error');
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const deleteFile = async (fileId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:5000/api/papers/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUploadedFiles(prev => prev.filter(f => f._id !== fileId));
      showToast('File deleted successfully', 'success');
    } catch (error) {
      console.error('Delete error:', error);
      showToast('Failed to delete file', 'error');
    }
  };

  const answerKeys = uploadedFiles.filter(f => f.subject && f.subject.toLowerCase().includes('answer key')).length; // Approximate check based on subject or naming
  const studentPapers = uploadedFiles.length - answerKeys;
  const pending = uploadedFiles.filter(f => f.status !== 'analyzed' && f.status !== 'completed').length;

  const sortedFiles = [...uploadedFiles].sort((a, b) =>
    new Date(b.createdAt || b.uploadedAt) - new Date(a.createdAt || a.uploadedAt)
  );

  const [studentsModal, setStudentsModal] = useState({
    isOpen: false,
    students: [],
    loading: false
  });

  const handleViewStudents = async () => {
    try {
      setStudentsModal(prev => ({ ...prev, isOpen: true, loading: true }));
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5000/api/auth/students', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStudentsModal({ isOpen: true, students: response.data, loading: false });
    } catch (error) {
      console.error('Error fetching students:', error);
      showToast('Failed to fetch students', 'error');
      setStudentsModal(prev => ({ ...prev, loading: false, isOpen: false }));
    }
  };

  const handleStartGrading = () => {
    setCurrentPage('start-grading');
  };


  // If we're on the upload papers page, render that component
  if (currentPage === 'upload-papers') {
    return (
      <UploadStudentPapers
        user={user}
        onBack={() => setCurrentPage('dashboard')}
      />
    );
  }

  // If we're on the upload answer key page
  if (currentPage === 'upload-answer-key') {
    return (
      <AnswerKey
        user={user}
        onBack={() => setCurrentPage('dashboard')}
      />
    );
  }

  if (currentPage === 'start-grading') {
    return (
      <StartGrading
        user={user}
        onBack={() => setCurrentPage('dashboard')}
        onStartGrading={(params) => {
          setPendingGradingParams(params);
          setCurrentPage('previous-result');
        }}
      />
    );
  }

  if (currentPage === 'previous-result') {
    return (
      <PreviousResult
        onBack={() => setCurrentPage('dashboard')}
        pendingGradingParams={pendingGradingParams}
        clearPendingParams={() => setPendingGradingParams(null)}
      />
    );
  }

  // Main dashboard render
  return (
    <div style={styles.container}>
      {/* 3D Hero Section with Spline */}
      <div className="mb-8">
        <SplineSceneBasic />
      </div>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>AI Answer Paper Correction</h1>
          <p style={styles.welcome}>Welcome back, <span style={styles.highlight}>{user.email}</span></p>
        </div>
        <div style={styles.headerButtons}>
          <button onClick={handleViewStudents} style={styles.viewStudentsBtn}>
            👥 View Students
          </button>
          <button onClick={onLogout} style={styles.logoutBtn}>
            Logout
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📄</div>
          <div style={styles.statContent}>
            <div style={styles.statLabel}>Answer Keys</div>
            <div style={styles.statValue}>{answerKeys}</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📝</div>
          <div style={styles.statContent}>
            <div style={styles.statLabel}>Student Papers</div>
            <div style={styles.statValue}>{studentPapers}</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>⚡</div>
          <div style={styles.statContent}>
            <div style={styles.statLabel}>To Correct</div>
            <div style={{ ...styles.statValue, color: '#60a5fa' }}>{pending}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons Section */}
      <div style={styles.actionSection}>
        <div style={styles.actionButtonsGrid}>
          <div style={styles.actionCard}>
            <div style={styles.actionIcon}>📄</div>
            <div style={styles.actionContent}>
              <h3 style={styles.actionTitle}>Upload Answer Key</h3>
              <p style={styles.actionDescription}>Upload answer keys for automated correction</p>
              <button
                onClick={() => setCurrentPage('upload-answer-key')}
                style={styles.primaryActionBtn}
              >
                Upload Answer Key
              </button>
            </div>
          </div>

          <div style={styles.actionCard}>
            <div style={styles.actionIcon}>📝</div>
            <div style={styles.actionContent}>
              <h3 style={styles.actionTitle}>Upload Student Papers</h3>
              <p style={styles.actionDescription}>Upload student answer scripts for grading</p>
              <button
                onClick={() => setCurrentPage('upload-papers')}
                style={styles.primaryActionBtn}
              >
                Upload Student Papers
              </button>
            </div>
          </div>

          <div style={styles.actionCard}>
            <div style={styles.actionIcon}>⚡</div>
            <div style={styles.actionContent}>
              <h3 style={styles.actionTitle}>Start Grading</h3>
              <p style={styles.actionDescription}>Begin automated grading process</p>
              <button
                onClick={() => setCurrentPage('start-grading')}
                style={styles.gradingActionBtn}
              >
                Start Grading
              </button>
            </div>
          </div>
        </div>

        <div style={{ ...styles.actionButtonsGrid, marginTop: '20px' }}>
          <div style={styles.actionCard}>
            <div style={styles.actionIcon}>📊</div>
            <div style={styles.actionContent}>
              <h3 style={styles.actionTitle}>Previous Results</h3>
              <p style={styles.actionDescription}>View history of graded papers</p>
              <button
                onClick={() => setCurrentPage('previous-result')}
                style={styles.resultsActionBtn}
              >
                View Previous Results
              </button>
            </div>
          </div>
        </div>
      </div>



      {/* Recent Uploads */}
      <div style={styles.filesCard}>
        <div style={styles.filesHeader}>
          <h2 style={styles.uploadTitle}>📚 Recent Uploads</h2>
          <span style={styles.totalFiles}>{uploadedFiles.length} files total</span>
        </div>
        <div style={styles.filesList}>
          {sortedFiles.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyStateIcon}>📄</div>
              <p style={styles.emptyStateText}>No files uploaded yet</p>
              <p style={styles.emptyStateSubtext}>Upload answer keys or student papers to get started</p>
            </div>
          ) : (
            sortedFiles.slice(0, 10).map(file => {
              const date = new Date(file.createdAt || file.uploadedAt);
              const isAnswerKey = file.subject && file.subject.toLowerCase().includes('answer key');
              const icon = isAnswerKey ? '📄' : '📝';
              const typeLabel = isAnswerKey ? 'Answer Key' : 'Student Paper';
              const typeColor = isAnswerKey ? '#60a5fa' : '#34d399';
              const hasText = file.analysisResults && file.analysisResults.extractedText;

              return (
                <div key={file._id || file.id} style={styles.fileItem}>
                  <div style={styles.fileInfo}>
                    <div style={styles.fileIconContainer}>
                      <span style={styles.fileIcon}>{icon}</span>
                      <span style={{ ...styles.fileTypeBadge, backgroundColor: typeColor }}>
                        {typeLabel}
                      </span>
                    </div>
                    <div style={styles.fileDetails}>
                      <p style={styles.fileName}>{file.originalFileName || file.fileName}</p>
                      <p style={styles.fileMeta}>
                        <span style={styles.fileSubject}>📚 {file.subject}</span>
                        <span style={styles.fileDate}>📅 {date.toLocaleDateString()}</span>
                        <span style={{
                          ...styles.fileStatus,
                          color: file.status === 'analyzed' ? '#10b981' : '#f59e0b'
                        }} >
                          {file.status === 'analyzed' ? '✅ Ready' : `⚙️ ${file.status}`}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div style={styles.itemActions}>
                    {hasText && (
                      <button
                        onClick={() => setViewTextModal({
                          isOpen: true,
                          text: file.analysisResults.extractedText,
                          fileName: file.originalFileName
                        })}
                        style={styles.viewBtn}
                      >
                        👁️ View Text
                      </button>
                    )}
                    <button
                      onClick={() => deleteFile(file._id || file.id)}
                      style={styles.deleteBtn}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Students Modal */}
      {studentsModal.isOpen && (
        <div style={styles.modalOverlay} onClick={() => setStudentsModal({ ...studentsModal, isOpen: false })}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                👥 Registered Students
              </h3>
              <button
                onClick={() => setStudentsModal({ ...studentsModal, isOpen: false })}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalBody}>
              {studentsModal.loading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {studentsModal.students.length > 0 ? (
                    studentsModal.students.map(student => {
                      const displayName = student.email.split('@')[0];
                      const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);

                      return (
                        <div key={student._id} style={{
                          padding: '12px',
                          backgroundColor: '#0f172a',
                          borderRadius: '8px',
                          border: '1px solid #334155',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <div>
                            <div style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '16px' }}>{capitalizedName}</div>
                            <div style={{ fontSize: '14px', color: '#cbd5e1' }}>{student.email}</div>
                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                              Joined: {new Date(student.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <span style={{
                            fontSize: '12px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '12px'
                          }}>Student</span>
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ textAlign: 'center', color: '#94a3b8' }}>No students found.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Text Modal */}
      {viewTextModal.isOpen && (
        <div style={styles.modalOverlay} onClick={() => setViewTextModal({ isOpen: false, text: '', fileName: '' })}>
          <div style={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                📝 Extracted Text: {viewTextModal.fileName}
              </h3>
              <button
                onClick={() => setViewTextModal({ isOpen: false, text: '', fileName: '' })}
                style={styles.closeButton}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalBody}>
              <textarea
                readOnly
                value={viewTextModal.text}
                style={styles.textArea}
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            ...styles.toast,
            backgroundColor: toast.type === 'error' ? '#dc2626' :
              toast.type === 'warning' ? '#f59e0b' :
                toast.type === 'info' ? '#6366f1' : '#059669'
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

// Keep all the same styles from previous version...
const styles = {
  container: {
    width: '100%',
    minHeight: '100vh',
    padding: '24px',
    backgroundColor: '#0f172a',
    color: '#f1f5f9',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '16px'
  },
  headerContent: {
    flex: 1
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#f8fafc',
    margin: '0 0 8px 0',
    background: 'linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  welcome: {
    fontSize: '16px',
    color: '#cbd5e1',
    margin: 0
  },
  highlight: {
    color: '#60a5fa',
    fontWeight: '600'
  },
  headerButtons: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  viewStudentsBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#374151',
    color: '#f3f4f6',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  logoutBtn: {
    padding: '10px 20px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.2s ease'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '32px'
  },
  statCard: {
    padding: '20px',
    borderRadius: '12px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    transition: 'transform 0.2s ease',
    cursor: 'pointer'
  },
  statIcon: {
    fontSize: '32px',
    backgroundColor: '#334155',
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statContent: {
    flex: 1
  },
  statLabel: {
    fontSize: '14px',
    color: '#94a3b8',
    marginBottom: '4px'
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#f8fafc'
  },
  actionSection: {
    marginBottom: '32px'
  },
  actionButtonsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },
  actionCard: {
    padding: '24px',
    borderRadius: '12px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    transition: 'transform 0.2s ease'
  },
  actionIcon: {
    fontSize: '40px',
    marginBottom: '16px'
  },
  actionContent: {
    flex: 1
  },
  actionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#f8fafc',
    margin: '0 0 8px 0'
  },
  actionDescription: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: '0 0 16px 0',
    lineHeight: '1.5'
  },
  primaryActionBtn: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: 'white',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    width: '100%'
  },
  gradingActionBtn: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#10b981',
    color: 'white',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    width: '100%'
  },
  resultsActionBtn: {
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#8b5cf6',
    color: 'white',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    width: '100%'
  },
  uploadFormCard: {
    padding: '24px',
    borderRadius: '12px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    marginBottom: '24px'
  },
  uploadFormTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#f8fafc',
    margin: '0 0 20px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  uploadForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  uploadArea: {
    border: '2px dashed #475569',
    borderRadius: '12px',
    padding: '32px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backgroundColor: '#0f172a',
    flex: 1
  },
  uploadIcon: {
    fontSize: '48px',
    marginBottom: '12px',
    opacity: '0.8'
  },
  uploadText: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#f8fafc',
    margin: '0 0 8px 0'
  },
  uploadSubtext: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0
  },
  filesCard: {
    padding: '24px',
    borderRadius: '12px',
    backgroundColor: '#1e293b',
    border: '1px solid #334155'
  },
  filesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  uploadTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#f8fafc',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  totalFiles: {
    fontSize: '14px',
    color: '#94a3b8',
    backgroundColor: '#334155',
    padding: '4px 12px',
    borderRadius: '20px'
  },
  filesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px 20px'
  },
  emptyStateIcon: {
    fontSize: '48px',
    marginBottom: '16px',
    opacity: '0.5'
  },
  emptyStateText: {
    fontSize: '18px',
    fontWeight: '500',
    color: '#f8fafc',
    margin: '0 0 8px 0'
  },
  emptyStateSubtext: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderRadius: '8px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    transition: 'all 0.2s ease'
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flex: 1,
    minWidth: 0
  },
  fileIconContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px'
  },
  fileIcon: {
    fontSize: '32px'
  },
  fileTypeBadge: {
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '12px',
    color: 'white',
    fontWeight: '600'
  },
  fileDetails: {
    flex: 1,
    minWidth: 0
  },
  fileName: {
    fontSize: '16px',
    fontWeight: '500',
    color: '#f8fafc',
    margin: '0 0 8px 0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  fileMeta: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
    display: 'flex',
    gap: '16px'
  },
  fileSubject: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  fileDate: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px'
  },
  deleteBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#ef4444',
    color: 'white',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    transition: 'background-color 0.2s ease',
    flexShrink: 0
  },
  itemActions: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  viewBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: 'white',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    transition: 'background-color 0.2s ease',
  },
  toast: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    padding: '12px 24px',
    borderRadius: '8px',
    color: '#fff',
    fontWeight: '500',
    zIndex: 1000,
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    zIndex: 1000,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(4px)'
  },
  modalContent: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    border: '1px solid #334155',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
  },
  modalHeader: {
    padding: '20px 24px',
    borderBottom: '1px solid #334155',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#f8fafc',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '24px',
    padding: '4px',
    borderRadius: '4px',
    transition: 'color 0.2s',
    lineHeight: 1
  },
  modalBody: {
    padding: '24px',
    overflowY: 'auto'
  },
  textArea: {
    width: '100%',
    height: '400px',
    backgroundColor: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '8px',
    padding: '16px',
    color: '#e2e8f0',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    fontSize: '14px',
    resize: 'vertical',
    outline: 'none'
  }
};

export default TeacherDashboard;