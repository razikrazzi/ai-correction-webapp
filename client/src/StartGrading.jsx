// StartGrading.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StartGrading = ({ user, onBack, onStartGrading }) => {
  // Step State
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  // Data States
  const [subjects, setSubjects] = useState([]);
  const [answerKeys, setAnswerKeys] = useState([]);
  const [studentPapers, setStudentPapers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Step 1: Evaluation Setup
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedAnswerKey, setSelectedAnswerKey] = useState('');

  // Step 2: Student Info
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedStudentPaper, setSelectedStudentPaper] = useState('');
  const [selectedPaperData, setSelectedPaperData] = useState(null);

  // Step 3: Grading Configuration
  const [gradingMode, setGradingMode] = useState('section'); // 'section' or 'question'
  const [aiOptions, setAiOptions] = useState({
    keywordMatching: true,
    semanticSimilarity: true,
    grammarCheck: false,
    handwritingOCR: true
  });
  const [customTotalMarks, setCustomTotalMarks] = useState(100);
  const [paperStructure, setPaperStructure] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', marks: '' });

  // Step 4: Review
  const [confirmed, setConfirmed] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationProgress, setEvaluationProgress] = useState(0);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id && !user?.email) return;

      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const userId = user.id || user.email;

        // Fetch papers
        const response = await axios.get(`/api/papers/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const papers = response.data || [];

        // Extract subjects
        const uniqueSubjects = [...new Set(papers.map(p => p.subject))];
        setSubjects(uniqueSubjects.sort());

        // Separate Answer Keys & Student Papers
        // Use loose equality for marks to handle "0" string vs 0 number
        setAnswerKeys(papers.filter(p => !p.totalMarks || p.totalMarks == 0));

        // checking for 'analyzed' or 'completed' status
        setStudentPapers(papers.filter(p =>
          (p.status === 'analyzed' || p.status === 'completed') &&
          p.totalMarks > 0
        ));

        // Fetch Students
        try {
          const studentsRes = await axios.get('/api/auth/students', {
            headers: { Authorization: `Bearer ${token}` }
          });
          setStudents(studentsRes.data.map(s => ({
            id: s._id,
            name: s.email.split('@')[0],
            email: s.email,
            rollNumber: s.rollNumber || 'N/A'
          })));
        } catch (e) {
          console.error("Error fetching students", e);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        const errorMsg = error.response?.data?.message || error.message || 'Check console for details';
        showToast(`Error loading data: ${errorMsg}`, 'error');

        if (error.response?.status === 401 || errorMsg.toLowerCase().includes('invalid token')) {
          setTimeout(() => {
            localStorage.clear();
            window.location.reload();
          }, 1500);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Handlers
  const handleSubjectChange = (subject) => {
    setSelectedSubject(subject);
    setSelectedAnswerKey('');
    setSelectedStudentPaper('');
    setSelectedPaperData(null);
  };

  const handleStudentPaperChange = (paperId) => {
    setSelectedStudentPaper(paperId);
    const paper = studentPapers.find(p => p._id === paperId || p.id === paperId);
    setSelectedPaperData(paper || null);
    if (paper) {
      setCustomTotalMarks(paper.totalMarks || 100);
      setPaperStructure(paper.sections?.map(s => ({ name: s.name, marks: s.marks })) || []);
    } else {
      setCustomTotalMarks(100);
      setPaperStructure([]);
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps) setCurrentStep(curr => curr + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(curr => curr - 1);
    else onBack();
  };

  const startGradingProcess = () => {
    if (!confirmed) {
      showToast('Please confirm the configuration first.', 'warning');
      return;
    }

    setIsEvaluating(true);

    // Construct payload
    const answerKeyObj = answerKeys.find(k => k.id === selectedAnswerKey || k._id === selectedAnswerKey);
    const studentDetails = students.find(s => s.id === selectedStudent);

    // Simplistic sections payload (assuming section-wise for now based on paper data)
    // If Question-wise is selected, we might need a different structure, but backend likely expects sections map
    // Use user-defined structure or fallback to existing sections
    const structureToUse = paperStructure.length > 0 ? paperStructure : (selectedPaperData?.sections || []);

    const studentAnswersPayload = structureToUse.reduce((acc, item) => {
      // Map the full extracted text to each section/question as context
      // Try multiple paths for extracted text
      const text = selectedPaperData?.extractedText ||
        selectedPaperData?.analysisResults?.extractedText ||
        selectedPaperData?.analysisResults?.ocrText || "";
      acc[item.name] = text;
      return acc;
    }, {});

    const gradingData = {
      subject: selectedSubject,
      totalMarks: parseInt(customTotalMarks) || 100,
      sections: paperStructure.length > 0 ? paperStructure : (selectedPaperData?.sections || []),
      answerKey: answerKeyObj?.analysisResults?.extractedText || "",
      studentAnswers: studentAnswersPayload,
      studentName: studentDetails?.name || 'Unknown',
      studentEmail: studentDetails?.email,
      studentId: selectedStudent,
      rollNumber: studentDetails?.rollNumber || 'N/A',
      selectedAnswerKey,
      selectedStudentPaper,
      selectedStudent,
      gradingMode, // Pass this so backend can use it if updated
      aiOptions   // Pass options
    };

    onStartGrading(gradingData);
  };

  // Helper to get filtered lists
  const filteredAnswerKeys = answerKeys.filter(k => k.subject === selectedSubject);
  const filteredStudentPapers = studentPapers.filter(p => p.subject === selectedSubject);

  // Render Steps
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Evaluation Setup
        return (
          <div style={styles.stepContainer}>
            <h3 style={styles.stepTitle}>🧩 Step 1: Evaluation Setup</h3>
            <p style={styles.stepDesc}>Configure the subject and answer key to proceed.</p>

            <div style={styles.formGroup}>
              <label style={styles.label}>Select Subject</label>
              <div style={styles.subjectGrid}>
                {subjects.map(sub => (
                  <button
                    key={sub}
                    style={{
                      ...styles.subjectButton,
                      ...(selectedSubject === sub ? styles.subjectButtonActive : {})
                    }}
                    onClick={() => handleSubjectChange(sub)}
                  >
                    {sub}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Select Answer Key</label>
              <select
                style={styles.select}
                value={selectedAnswerKey}
                onChange={e => setSelectedAnswerKey(e.target.value)}
                disabled={!selectedSubject}
              >
                <option value="">-- Select Answer Key --</option>
                {filteredAnswerKeys.map(k => (
                  <option key={k._id || k.id} value={k._id || k.id}>
                    {k.originalFileName || k.fileName}
                  </option>
                ))}
              </select>
              {selectedAnswerKey && (
                <div style={styles.metaInfo}>
                  Selected key ID: {selectedAnswerKey}
                </div>
              )}
            </div>
          </div>
        );

      case 2: // Student Info
        return (
          <div style={styles.stepContainer}>
            <h3 style={styles.stepTitle}>🧩 Step 2: Student Selection</h3>
            <p style={styles.stepDesc}>Identify the student and their answer paper.</p>

            <div style={styles.formGroup}>
              <label style={styles.label}>Select Student</label>
              <select
                style={styles.select}
                value={selectedStudent}
                onChange={e => setSelectedStudent(e.target.value)}
              >
                <option value="">-- Select Student --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Select Answer Paper</label>
              <select
                style={styles.select}
                value={selectedStudentPaper}
                onChange={e => handleStudentPaperChange(e.target.value)}
              >
                <option value="">-- Select Paper --</option>
                {filteredStudentPapers.map(p => (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {p.originalFileName} ({p.totalMarks} Marks)
                  </option>
                ))}
              </select>
            </div>

            {selectedPaperData && (
              <div style={styles.previewBox}>
                <h4 style={styles.previewTitle}>📄 Paper Preview</h4>
                <div style={styles.previewRow}><strong>File:</strong> {selectedPaperData.originalFileName}</div>
                <div style={styles.previewRow}><strong>Uploaded:</strong> {new Date(selectedPaperData.createdAt).toLocaleDateString()}</div>
                <div style={styles.previewRow}><strong>Pages:</strong> {selectedPaperData.analysisResults?.ocrResults?.pages || 1}</div>
              </div>
            )}
          </div>
        );

      case 3: // Grading Configuration
        return (
          <div style={styles.stepContainer}>
            <h3 style={styles.stepTitle}>🧩 Step 3: Grading Configuration</h3>
            <p style={styles.stepDesc}>Customize the grading logic and structure.</p>

            <div style={styles.card}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Grading Mode</label>
                <div style={styles.toggleContainer}>
                  <button
                    style={gradingMode === 'section' ? styles.toggleActive : styles.toggleInactive}
                    onClick={() => {
                      setGradingMode('section');
                      // Try to restore sections if they exist in original data, otherwise clear
                      if (selectedPaperData?.sections) {
                        setPaperStructure(selectedPaperData.sections.map(s => ({ name: s.name, marks: s.marks })));
                      } else {
                        setPaperStructure([]);
                      }
                    }}
                  >
                    📑 Section-wise
                  </button>
                  <button
                    style={gradingMode === 'question' ? styles.toggleActive : styles.toggleInactive}
                    onClick={() => {
                      setGradingMode('question');
                      setPaperStructure([]); // Clear sections when switching to questions
                    }}
                  >
                    ❓ Question-wise
                  </button>
                </div>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Total Marks</label>
                <input
                  type="number"
                  style={styles.input}
                  value={customTotalMarks}
                  onChange={(e) => setCustomTotalMarks(e.target.value)}
                />
              </div>

              <div style={styles.formGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ ...styles.label, marginBottom: 0 }}>
                    {gradingMode === 'section' ? 'Define Sections' : 'Define Questions'}
                  </label>
                  {gradingMode === 'question' && paperStructure.length === 0 && (
                    <button
                      onClick={() => {
                        // Auto-generate 5 questions as a helper
                        const newQ = Array.from({ length: 5 }, (_, i) => ({ name: `Q${i + 1}`, marks: 10 }));
                        setPaperStructure(newQ);
                      }}
                      style={styles.textButton}
                    >
                      + Auto-generate Q1-Q5
                    </button>
                  )}
                </div>

                <div style={styles.structureEditor}>
                  <div style={styles.addItemRow}>
                    <input
                      type="text"
                      placeholder={gradingMode === 'section' ? "Section (e.g., A)" : "Question (e.g., Q1)"}
                      style={styles.inputSmall}
                      value={newItem.name}
                      onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    />

                    {gradingMode === 'section' && (
                      <input
                        type="number"
                        placeholder="Ques Count"
                        style={styles.inputSmall}
                        value={newItem.count || ''}
                        onChange={(e) => setNewItem({ ...newItem, count: e.target.value })}
                      />
                    )}

                    <input
                      type="number"
                      placeholder={gradingMode === 'section' ? "Marks/Ques" : "Total Marks"}
                      style={styles.inputSmall}
                      value={newItem.marks}
                      onChange={(e) => setNewItem({ ...newItem, marks: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (newItem.name && newItem.marks) {
                            const marks = parseFloat(newItem.marks);
                            const count = parseInt(newItem.count) || 1;
                            const item = {
                              name: newItem.name,
                              marks: gradingMode === 'section' ? marks * count : marks,
                              marksPerQuestion: gradingMode === 'section' ? marks : undefined,
                              questionCount: gradingMode === 'section' ? count : undefined,
                              type: gradingMode
                            };
                            setPaperStructure([...paperStructure, item]);
                            setNewItem({ name: '', marks: '', count: '' });
                          }
                        }
                      }}
                    />

                    <button
                      onClick={() => {
                        if (newItem.name && newItem.marks) {
                          const marks = parseFloat(newItem.marks);
                          const count = parseInt(newItem.count) || 1;
                          const item = {
                            name: newItem.name,
                            marks: gradingMode === 'section' ? marks * count : marks,
                            marksPerQuestion: gradingMode === 'section' ? marks : undefined,
                            questionCount: gradingMode === 'section' ? count : undefined,
                            type: gradingMode
                          };
                          setPaperStructure([...paperStructure, item]);
                          setNewItem({ name: '', marks: '', count: '' });
                        }
                      }}
                      style={styles.addButton}
                    >
                      Add
                    </button>
                  </div>

                  <div style={styles.structureList}>
                    {paperStructure.map((item, idx) => (
                      <div key={idx} style={styles.structureItem}>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: '500', color: '#e2e8f0' }}>{item.name}</span>
                          {item.type === 'section' && (
                            <span style={{ fontSize: '12px', color: '#64748b' }}>
                              {item.questionCount} Qs × {item.marksPerQuestion} marks
                            </span>
                          )}
                        </div>
                        <span style={{ color: '#94a3b8' }}>{item.marks} marks</span>
                        <button
                          onClick={() => setPaperStructure(paperStructure.filter((_, i) => i !== idx))}
                          style={styles.removeButton}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                    {paperStructure.length === 0 && (
                      <div style={styles.emptyStateSimple}>
                        <p>No {gradingMode === 'section' ? 'sections' : 'questions'} defined.</p>
                      </div>
                    )}
                  </div>

                  <div style={styles.allocationBar}>
                    <span>Allocated: <strong>{paperStructure.reduce((sum, item) => sum + (parseInt(item.marks) || 0), 0)}</strong> / {customTotalMarks}</span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ ...styles.card, marginTop: '20px' }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>AI Evaluation Options</label>
                <div style={styles.checkboxGroup}>
                  <label style={styles.checkCard}>
                    <input
                      type="checkbox"
                      checked={aiOptions.keywordMatching}
                      onChange={e => setAiOptions({ ...aiOptions, keywordMatching: e.target.checked })}
                    />
                    <span>Keyword Matching</span>
                  </label>
                  <label style={styles.checkCard}>
                    <input
                      type="checkbox"
                      checked={aiOptions.semanticSimilarity}
                      onChange={e => setAiOptions({ ...aiOptions, semanticSimilarity: e.target.checked })}
                    />
                    <span>Semantic Similarity</span>
                  </label>
                  <label style={styles.checkCard}>
                    <input
                      type="checkbox"
                      checked={aiOptions.grammarCheck}
                      onChange={e => setAiOptions({ ...aiOptions, grammarCheck: e.target.checked })}
                    />
                    <span>Strict Grammar</span>
                  </label>
                  <label style={styles.checkCard}>
                    <input
                      type="checkbox"
                      checked={aiOptions.handwritingOCR}
                      onChange={e => setAiOptions({ ...aiOptions, handwritingOCR: e.target.checked })}
                    />
                    <span>Handwriting OCR</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 4: // Review
        return (
          <div style={styles.stepContainer}>
            <h3 style={styles.stepTitle}>🧩 Step 4: Review & Start</h3>
            <p style={styles.stepDesc}>Confirm details before starting AI grading.</p>

            <div style={styles.summaryCard}>
              <div style={styles.summaryRow}><strong>Subject:</strong> {selectedSubject}</div>
              <div style={styles.summaryRow}><strong>Student:</strong> {students.find(s => s.id === selectedStudent)?.name}</div>
              <div style={styles.summaryRow}><strong>Paper:</strong> {selectedPaperData?.originalFileName}</div>
              <div style={styles.summaryRow}><strong>Mode:</strong> {gradingMode === 'section' ? 'Section-wise' : 'Question-wise'}</div>
              <div style={styles.summaryRow}><strong>AI Options:</strong> {[
                aiOptions.keywordMatching && 'Keywords',
                aiOptions.semanticSimilarity && 'Semantic',
                aiOptions.grammarCheck && 'Grammar'
              ].filter(Boolean).join(', ')}</div>
            </div>

            <div style={styles.confirmationBox}>
              <label style={styles.confirmLabel}>
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={e => setConfirmed(e.target.checked)}
                />
                I confirm that the above configuration is correct.
              </label>
            </div>
          </div>
        );
      default: return null;
    }
  };

  // Progress Bar Component
  const ProgressBar = () => (
    <div style={styles.progressContainer}>
      <div style={styles.stepsIndicator}>
        {[1, 2, 3, 4].map(step => (
          <div key={step} style={{
            ...styles.stepDot,
            backgroundColor: step <= currentStep ? '#3b82f6' : '#334155',
            color: step <= currentStep ? 'white' : '#94a3b8'
          }}>
            {step}
          </div>
        ))}
        <div style={styles.progressLineBase}>
          <div style={{
            ...styles.progressLineFill,
            width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`
          }} />
        </div>
      </div>
      <div style={styles.stepLabel}>Step {currentStep} of {totalSteps}</div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.backButton}>← Back</button>
        <h1 style={styles.title}>Evaluation Setup</h1>
      </div>

      <ProgressBar />

      <div style={styles.contentArea}>
        {renderStepContent()}
      </div>

      <div style={styles.footerNav}>
        <button
          onClick={handleBack}
          style={styles.navButtonSecondary}
        >
          {currentStep === 1 ? 'Cancel' : '⬅ Back'}
        </button>

        {currentStep < 4 ? (
          <button
            onClick={handleNext}
            style={styles.navButtonPrimary}
            disabled={
              (currentStep === 1 && (!selectedSubject || !selectedAnswerKey)) ||
              (currentStep === 2 && (!selectedStudent || !selectedStudentPaper))
            }
          >
            Next Page ➡
          </button>
        ) : (
          <button
            onClick={startGradingProcess}
            style={{ ...styles.navButtonPrimary, backgroundColor: '#10b981' }}
            disabled={!confirmed}
          >
            🚀 START GRADING
          </button>
        )}
      </div>

      {toast && (
        <div style={styles.toast}>{toast.message}</div>
      )}
    </div>
  );
};

// Styles
const styles = {
  container: {
    padding: '24px',
    backgroundColor: '#0f172a',
    minHeight: '100vh',
    color: '#f8fafc',
    fontFamily: 'Inter, sans-serif'
  },
  header: {
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px'
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0
  },
  backButton: {
    padding: '8px 16px',
    background: '#334155',
    border: 'none',
    borderRadius: '6px',
    color: 'white',
    cursor: 'pointer'
  },
  stepContainer: {
    maxWidth: '800px',
    margin: '0 auto',
    backgroundColor: '#1e293b',
    padding: '32px',
    borderRadius: '12px',
    border: '1px solid #334155'
  },
  stepTitle: {
    marginTop: 0,
    fontSize: '20px',
    color: '#60a5fa'
  },
  stepDesc: {
    color: '#94a3b8',
    marginBottom: '24px'
  },
  formGroup: {
    marginBottom: '24px'
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '500',
    color: '#cbd5e1'
  },
  select: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#0f172a',
    border: '1px solid #475569',
    borderRadius: '8px',
    color: 'white',
    fontSize: '14px'
  },
  subjectGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '12px'
  },
  subjectButton: {
    padding: '10px 20px',
    backgroundColor: '#0f172a',
    border: '1px solid #475569',
    borderRadius: '8px',
    color: '#cbd5e1',
    cursor: 'pointer'
  },
  subjectButtonActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    color: 'white'
  },
  metaInfo: {
    marginTop: '6px',
    fontSize: '12px',
    color: '#64748b'
  },
  previewBox: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: 'rgba(59,130,246,0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(59,130,246,0.2)'
  },
  previewTitle: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    color: '#60a5fa'
  },
  previewRow: {
    fontSize: '14px',
    marginBottom: '4px'
  },
  radioGroup: {
    display: 'flex',
    gap: '24px'
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer'
  },
  checkboxGroup: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  checkLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer'
  },
  summaryCard: {
    backgroundColor: '#0f172a',
    padding: '20px',
    borderRadius: '8px',
    marginBottom: '24px'
  },
  card: {
    backgroundColor: '#1e293b',
    padding: '24px',
    borderRadius: '12px',
    border: '1px solid #334155'
  },
  toggleContainer: {
    display: 'flex',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    padding: '4px',
    gap: '4px'
  },
  toggleActive: {
    flex: 1,
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    borderRadius: '6px',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  toggleInactive: {
    flex: 1,
    padding: '8px 16px',
    backgroundColor: 'transparent',
    color: '#94a3b8',
    borderRadius: '6px',
    border: 'none',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  checkCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    border: '1px solid #334155',
    cursor: 'pointer',
    fontSize: '14px'
  },
  textButton: {
    background: 'none',
    border: 'none',
    color: '#60a5fa',
    fontSize: '13px',
    cursor: 'pointer',
    padding: 0
  },
  emptyStateSimple: {
    textAlign: 'center',
    padding: '20px',
    color: '#64748b',
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    border: '1px dashed #334155'
  },
  allocationBar: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid #334155',
    color: '#94a3b8',
    fontSize: '14px',
    textAlign: 'right'
  },
  summaryRow: {
    padding: '8px 0',
    borderBottom: '1px solid #334155'
  },
  input: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    backgroundColor: '#1e293b',
    color: '#f8fafc',
    border: '1px solid #334155',
    fontSize: '14px'
  },
  structureEditor: {
    backgroundColor: '#1e293b',
    padding: '16px',
    borderRadius: '8px',
    border: '1px solid #334155'
  },
  addItemRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '16px'
  },
  inputSmall: {
    flex: 1,
    padding: '8px',
    borderRadius: '6px',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    border: '1px solid #334155',
    fontSize: '14px'
  },
  addButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    borderRadius: '6px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600'
  },
  structureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  structureItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    backgroundColor: '#0f172a',
    borderRadius: '6px',
    border: '1px solid #334155'
  },
  removeButton: {
    backgroundColor: 'transparent',
    color: '#ef4444',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '0 4px'
  },
  emptyText: {
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center'
  },
  confirmationBox: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: 'rgba(16,185,129,0.1)',
    borderRadius: '8px',
    border: '1px solid rgba(16,185,129,0.2)'
  },
  confirmLabel: {
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  footerNav: {
    maxWidth: '800px',
    margin: '24px auto',
    display: 'flex',
    justifyContent: 'space-between'
  },
  navButtonSecondary: {
    padding: '12px 24px',
    backgroundColor: 'transparent',
    border: '1px solid #475569',
    color: '#cbd5e1',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px'
  },
  navButtonPrimary: {
    padding: '12px 24px',
    backgroundColor: '#3b82f6',
    border: 'none',
    color: 'white',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  progressContainer: {
    maxWidth: '600px',
    margin: '0 auto 32px auto',
    textAlign: 'center'
  },
  stepsIndicator: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'relative',
    marginBottom: '10px'
  },
  stepDot: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    fontWeight: 'bold',
    transition: 'all 0.3s'
  },
  progressLineBase: {
    position: 'absolute',
    top: '50%',
    left: '0',
    right: '0',
    height: '2px',
    backgroundColor: '#334155',
    zIndex: 1,
    transform: 'translateY(-50%)'
  },
  progressLineFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    transition: 'width 0.3s'
  },
  stepLabel: {
    color: '#94a3b8',
    fontSize: '14px'
  },
  toast: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    backgroundColor: '#10b981',
    color: 'white',
    padding: '12px 24px',
    borderRadius: '8px',
    zIndex: 1000
  }
};

// Inject global styles to fix specific UI issues like dropdown visibility
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  select option {
    background-color: #1e293b;
    color: #f8fafc;
  }
`;
document.head.appendChild(styleSheet);

export default StartGrading;