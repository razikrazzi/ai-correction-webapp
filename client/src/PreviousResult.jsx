import React, { useState, useEffect } from 'react';

import axios from 'axios';

import DetailedEvaluationReport from './DetailedEvaluationReport';

const PreviousResult = ({ onBack, pendingGradingParams, clearPendingParams }) => {
    const [evaluations, setEvaluations] = useState([]);
    const [selectedResult, setSelectedResult] = useState(null);
    const [isGrading, setIsGrading] = useState(false);
    const [gradingProgress, setGradingProgress] = useState(0);
    const [gradingError, setGradingError] = useState(null);

    useEffect(() => {
        const savedEvaluations = JSON.parse(localStorage.getItem('evaluations') || '[]');
        savedEvaluations.sort((a, b) => new Date(b.evaluatedAt) - new Date(a.evaluatedAt));
        setEvaluations(savedEvaluations);
    }, []);

    useEffect(() => {
        if (pendingGradingParams && !isGrading) {
            performGrading(pendingGradingParams);
        }
    }, [pendingGradingParams]);

    const performGrading = async (params) => {
        setIsGrading(true);
        setGradingError(null);
        setGradingProgress(0);

        const progressInterval = setInterval(() => {
            setGradingProgress(prev => {
                if (prev >= 95) return prev;
                return prev + (prev < 80 ? 5 : 1);
            });
        }, 800);

        try {
            // Check if we are grading Section-wise or Question-wise
            const response = await axios.post('/api/grading/grade', {
                subject: params.subject,
                totalMarks: params.totalMarks,
                sections: params.sections,
                answerKey: params.answerKey,
                studentAnswers: params.studentAnswers,
                gradingMode: params.gradingMode,
                aiOptions: params.aiOptions
            }, { timeout: 300000 });

            clearInterval(progressInterval);
            setGradingProgress(100);

            const newResult = {
                ...response.data,
                studentName: params.studentName,
                rollNumber: params.rollNumber,
                subject: params.subject,
                evaluatedAt: new Date().toISOString(),
                answerKey: params.selectedAnswerKey,
                studentPaper: params.selectedStudentPaper,
                gradingParams: params,
                studentId: params.studentId
            };

            await saveToDatabase(newResult, params.selectedStudentPaper, params.studentId);
            updateLocalStorage(newResult);

            if (clearPendingParams) clearPendingParams();

            setEvaluations(prev => [newResult, ...prev]);
            setSelectedResult(newResult);
            setIsGrading(false);

        } catch (error) {
            clearInterval(progressInterval);
            setIsGrading(false);
            console.error('Grading error:', error);
            const msg = error.response?.data?.error || error.message || 'Unknown error';
            setGradingError(`Grading failed: ${msg}`);
        }
    };

    const saveToDatabase = async (resultData, paperId, studentId) => {
        if (!paperId) return;
        try {
            const token = localStorage.getItem('token');
            // Ensure we use relative path consistent with other fixes
            await axios.put(`/api/papers/${paperId}/result`, {
                result: resultData,
                studentId: studentId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (e) {
            console.error("DB Save failed", e);
        }
    };

    const updateLocalStorage = (newResult) => {
        const current = JSON.parse(localStorage.getItem('evaluations') || '[]');
        // Remove if exists (update)
        const filtered = current.filter(r =>
            !(r.studentPaper === newResult.studentPaper && r.evaluatedAt === newResult.evaluatedAt)
        );
        filtered.push(newResult);
        localStorage.setItem('evaluations', JSON.stringify(filtered));
    };

    const handleSaveFromReport = async (updatedResult) => {
        try {
            await saveToDatabase(updatedResult, updatedResult.studentPaper, updatedResult.studentId);
            updateLocalStorage(updatedResult);
            setEvaluations(prev => prev.map(item =>
                (item.studentPaper === updatedResult.studentPaper && item.evaluatedAt === updatedResult.evaluatedAt) ? updatedResult : item
            ));
            setSelectedResult(updatedResult);
            alert('Evaluation saved successfully!');
        } catch (e) {
            console.error(e);
            alert('Failed to save.');
        }
    };

    const clearHistory = () => {
        if (window.confirm('Clear all history?')) {
            localStorage.removeItem('evaluations');
            setEvaluations([]);
        }
    };

    // RENDER LOGIC
    if (isGrading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingCard}>
                    <h2 style={styles.loadingTitle}>Evaluating Answer Paper...</h2>
                    <p style={styles.loadingSubtitle}>AI Analysis in progress ({gradingProgress}%)</p>
                    <div style={styles.progressContainerFull}>
                        <div style={styles.progressBar}>
                            <div style={{ ...styles.progressFill, width: `${gradingProgress}%` }} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (gradingError) {
        return (
            <div style={styles.container}>
                <div style={styles.errorCard}>
                    <h2 style={styles.errorTitle}>Grading Failed</h2>
                    <p style={styles.errorMessage}>{gradingError}</p>
                    <button onClick={onBack} style={styles.primaryButton}>Back</button>
                </div>
            </div>
        );
    }

    if (selectedResult) {
        return (
            <DetailedEvaluationReport
                result={selectedResult}
                onBack={() => setSelectedResult(null)}
                onSave={handleSaveFromReport}
            />
        );
    }

    // Default List View
    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <button onClick={onBack} style={styles.backButton}>← Dashboard</button>
                <h1 style={styles.title}>History</h1>
                {evaluations.length > 0 && <button onClick={clearHistory} style={styles.clearButton}>Clear</button>}
            </div>
            <div style={styles.grid}>
                {evaluations.length === 0 ? (
                    <div style={styles.emptyState}>No evaluations yet. Start a new grading session!</div>
                ) : (
                    evaluations.map((ev, i) => (
                        <div key={i} style={styles.card} onClick={() => setSelectedResult(ev)}>
                            <h3 style={styles.cardTitle}>{ev.studentName}</h3>
                            <p style={styles.cardSubtitle}>{ev.subject} • {new Date(ev.evaluatedAt).toLocaleDateString()}</p>
                            <div style={styles.cardGrade}>{ev.grade} ({ev.percentage}%)</div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

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
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px'
    },
    headerContent: {
        flex: 1
    },
    backButton: {
        padding: '10px 20px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#334155',
        color: '#f3f4f6',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '14px',
        marginRight: '20px',
        transition: 'all 0.2s ease'
    },
    clearButton: {
        padding: '10px 20px',
        borderRadius: '8px',
        border: '1px solid #ef4444',
        backgroundColor: 'transparent',
        color: '#ef4444',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '14px',
        transition: 'all 0.2s ease'
    },
    title: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#f8fafc',
        margin: '0 0 8px 0',
        background: 'linear-gradient(135deg, #a78bfa 0%, #ec4899 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
    },
    subtitle: {
        fontSize: '16px',
        color: '#cbd5e1',
        margin: 0
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px'
    },
    card: {
        backgroundColor: '#1e293b',
        borderRadius: '12px',
        padding: '20px',
        border: '1px solid #334155',
        cursor: 'pointer',
        transition: 'transform 0.2s ease, border-color 0.2s ease',
        ':hover': {
            transform: 'translateY(-4px)',
            borderColor: '#60a5fa'
        }
    },
    cardHeader: {
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '16px'
    },
    cardIcon: {
        fontSize: '24px',
        backgroundColor: '#334155',
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
    },
    cardInfo: {
        flex: 1
    },
    cardTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#f8fafc',
        margin: '0 0 4px 0'
    },
    cardSubtitle: {
        fontSize: '14px',
        color: '#94a3b8',
        margin: 0
    },
    cardGrade: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#10b981'
    },
    cardFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '14px',
        color: '#64748b',
        borderTop: '1px solid #334155',
        paddingTop: '12px'
    },
    emptyState: {
        gridColumn: '1 / -1',
        textAlign: 'center',
        padding: '60px',
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        border: '2px dashed #334155'
    },
    emptyIcon: {
        fontSize: '48px',
        marginBottom: '16px',
        opacity: 0.5
    },
    // Result View Styles
    resultCard: {
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '800px',
        margin: '0 auto',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
    },
    scoreHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '32px'
    },
    studentName: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#f8fafc',
        margin: '0 0 4px 0'
    },
    rollNumber: {
        fontSize: '16px',
        color: '#94a3b8',
        margin: '0 0 4px 0'
    },
    date: {
        fontSize: '14px',
        color: '#64748b',
        margin: 0
    },
    gradeBox: {
        textAlign: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        padding: '12px 24px',
        borderRadius: '12px'
    },
    gradeLabel: {
        display: 'block',
        fontSize: '12px',
        color: '#10b981',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        fontWeight: '600'
    },
    gradeValue: {
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#10b981'
    },
    statsGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '24px',
        marginBottom: '32px'
    },
    statItem: {
        textAlign: 'center',
        padding: '16px',
        backgroundColor: '#0f172a',
        borderRadius: '12px'
    },
    statLabel: {
        fontSize: '14px',
        color: '#94a3b8',
        marginBottom: '8px'
    },
    statValue: {
        fontSize: '24px',
        fontWeight: 'bold',
        color: '#f8fafc'
    },
    sectionDivider: {
        height: '1px',
        backgroundColor: '#334155',
        margin: '32px 0'
    },
    detailsTitle: {
        fontSize: '18px',
        fontWeight: '600',
        color: '#f8fafc',
        marginBottom: '16px'
    },
    feedback: {
        fontSize: '16px',
        color: '#cbd5e1',
        lineHeight: '1.6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderLeft: '4px solid #3b82f6',
        padding: '16px',
        borderRadius: '0 8px 8px 0'
    },
    list: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
    },
    listItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: '#0f172a',
        borderRadius: '8px',
        border: '1px solid #334155'
    },
    itemInfo: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    itemName: {
        fontSize: '14px',
        color: '#cbd5e1',
        fontWeight: '500'
    },
    itemStatus: {
        fontSize: '12px',
        fontWeight: '600'
    },
    itemMarks: {
        fontSize: '14px',
        color: '#f8fafc',
        fontWeight: 'bold'
    },
    // Loading & Error Styles
    loadingCard: {
        maxWidth: '600px',
        margin: '100px auto',
        padding: '40px',
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        textAlign: 'center',
        border: '1px solid #334155',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)'
    },
    loadingTitle: {
        fontSize: '24px',
        color: '#f8fafc',
        marginBottom: '16px'
    },
    loadingSubtitle: {
        fontSize: '16px',
        color: '#94a3b8',
        marginBottom: '32px',
        lineHeight: '1.5'
    },
    progressContainerFull: {
        width: '100%',
        marginBottom: '24px'
    },
    progressBar: {
        width: '100%',
        height: '12px',
        backgroundColor: '#334155',
        borderRadius: '6px',
        overflow: 'hidden',
        marginBottom: '8px'
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#3b82f6',
        borderRadius: '6px',
        transition: 'width 0.5s ease'
    },
    progressLabel: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '14px',
        color: '#cbd5e1'
    },
    waitMessage: {
        fontSize: '14px',
        color: '#64748b',
        lineHeight: '1.6',
        marginTop: '24px'
    },
    errorCard: {
        maxWidth: '500px',
        margin: '100px auto',
        padding: '32px',
        backgroundColor: '#1e293b',
        borderRadius: '16px',
        textAlign: 'center',
        border: '1px solid #ef4444',
        boxShadow: '0 20px 50px rgba(220, 38, 38, 0.1)'
    },
    errorTitle: {
        fontSize: '24px',
        color: '#ef4444',
        marginBottom: '16px'
    },
    errorMessage: {
        fontSize: '16px',
        color: '#f8fafc',
        marginBottom: '32px'
    },
    errorActions: {
        display: 'flex',
        justifyContent: 'center',
        gap: '16px'
    },
    primaryButton: {
        padding: '10px 24px',
        borderRadius: '8px',
        border: 'none',
        backgroundColor: '#3b82f6',
        color: 'white',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '14px'
    },
    secondaryButton: {
        padding: '10px 24px',
        borderRadius: '8px',
        border: '1px solid #475569',
        backgroundColor: 'transparent',
        color: '#cbd5e1',
        cursor: 'pointer',
        fontWeight: '600',
        fontSize: '14px'
    },
    saveMainBtn: {
        padding: '10px 24px',
        borderRadius: '8px',
        border: 'none',
        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
        color: 'white',
        cursor: 'pointer',
        fontWeight: 'bold',
        fontSize: '14px',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
    },
    editableItem: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        padding: '20px',
        backgroundColor: '#0f172a',
        borderRadius: '12px',
        border: '1px solid #334155',
        gap: '20px'
    },
    answerText: {
        marginTop: '8px',
        padding: '10px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: '6px',
        fontSize: '14px',
        color: '#e2e8f0',
        fontStyle: 'italic'
    },
    feedbackText: {
        marginTop: '12px',
        padding: '12px',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderLeft: '3px solid #3b82f6',
        borderRadius: '0 6px 6px 0',
        color: '#cbd5e1',
        fontSize: '14px'
    },
    marksInputContainer: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '4px',
        minWidth: '80px'
    },
    marksInput: {
        width: '60px',
        padding: '8px',
        borderRadius: '6px',
        border: '1px solid #475569',
        backgroundColor: '#1e293b',
        color: '#f8fafc',
        fontWeight: 'bold',
        fontSize: '16px',
        textAlign: 'center'
    }
};

export default PreviousResult;
