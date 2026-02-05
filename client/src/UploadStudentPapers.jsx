// UploadStudentPapers.jsx
import React, { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';

const UploadStudentPapers = ({ user, onBack }) => {
  const [studentPaperSubject, setStudentPaperSubject] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [processingFiles, setProcessingFiles] = useState([]);
  const [completedFiles, setCompletedFiles] = useState([]);
  const [toast, setToast] = useState(null);
  /* Removed section and grading settings states */

  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [filesToStage, setFilesToStage] = useState([]);

  const [extractedTextModal, setExtractedTextModal] = useState({
    isOpen: false,
    file: null,
    text: ''
  });

  const studentPaperInputRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const token = localStorage.getItem('token');
        const userId = user.id || user.email;

        // Fetch Students
        const studentsRes = await api.get('/api/auth/students', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStudents(studentsRes.data);

        // Fetch Recent Papers
        const papersRes = await api.get(`/api/papers/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        // Transform and set recent papers
        if (papersRes.data && Array.isArray(papersRes.data)) {
          // Sort by createdAt desc
          const sorted = papersRes.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

          const processedPapers = sorted.map(p => ({
            id: p._id || p.id, // Use actual ID
            backendId: p._id || p.id,
            fileName: p.originalFileName || p.fileName || 'Untitled',
            uploadedAt: p.createdAt,
            status: 'completed', // Assume fetched papers are processed or check p.status
            progress: 100,
            subject: p.subject,
            studentId: p.studentId, // Ensure backend provides this
            totalMarks: p.totalMarks,
            analysisResults: p.analysisResults || {},
            sections: p.sections || []
          }));

          setCompletedFiles(processedPapers);
        }

      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    };
    fetchInitialData();
  }, [user]);

  // Poll for processing status
  useEffect(() => {
    if (processingFiles.length === 0) return;

    const pollingIntervals = [];

    processingFiles.forEach(file => {
      if (file.backendId) {
        const interval = setInterval(async () => {
          try {
            const token = localStorage.getItem('token');
            const response = await api.get(`/api/papers/${file.backendId}/status`, {
              headers: { Authorization: `Bearer ${token}` }
            });

            const { status, progress, steps, analysisResults } = response.data;

            // Update file status
            if (status === 'analyzed') {
              // Move to completed
              setProcessingFiles(prev => prev.filter(f => f.id !== file.id));
              setCompletedFiles(prev => [...prev, {
                ...file,
                status: 'completed',
                progress: 100,
                analysisResults,
                processingSteps: steps
              }]);

              showToast(`Paper "${file.fileName}" processed successfully!`, 'success');
              clearInterval(interval);
            } else if (status === 'error') {
              // Handle error
              setProcessingFiles(prev => prev.map(f =>
                f.id === file.id ? { ...f, status: 'error', progress } : f
              ));
              showToast(`Processing failed for "${file.fileName}"`, 'error');
              clearInterval(interval);
            } else {
              // Update progress
              setProcessingFiles(prev => prev.map(f =>
                f.id === file.id ? {
                  ...f,
                  status,
                  progress,
                  processingSteps: steps
                } : f
              ));
            }
          } catch (error) {
            console.error('Polling error:', error);
            clearInterval(interval);
          }
        }, 2000); // Poll every 2 seconds

        pollingIntervals.push(interval);
      }
    });

    // Cleanup intervals
    return () => {
      pollingIntervals.forEach(interval => clearInterval(interval));
    };
  }, [processingFiles]);

  const handleSaveConfiguration = async () => {
    const subject = studentPaperSubject.trim() || 'General';

    if (!subject) {
      showToast('Please enter a subject name', 'warning');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      const configData = {
        userId: user.id || user.email,
        subject: subject,
        sections: [], // Empty sections
        totalMarks: 100,
        gradingSettings: {} // Empty settings
      };

      const response = await api.post('/api/papers/save-config', configData, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.data) {
        showToast('Paper configuration saved successfully!', 'success');
      }
    } catch (error) {
      console.error('Save configuration error:', error);
      showToast(error.response?.data?.message || 'Error saving configuration', 'error');
    }
  };

  const handleFileUpload = (files) => {
    const fileArray = Array.from(files);

    // Stage files
    const newStagedFiles = fileArray.map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      fileName: file.name,
      fileSize: file.size,
      fileObject: file
    }));

    setFilesToStage(prev => [...prev, ...newStagedFiles]);
  };

  const removeStagedFile = (id) => {
    setFilesToStage(prev => prev.filter(f => f.id !== id));
  };

  const processUploads = async () => {
    const subject = studentPaperSubject.trim();
    if (!subject) {
      showToast('Please enter a subject name', 'warning');
      return;
    }
    if (!selectedStudent) {
      showToast('Please select a student', 'warning');
      return;
    }
    if (filesToStage.length === 0) {
      showToast('Please select files to upload', 'warning');
      return;
    }

    try {
      const token = localStorage.getItem('token');

      // Move from staging to uploaded/processing
      const tempFiles = filesToStage.map(file => ({
        ...file,
        uploadedAt: new Date().toISOString(),
        status: 'uploading',
        progress: 0,
        subject: subject,
        studentId: selectedStudent, // Add student ID to state
        sections: [],
        gradingSettings: {}
      }));

      setUploadedFiles(prev => [...prev, ...tempFiles]);
      setFilesToStage([]); // Clear staging

      // Upload each file
      for (const tempFile of tempFiles) {
        const formData = new FormData();
        formData.append('files', tempFile.fileObject);
        formData.append('userId', user.id || user.email);
        formData.append('subject', subject);
        formData.append('studentId', selectedStudent); // Add Student ID
        formData.append('sections', JSON.stringify([]));
        formData.append('totalMarks', 100); // Default, or maybe remove from backend requirement
        formData.append('gradingSettings', JSON.stringify({}));


        try {
          const response = await api.post('/api/papers/upload/student-papers', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.data.papers && response.data.papers.length > 0) {
            const paper = response.data.papers[0];

            // Move to processing files
            setUploadedFiles(prev => prev.filter(f => f.id !== tempFile.id));
            setProcessingFiles(prev => [...prev, {
              ...tempFile,
              status: 'processing',
              progress: 10,
              backendId: paper.id,
              processingSteps: [
                { name: 'Uploading File', status: 'completed', timestamp: new Date() },
                { name: 'Image Preprocessing', status: 'pending', timestamp: null },
                { name: 'Text Extraction (OCR)', status: 'pending', timestamp: null },
                { name: 'Saving Results', status: 'pending', timestamp: null }
              ]
            }]);
          }
        } catch (uploadError) {
          console.error('File upload error:', uploadError);
          // Update file status to error
          setUploadedFiles(prev => prev.map(f =>
            f.id === tempFile.id ? { ...f, status: 'error', progress: 0 } : f
          ));
        }
      }

      showToast(`Uploaded ${files.length} file(s). Processing started.`, 'success');
    } catch (error) {
      console.error('Upload error:', error);
      showToast('Error uploading files', 'error');
    }
  };

  const deleteFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
    showToast('File deleted successfully', 'success');
  };

  const deleteProcessingFile = async (fileId, backendId) => {
    try {
      const token = localStorage.getItem('token');
      if (backendId) {
        await api.delete(`/api/papers/${backendId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setProcessingFiles(prev => prev.filter(f => f.id !== fileId));
      showToast('File removed successfully', 'success');
    } catch (error) {
      console.error('Delete error:', error);
      showToast('Error removing file', 'error');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files);
    }
  };


  const handleTotalMarksChange = (value) => {
    const newTotal = parseInt(value) || 0;
    setTotalMarks(newTotal);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'uploading': return '#3b82f6';
      case 'processing': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'error': return '#ef4444';
      default: return '#94a3b8';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'uploading': return '📤';
      case 'processing': return '⚙️';
      case 'completed': return '✅';
      case 'error': return '❌';
      default: return '📄';
    }
  };

  const getActiveStep = (steps) => {
    if (!steps) return null;
    return steps.find(step => step.status === 'in-progress') ||
      steps.find(step => step.status === 'pending');
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>
          ← Back to Dashboard
        </button>
        <h1 style={styles.title}>Upload Student Papers</h1>
        <p style={styles.welcome}>Upload student answer scripts for processing</p>
      </div>

      {/* Main Content Grid */}
      <div style={styles.contentGrid}>
        {/* Left Column - Upload & Settings */}
        <div style={styles.leftColumn}>
          {/* Subject Input */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📚 Paper Details</h3>
            <div style={styles.formGroup}>
              <label style={styles.label}>Subject</label>
              <input
                type="text"
                value={studentPaperSubject}
                onChange={(e) => setStudentPaperSubject(e.target.value)}
                placeholder="e.g., Mathematics, Science"
                style={styles.input}
              />
            </div>
            <div style={styles.formGroup}>
              <label style={styles.label}>Select Student</label>
              <select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
                style={styles.input}
              >
                <option value="">-- Select Student --</option>
                {students.map(s => (
                  <option key={s._id} value={s._id}>{s.email.split('@')[0]} ({s.email})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Upload Area */}
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📁 Upload Papers</h3>
            <div
              style={styles.uploadArea}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => studentPaperInputRef.current?.click()}
            >
              <div style={styles.uploadIcon}>📁</div>
              <p style={styles.uploadText}>Drag & drop files here or click to browse</p>
              <p style={styles.uploadSubtext}>Supports PDF, DOC, DOCX, JPG, JPEG, PNG</p>
              <p style={styles.uploadLimit}>Multiple files supported</p>
              <input
                ref={studentPaperInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </div>
          </div>
        </div>

        {/* Right Column - Staging Area */}
        <div style={styles.rightColumn}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>📋 Selected Files</h3>
            {filesToStage.length === 0 ? (
              <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>No files selected yet.</p>
            ) : (
              <div style={styles.stagedList}>
                {filesToStage.map(file => (
                  <div key={file.id} style={styles.stagedItem}>
                    <span>{file.fileName}</span>
                    <button onClick={() => removeStagedFile(file.id)} style={styles.deleteBtnSmall}>✕</button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={processUploads}
              style={{
                ...styles.saveButton,
                marginTop: '20px',
                opacity: (filesToStage.length > 0 && selectedStudent && studentPaperSubject) ? 1 : 0.5,
                cursor: (filesToStage.length > 0 && selectedStudent && studentPaperSubject) ? 'pointer' : 'not-allowed'
              }}
              disabled={!filesToStage.length || !selectedStudent || !studentPaperSubject}
            >
              🚀 Start Processing
            </button>
          </div>
        </div>
      </div>

      {/* Uploaded Files (Not yet processing) */}
      {uploadedFiles.length > 0 && (
        <div style={styles.filesCard}>
          <div style={styles.filesHeader}>
            <h3 style={styles.filesTitle}>📤 Ready to Upload ({uploadedFiles.length})</h3>
            <div style={styles.filesSummary}>
              <span style={styles.summaryBadge}>📚 {studentPaperSubject || 'General'}</span>
              <span style={styles.summaryBadge}>📊 {totalMarks} total marks</span>
              <span style={styles.summaryBadge}>📋 {sections.length} sections</span>
            </div>
          </div>
          <div style={styles.filesList}>
            {uploadedFiles.map(file => {
              const date = new Date(file.uploadedAt);
              return (
                <div key={file.id} style={styles.fileItem}>
                  <div style={styles.fileInfo}>
                    <div style={{
                      ...styles.fileIcon,
                      backgroundColor: getStatusColor(file.status) + '20',
                      color: getStatusColor(file.status)
                    }}>
                      {getStatusIcon(file.status)}
                    </div>
                    <div style={styles.fileDetails}>
                      <p style={styles.fileName}>{file.fileName}</p>
                      <div style={styles.fileMeta}>
                        <span>📚 {file.subject}</span>
                        <span>📊 {file.totalMarks} marks</span>
                        <span>📋 {file.sections?.length || 0} sections</span>
                        <span>📅 {date.toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div style={styles.fileActions}>
                    <button
                      onClick={() => deleteFile(file.id)}
                      style={styles.deleteBtn}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Processing Files */}
      {processingFiles.length > 0 && (
        <div style={styles.filesCard}>
          <div style={styles.filesHeader}>
            <h3 style={styles.filesTitle}>⚙️ Processing Papers ({processingFiles.length})</h3>
            <div style={styles.filesSummary}>
              <span style={styles.summaryBadge}>📚 {studentPaperSubject || 'General'}</span>
              <span style={styles.summaryBadge}>⏱️ Real-time Analysis</span>
            </div>
          </div>
          <div style={styles.filesList}>
            {processingFiles.map(file => {
              const activeStep = getActiveStep(file.processingSteps);
              const date = new Date(file.uploadedAt);

              return (
                <div key={file.id} style={styles.fileItem}>
                  <div style={styles.fileInfo}>
                    <div style={{
                      ...styles.fileIcon,
                      backgroundColor: getStatusColor(file.status) + '20',
                      color: getStatusColor(file.status)
                    }}>
                      {getStatusIcon(file.status)}
                    </div>
                    <div style={styles.fileDetails}>
                      <p style={styles.fileName}>{file.fileName}</p>
                      <div style={styles.fileMeta}>
                        <span>📚 {file.subject}</span>
                        <span>📊 {file.totalMarks} marks</span>
                        <span>⚙️ {file.status.toUpperCase()}</span>
                        <span>📅 {date.toLocaleDateString()}</span>
                      </div>

                      {/* Processing Steps */}
                      {activeStep && (
                        <div style={styles.processingSteps}>
                          <div style={styles.currentStep}>
                            <span style={styles.stepName}>{activeStep.name}</span>
                            {file.status === 'processing' && (
                              <span style={styles.stepSpinner}></span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Progress Bar */}
                      <div style={styles.progressContainer}>
                        <div style={styles.progressBar}>
                          <div
                            style={{
                              ...styles.progressFill,
                              width: `${file.progress || 0}%`,
                              backgroundColor: getStatusColor(file.status)
                            }}
                          ></div>
                        </div>
                        <span style={styles.progressText}>{file.progress || 0}%</span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.fileActions}>
                    {file.status === 'error' && (
                      <button
                        onClick={() => deleteProcessingFile(file.id, file.backendId)}
                        style={styles.deleteBtn}
                      >
                        Remove
                      </button>
                    )}
                    <div style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusColor(file.status) + '20',
                      color: getStatusColor(file.status)
                    }}>
                      {file.status}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Completed Files */}
      {completedFiles.length > 0 && (
        <div style={styles.filesCard}>
          <div style={styles.filesHeader}>
            <h3 style={styles.filesTitle}>✅ Recent Uploads ({completedFiles.length})</h3>
            <div style={styles.filesSummary}>
              <span style={styles.summaryBadge}>📚 {studentPaperSubject || 'General'}</span>
              <span style={styles.summaryBadge}>✅ Ready (Go to Start Grading)</span>
            </div>
          </div>
          <div style={styles.filesList}>
            {completedFiles.map(file => {
              const date = new Date(file.uploadedAt);

              return (
                <div key={file.id} style={styles.completedFileItem}>
                  <div style={styles.fileInfo}>
                    <div style={{
                      ...styles.fileIcon,
                      backgroundColor: getStatusColor('completed') + '20',
                      color: getStatusColor('completed')
                    }}>
                      ✅
                    </div>
                    <div style={styles.fileDetails}>
                      <p style={styles.fileName}>{file.fileName}</p>
                      <div style={styles.fileMeta}>
                        <span>📚 {file.subject}</span>
                        <span>👤 {students.find(s => s._id === file.studentId)?.email.split('@')[0] || 'Unknown'}</span>
                        <span>📊 {file.analysisResults?.wordCount || 0} words</span>
                        <span>✍️ {file.analysisResults?.handwritingScore || 0}% handwriting</span>
                        <span>⏱️ {file.analysisResults?.estimatedTime || 0} min estimated</span>
                      </div>


                    </div>
                  </div>

                  <div style={styles.fileActions}>
                    <button
                      onClick={() => setExtractedTextModal({
                        isOpen: true,
                        file: file,
                        text: file.analysisResults?.extractedText || 'No text extracted from this file.'
                      })}
                      style={styles.viewTextButton}
                    >
                      📝 View Extracted Text
                    </button>
                    <div style={{
                      ...styles.statusBadge,
                      backgroundColor: getStatusColor('completed') + '20',
                      color: getStatusColor('completed')
                    }}>
                      Ready for Grading
                    </div>
                  </div>


                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {/* Action Buttons */}
      <div style={styles.actionButtons}>
        {/* Removed save config button as it's not needed for new flow */}
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            ...styles.toast,
            backgroundColor: toast.type === 'error' ? '#dc2626' :
              toast.type === 'warning' ? '#f59e0b' : '#059669'
          }}
        >
          {toast.message}
        </div>
      )}

      {/* Extracted Text Modal */}
      {extractedTextModal.isOpen && extractedTextModal.file && (
        <div style={styles.modalOverlay} onClick={() => setExtractedTextModal({ isOpen: false, file: null, text: '' })}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>Extracted Text - {extractedTextModal.file.fileName}</h3>
              <button
                style={styles.closeButton}
                onClick={() => setExtractedTextModal({ isOpen: false, file: null, text: '' })}
              >
                ✕
              </button>
            </div>
            <div style={styles.modalBody}>
              <textarea
                style={styles.textArea}
                value={extractedTextModal.text}
                readOnly
                placeholder="Extracted text will appear here..."
              />
            </div>
            <div style={styles.modalFooter}>
              <button
                style={styles.downloadButton}
                onClick={() => {
                  const blob = new Blob([extractedTextModal.text], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${extractedTextModal.file.fileName}_extracted.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                💾 Download Text
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Premium, Glassmorphism, Futuristic Styles
const styles = {
  container: {
    width: '100%',
    minHeight: '100vh',
    padding: '40px',
    background: 'radial-gradient(circle at top right, #1e293b 0%, #0f172a 100%)', // Subtle gradient bg
    color: '#f8fafc',
    fontFamily: '"Outfit", "Inter", sans-serif',
    overflowX: 'hidden'
  },
  header: {
    marginBottom: '40px',
    position: 'relative'
  },
  backButton: {
    padding: '10px 0',
    background: 'none',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '14px',
    marginBottom: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'color 0.2s',
  },
  title: {
    fontSize: '36px',
    fontWeight: '700',
    margin: '0 0 10px 0',
    background: 'linear-gradient(135deg, #fff 0%, #94a3b8 100%)', // Gradient text
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    letterSpacing: '-0.02em',
    textShadow: '0 0 20px rgba(255,255,255,0.1)'
  },
  welcome: {
    fontSize: '16px',
    color: '#64748b',
    fontWeight: '400',
    maxWidth: '600px'
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 350px', // Fixed width for staging area
    gap: '30px',
    marginBottom: '40px'
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px'
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
    height: 'fit-content'
  },
  card: {
    background: 'rgba(30, 41, 59, 0.4)', // Glass effect
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    borderRadius: '24px',
    padding: '30px',
    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.3)',
    position: 'relative',
    overflow: 'hidden'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#e2e8f0',
    margin: '0 0 24px 0',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    letterSpacing: '0.01em'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '13px',
    color: '#94a3b8',
    marginBottom: '8px',
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  input: {
    width: '100%',
    padding: '14px 16px',
    borderRadius: '12px',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    color: '#f1f5f9',
    fontSize: '15px',
    outline: 'none',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
  },
  uploadArea: {
    border: '2px dashed rgba(99, 102, 241, 0.3)', // Indigo tint dashed
    borderRadius: '20px',
    padding: '60px 40px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backgroundColor: 'rgba(30, 41, 59, 0.2)',
    backgroundImage: 'radial-gradient(circle at center, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
    position: 'relative'
  },
  uploadIcon: {
    fontSize: '48px',
    marginBottom: '20px',
    filter: 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.5))' // Glow effect
  },
  uploadText: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: '8px'
  },
  uploadSubtext: {
    fontSize: '14px',
    color: '#64748b'
  },
  stagedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    maxHeight: '400px',
    overflowY: 'auto',
    paddingRight: '4px'
  },
  stagedItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '12px',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    transition: 'all 0.2s'
  },
  deleteBtnSmall: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    transition: 'all 0.2s'
  },
  saveButton: { // Used as 'Start Processing'
    width: '100%',
    padding: '16px',
    borderRadius: '14px',
    border: 'none',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', // Modern purple gradient
    color: 'white',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 10px 20px -5px rgba(99, 102, 241, 0.4)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginTop: '20px'
  },
  filesCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    borderRadius: '24px',
    padding: '30px',
    marginTop: '30px',
    boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)'
  },
  filesHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(148, 163, 184, 0.1)'
  },
  filesTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#f1f5f9',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  filesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  fileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    border: '1px solid rgba(148, 163, 184, 0.1)',
    borderRadius: '16px',
    transition: 'transform 0.2s',
  },
  completedFileItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    border: '1px solid rgba(16, 185, 129, 0.1)',
    borderRadius: '16px',
    transition: 'transform 0.2s',
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flex: 1
  },
  fileIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    boxShadow: '0 8px 16px -4px rgba(0,0,0,0.2)'
  },
  fileName: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#f1f5f9',
    marginBottom: '6px'
  },
  fileMeta: {
    display: 'flex',
    gap: '16px',
    fontSize: '13px',
    color: '#94a3b8'
  },
  statusBadge: {
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.05em'
  },
  viewTextButton: {
    padding: '10px 20px',
    borderRadius: '10px',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    color: '#60a5fa',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    transition: 'all 0.2s',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    padding: '20px'
  },
  modalContent: {
    backgroundColor: '#0f172a',
    borderRadius: '24px',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '90vh',
    overflow: 'hidden',
    boxShadow: '0 0 50px rgba(0,0,0,0.5)',
    border: '1px solid rgba(148, 163, 184, 0.1)'
  },
  modalHeader: {
    padding: '24px 30px',
    borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'linear-gradient(to right, #0f172a, #1e293b)'
  },
  textArea: {
    width: '100%',
    minHeight: '500px',
    padding: '30px',
    backgroundColor: '#0b1120',
    color: '#e2e8f0',
    fontSize: '14px',
    lineHeight: '1.7',
    fontFamily: '"JetBrains Mono", "Fira Code", monospace',
    outline: 'none',
    border: 'none',
    resize: 'none'
  },
  // Re-declare needed simple styles
  filesSummary: { display: 'flex', gap: '8px' },
  summaryBadge: { backgroundColor: 'rgba(148,163,184,0.1)', color: '#94a3b8', padding: '6px 12px', borderRadius: '20px', fontSize: '12px' },
  progressContainer: { display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' },
  progressBar: { flex: 1, height: '6px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: '3px', transition: 'width 0.3s ease' },
  progressText: { fontSize: '12px', color: '#94a3b8', minWidth: '40px' },
  deleteBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    color: '#ef4444',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    transition: 'all 0.2s'
  },
  fileActions: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: '16px' },
  processingSteps: { marginTop: '12px' },
  currentStep: { fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '8px' },
  stepName: { color: '#e2e8f0' },
  stepSpinner: { width: '14px', height: '14px', border: '2px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' },
  modalBody: { padding: 0, maxHeight: 'calc(90vh - 140px)', overflow: 'auto' },
  modalFooter: { padding: '20px 30px', borderTop: '1px solid rgba(148, 163, 184, 0.1)', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#0f172a' },
  downloadButton: { padding: '12px 24px', borderRadius: '10px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: '600', cursor: 'pointer' },
  closeButton: { background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' },
  toast: { position: 'fixed', top: '24px', right: '24px', padding: '16px 24px', borderRadius: '12px', zIndex: 3000, boxShadow: '0 10px 30px rgba(0,0,0,0.5)', fontSize: '14px', fontWeight: '500', color: '#fff', backdropFilter: 'blur(10px)' }
};

// Add CSS animations and globals
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  
  @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
  
  /* Custom scrollbar for webkit */
  ::-webkit-scrollbar { width: 8px; height: 8px; }
  ::-webkit-scrollbar-track { background: rgba(15, 23, 42, 0.5); }
  ::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.2); borderRadius: 4px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.4); }

  /* Input focus states */
  input:focus, select:focus {
    border-color: #6366f1 !important;
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2) !important;
  }
`;
document.head.appendChild(styleSheet);

export default UploadStudentPapers;