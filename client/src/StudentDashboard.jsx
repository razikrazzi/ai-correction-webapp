// StudentDashboard.jsx
import React, { useState, useEffect } from 'react';
import api from '@/lib/api';

const StudentDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [marksData, setMarksData] = useState([]);
  const [correctedPapers, setCorrectedPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaper, setSelectedPaper] = useState(null);
  const [stats, setStats] = useState({
    totalPapers: 0,
    averageScore: 0,
    highestScore: 0,
    recentEvaluations: 0
  });

  // Fetch data from API
  useEffect(() => {
    const fetchStudentData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const userId = user.id || user._id;

        // In a real scenario, we might need a specific endpoint for "papers belonging to student"
        // regardless of who uploaded them, but currently we use the user's ID.
        // If the student uploaded them, this works. 
        // If the teacher uploaded them, they won't appear here unless the system links them.
        // For now, we assume the student sees papers linked to their account.
        const response = await api.get(`/api/papers/user/${userId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        const papers = response.data || [];

        // Transform API data to dashboard format
        // Transform API data to dashboard format
        const transformedMarks = papers.map((paper, index) => {
          const result = paper.analysisResults?.detailedAnalysis || {};
          const isGraded = result.obtainedMarks !== undefined && result.obtainedMarks !== null;

          let evalDate = 'Pending';
          if (isGraded) {
            const d = result.evaluatedAt || paper.updatedAt || paper.createdAt;
            if (d) try { evalDate = new Date(d).toISOString().split('T')[0]; } catch (e) { }
          }

          return {
            id: paper._id,
            subject: paper.subject,
            examType: 'Term Paper',
            totalMarks: paper.totalMarks || 100,
            obtainedMarks: isGraded ? result.obtainedMarks : 0,
            percentage: isGraded ? result.percentage : 0,
            grade: isGraded ? result.grade : 'Pending',
            evaluatedAt: evalDate,
            teacher: 'Instructor',
            feedback: result.overallFeedback || (isGraded ? 'Grading complete' : 'Pending Evaluation'),
            rank: null,
            totalStudents: null
          };
        }).filter(m => m.grade !== 'Pending');

        const transformedPapers = papers.map((paper, idx) => {
          const result = paper.analysisResults?.detailedAnalysis || {};
          const isGraded = result.obtainedMarks !== undefined && result.obtainedMarks !== null;

          let evalDate = 'Processing';
          const d = result.evaluatedAt || paper.updatedAt || paper.createdAt;
          if (d) try { evalDate = new Date(d).toISOString().split('T')[0]; } catch (e) { }

          return {
            id: paper._id,
            subject: paper.subject,
            paperTitle: paper.originalFileName,
            evaluatedAt: evalDate,
            downloadUrl: '#',
            previewUrl: '#',
            corrections: result.sections?.length > 0 ? result.sections.map((s, i) => ({
              question: s.sectionName || `Q${i + 1}`,
              comment: s.feedback,
              marks: s.obtainedMarks
            })) : [],
            overallFeedback: result.overallFeedback || paper.analysisResults?.overallFeedback || 'Assessment in progress'
          };
        });

        setMarksData(transformedMarks);
        setCorrectedPapers(transformedPapers);

        // Calculate stats
        const gradedPapers = transformedMarks;
        if (gradedPapers.length > 0) {
          const totalScore = gradedPapers.reduce((sum, m) => sum + m.percentage, 0);
          const average = totalScore / gradedPapers.length;
          const highest = Math.max(...gradedPapers.map(m => m.percentage));

          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          // Check date validity before comparison
          const recentCount = gradedPapers.filter(p => {
            const d = new Date(p.evaluatedAt);
            return !isNaN(d) && d > thirtyDaysAgo;
          }).length;

          setStats({
            totalPapers: papers.length,
            averageScore: average,
            highestScore: highest,
            recentEvaluations: recentCount
          });
        } else {
          setStats({
            totalPapers: papers.length,
            averageScore: 0,
            highestScore: 0,
            recentEvaluations: 0
          });
        }

      } catch (error) {
        console.error('Error fetching student dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStudentData();
  }, [user]);

  const getGradeColor = (grade) => {
    switch (grade) {
      case 'A+': return '#10b981';
      case 'A': return '#22c55e';
      case 'B+': return '#84cc16';
      case 'B': return '#eab308';
      case 'C+': return '#f59e0b';
      case 'C': return '#f97316';
      default: return '#6b7280';
    }
  };

  const handleViewPaper = (paper) => {
    setSelectedPaper(paper);
  };

  const handleClosePaperView = () => {
    setSelectedPaper(null);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p style={styles.loadingText}>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div style={styles.userInfo}>
            <div style={styles.avatar}>
              <span style={styles.avatarText}>
                {user.email.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h1 style={styles.welcomeTitle}>Welcome back, {user.email.split('@')[0]}!</h1>
              <p style={styles.welcomeSubtitle}>Student Dashboard - Track your academic progress</p>
            </div>
          </div>
          <div style={styles.headerActions}>
            <button style={styles.notificationButton}>
              <span style={styles.notificationIcon}>🔔</span>
              <span style={styles.notificationBadge}>3</span>
            </button>
            <button onClick={onLogout} style={styles.logoutButton}>
              <span style={styles.logoutIcon}>🚪</span>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>📊</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{stats.totalPapers}</div>
            <div style={styles.statLabel}>Total Papers</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>⭐</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{stats.averageScore.toFixed(1)}%</div>
            <div style={styles.statLabel}>Average Score</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🏆</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{stats.highestScore}%</div>
            <div style={styles.statLabel}>Highest Score</div>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statIcon}>🔄</div>
          <div style={styles.statContent}>
            <div style={styles.statValue}>{stats.recentEvaluations}</div>
            <div style={styles.statLabel}>Recent Evaluations</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={styles.tabContainer}>
        <div style={styles.tabs}>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'overview' && styles.tabActive)
            }}
            onClick={() => setActiveTab('overview')}
          >
            📋 Overview
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'marks' && styles.tabActive)
            }}
            onClick={() => setActiveTab('marks')}
          >
            📊 View Marks
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'papers' && styles.tabActive)
            }}
            onClick={() => setActiveTab('papers')}
          >
            📝 Corrected Papers
          </button>
          <button
            style={{
              ...styles.tab,
              ...(activeTab === 'performance' && styles.tabActive)
            }}
            onClick={() => setActiveTab('performance')}
          >
            📈 Performance Analysis
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main style={styles.mainContent}>
        {activeTab === 'overview' && (
          <div style={styles.overviewGrid}>
            {/* Recent Marks */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>📊 Recent Marks</h3>
                <button style={styles.viewAllButton}>View All</button>
              </div>
              <div style={styles.marksList}>
                {marksData.slice(0, 3).map((mark, index) => (
                  <div key={mark.id} style={styles.markItem}>
                    <div style={styles.markSubject}>
                      <div style={styles.subjectIcon}>
                        {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                      </div>
                      <div>
                        <div style={styles.subjectName}>{mark.subject}</div>
                        <div style={styles.examType}>{mark.examType}</div>
                      </div>
                    </div>
                    <div style={styles.markScore}>
                      <div style={{
                        ...styles.gradeBadge,
                        backgroundColor: getGradeColor(mark.grade)
                      }}>
                        {mark.grade}
                      </div>
                      <div style={styles.scoreText}>
                        {mark.obtainedMarks}/{mark.totalMarks}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Papers */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>📝 Recent Papers</h3>
                <button style={styles.viewAllButton}>View All</button>
              </div>
              <div style={styles.papersList}>
                {correctedPapers.map(paper => (
                  <div key={paper.id} style={styles.paperItem}>
                    <div style={styles.paperInfo}>
                      <div style={styles.paperIcon}>📄</div>
                      <div>
                        <div style={styles.paperTitle}>{paper.paperTitle}</div>
                        <div style={styles.paperMeta}>
                          <span>{paper.subject}</span>
                          <span>•</span>
                          <span>Evaluated: {paper.evaluatedAt}</span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleViewPaper(paper)}
                      style={styles.viewPaperButton}
                    >
                      View Corrections
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Performance Chart */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>📈 Performance Trend</h3>
              </div>
              <div style={styles.chartContainer}>
                <div style={styles.chartPlaceholder}>
                  <div style={styles.chartBars}>
                    {marksData.map((mark, index) => (
                      <div key={mark.id} style={styles.chartBarContainer}>
                        <div style={styles.chartBarLabel}>{mark.subject.substring(0, 3)}</div>
                        <div style={styles.chartBarTrack}>
                          <div
                            style={{
                              ...styles.chartBar,
                              height: `${mark.percentage}%`,
                              backgroundColor: getGradeColor(mark.grade)
                            }}
                          ></div>
                        </div>
                        <div style={styles.chartBarValue}>{mark.percentage}%</div>
                      </div>
                    ))}
                  </div>
                </div>
                <p style={styles.chartNote}>Your performance across different subjects</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div style={styles.sectionCard}>
              <div style={styles.sectionHeader}>
                <h3 style={styles.sectionTitle}>⚡ Quick Stats</h3>
              </div>
              <div style={styles.quickStats}>
                <div style={styles.quickStat}>
                  <div style={styles.quickStatIcon}>📚</div>
                  <div>
                    <div style={styles.quickStatValue}>5</div>
                    <div style={styles.quickStatLabel}>Subjects</div>
                  </div>
                </div>
                <div style={styles.quickStat}>
                  <div style={styles.quickStatIcon}>🎯</div>
                  <div>
                    <div style={styles.quickStatValue}>4</div>
                    <div style={styles.quickStatLabel}>A Grades</div>
                  </div>
                </div>
                <div style={styles.quickStat}>
                  <div style={styles.quickStatIcon}>📅</div>
                  <div>
                    <div style={styles.quickStatValue}>This Month</div>
                    <div style={styles.quickStatLabel}>Last Evaluation</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'marks' && (
          <div style={styles.marksTableContainer}>
            <div style={styles.tableHeader}>
              <h3 style={styles.sectionTitle}>All Marks & Grades</h3>
              <div style={styles.tableActions}>
                <button style={styles.exportButton}>📥 Export Report</button>
                <button style={styles.filterButton}>🔍 Filter</button>
              </div>
            </div>

            <div style={styles.marksTable}>
              <div style={styles.tableRowHeader}>
                <div style={styles.tableCell}>Subject</div>
                <div style={styles.tableCell}>Exam Type</div>
                <div style={styles.tableCell}>Total Marks</div>
                <div style={styles.tableCell}>Obtained</div>
                <div style={styles.tableCell}>Percentage</div>
                <div style={styles.tableCell}>Grade</div>
                <div style={styles.tableCell}>Rank</div>
                <div style={styles.tableCell}>Actions</div>
              </div>

              {marksData.map(mark => (
                <div key={mark.id} style={styles.tableRow}>
                  <div style={styles.tableCell}>
                    <div style={styles.subjectCell}>
                      <span style={styles.subjectIconSmall}>📘</span>
                      {mark.subject}
                    </div>
                  </div>
                  <div style={styles.tableCell}>{mark.examType}</div>
                  <div style={styles.tableCell}>{mark.totalMarks}</div>
                  <div style={styles.tableCell}>
                    <strong style={styles.obtainedMarks}>{mark.obtainedMarks}</strong>
                  </div>
                  <div style={styles.tableCell}>
                    <div style={styles.percentageCell}>
                      <div style={styles.percentageBarContainer}>
                        <div
                          style={{
                            ...styles.percentageBar,
                            width: `${mark.percentage}%`,
                            backgroundColor: getGradeColor(mark.grade)
                          }}
                        ></div>
                      </div>
                      <span style={styles.percentageText}>{mark.percentage}%</span>
                    </div>
                  </div>
                  <div style={styles.tableCell}>
                    <span style={{
                      ...styles.gradeTag,
                      backgroundColor: getGradeColor(mark.grade)
                    }}>
                      {mark.grade}
                    </span>
                  </div>
                  <div style={styles.tableCell}>
                    <div style={styles.rankCell}>
                      {mark.rank !== null ? (
                        <>
                          <span style={styles.rankNumber}>{mark.rank}</span>
                          <span style={styles.rankTotal}>/{mark.totalStudents}</span>
                        </>
                      ) : (
                        <span style={{ color: '#64748b', fontSize: '13px' }}>N/A</span>
                      )}
                    </div>
                  </div>
                  <div style={styles.tableCell}>
                    <button style={styles.detailsButton}>
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'papers' && (
          <div style={styles.papersGrid}>
            {correctedPapers.map(paper => (
              <div key={paper.id} style={styles.paperCard}>
                <div style={styles.paperCardHeader}>
                  <div style={styles.paperCardIcon}>📄</div>
                  <div style={styles.paperCardTitle}>
                    <h4>{paper.paperTitle}</h4>
                    <p style={styles.paperCardMeta}>
                      {paper.subject} • Evaluated on {paper.evaluatedAt}
                    </p>
                  </div>
                </div>

                <div style={styles.correctionsList}>
                  <h5 style={styles.correctionsTitle}>Question-wise Corrections:</h5>
                  {paper.corrections.map((correction, index) => (
                    <div key={index} style={styles.correctionItem}>
                      <div style={styles.correctionQuestion}>
                        <span style={styles.questionNumber}>{correction.question}</span>
                        <span style={styles.correctionMarks}>{correction.marks} marks</span>
                      </div>
                      <p style={styles.correctionComment}>{correction.comment}</p>
                    </div>
                  ))}
                </div>

                <div style={styles.overallFeedback}>
                  <h5 style={styles.feedbackTitle}>Overall Feedback:</h5>
                  <p style={styles.feedbackText}>{paper.overallFeedback}</p>
                </div>

                <div style={styles.paperActions}>
                  <button
                    style={styles.downloadPaperButton}
                    onClick={() => alert("Download feature coming soon")}
                  >
                    📥 Download Paper
                  </button>
                  <button
                    style={styles.viewCorrectionsButton}
                    onClick={() => handleViewPaper(paper)}
                  >
                    👁️ View Detailed Corrections
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'performance' && (
          <div style={styles.performanceContainer}>
            <div style={styles.performanceCard}>
              <h3 style={styles.sectionTitle}>📈 Detailed Performance Analysis</h3>
              <div style={styles.analysisGrid}>
                <div style={styles.analysisItem}>
                  <h4>📊 Subject-wise Performance</h4>
                  <div style={styles.subjectPerformance}>
                    {marksData.map(mark => (
                      <div key={mark.id} style={styles.subjectPerformanceItem}>
                        <div style={styles.subjectPerformanceHeader}>
                          <span>{mark.subject}</span>
                          <span>{mark.percentage}%</span>
                        </div>
                        <div style={styles.progressBar}>
                          <div
                            style={{
                              ...styles.progressFill,
                              width: `${mark.percentage}%`,
                              backgroundColor: getGradeColor(mark.grade)
                            }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={styles.analysisItem}>
                  <h4>🎯 Grade Distribution</h4>
                  <div style={styles.gradeDistribution}>
                    {['A+', 'A', 'B+', 'B', 'C+', 'C'].map(grade => {
                      const count = marksData.filter(m => m.grade === grade).length;
                      return (
                        <div key={grade} style={styles.gradeDistributionItem}>
                          <span style={styles.gradeLabel}>{grade}</span>
                          <div style={styles.gradeBarContainer}>
                            <div
                              style={{
                                ...styles.gradeBar,
                                width: `${(count / marksData.length) * 100}%`,
                                backgroundColor: getGradeColor(grade)
                              }}
                            ></div>
                          </div>
                          <span style={styles.gradeCount}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={styles.analysisItem}>
                  <h4>📅 Monthly Progress</h4>
                  <div style={styles.monthlyProgress}>
                    <p>Coming soon: Track your progress month by month</p>
                  </div>
                </div>

                <div style={styles.analysisItem}>
                  <h4>🎖️ Achievements</h4>
                  <div style={styles.achievements}>
                    <div style={styles.achievement}>
                      <span style={styles.achievementIcon}>🏆</span>
                      <div>
                        <strong>Top Performer</strong>
                        <small>Ranked #1 in Computer Science</small>
                      </div>
                    </div>
                    <div style={styles.achievement}>
                      <span style={styles.achievementIcon}>⚡</span>
                      <div>
                        <strong>Consistent Performer</strong>
                        <small>3 A+ grades this semester</small>
                      </div>
                    </div>
                    <div style={styles.achievement}>
                      <span style={styles.achievementIcon}>📈</span>
                      <div>
                        <strong>Most Improved</strong>
                        <small>15% improvement in Mathematics</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Paper Modal */}
      {selectedPaper && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{selectedPaper.paperTitle}</h3>
              <button onClick={handleClosePaperView} style={styles.modalClose}>
                ✕
              </button>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.modalSection}>
                <h4>Question-wise Corrections</h4>
                {selectedPaper.corrections.map((correction, index) => (
                  <div key={index} style={styles.modalCorrection}>
                    <div style={styles.modalCorrectionHeader}>
                      <strong>{correction.question}</strong>
                      <span style={styles.modalMarks}>{correction.marks} marks</span>
                    </div>
                    <p style={styles.modalComment}>{correction.comment}</p>
                  </div>
                ))}
              </div>

              <div style={styles.modalSection}>
                <h4>Teacher's Overall Feedback</h4>
                <p style={styles.modalFeedback}>{selectedPaper.overallFeedback}</p>
              </div>

              <div style={styles.modalActions}>
                <button style={styles.modalButton}>
                  📥 Download Corrected Paper
                </button>
                <button style={styles.modalButtonSecondary}>
                  📋 Request Re-evaluation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          © 2024 AI PaperCorrection Student Portal.
          Need help? Contact your teacher or support@aipapercorrection.com
        </p>
      </footer>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#ffffff',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#0f172a',
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid rgba(255, 255, 255, 0.1)',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    marginTop: '20px',
    color: '#cbd5e1',
    fontSize: '16px',
  },
  header: {
    padding: '24px 32px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  avatar: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: 'white',
  },
  welcomeTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: '0 0 4px 0',
  },
  welcomeSubtitle: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  notificationButton: {
    position: 'relative',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationIcon: {
    fontSize: '20px',
  },
  notificationBadge: {
    position: 'absolute',
    top: '-4px',
    right: '-4px',
    backgroundColor: '#ef4444',
    color: 'white',
    fontSize: '12px',
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButton: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#f87171',
    padding: '12px 24px',
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
  },
  logoutIcon: {
    fontSize: '16px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    padding: '24px 32px',
  },
  statCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  statIcon: {
    fontSize: '32px',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  statLabel: {
    fontSize: '14px',
    color: '#94a3b8',
  },
  tabContainer: {
    padding: '0 32px',
    marginBottom: '24px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    borderRadius: '12px',
    padding: '4px',
  },
  tab: {
    flex: 1,
    padding: '16px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
  },
  tabActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#3b82f6',
  },
  mainContent: {
    padding: '0 32px 32px',
  },
  overviewGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  sectionCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '24px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  viewAllButton: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#3b82f6',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  marksList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  markItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '12px',
  },
  markSubject: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  subjectIcon: {
    fontSize: '24px',
  },
  subjectName: {
    fontWeight: '500',
    fontSize: '14px',
  },
  examType: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  markScore: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
  },
  gradeBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  scoreText: {
    fontSize: '14px',
    fontWeight: '500',
  },
  papersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  paperItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '12px',
  },
  paperInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  paperIcon: {
    fontSize: '24px',
  },
  paperTitle: {
    fontWeight: '500',
    fontSize: '14px',
  },
  paperMeta: {
    fontSize: '12px',
    color: '#94a3b8',
    display: 'flex',
    gap: '8px',
  },
  viewPaperButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    color: '#3b82f6',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  chartContainer: {
    padding: '16px 0',
  },
  chartPlaceholder: {
    height: '200px',
    display: 'flex',
    alignItems: 'flex-end',
    gap: '24px',
    padding: '20px 0',
  },
  chartBars: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '20px',
    width: '100%',
    height: '100%',
  },
  chartBarContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
  },
  chartBarLabel: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  chartBarTrack: {
    width: '20px',
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
    position: 'relative',
    overflow: 'hidden',
  },
  chartBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: '4px',
    transition: 'height 0.3s ease',
  },
  chartBarValue: {
    fontSize: '12px',
    color: '#f8fafc',
    fontWeight: '500',
  },
  chartNote: {
    fontSize: '12px',
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: '16px',
  },
  quickStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '16px',
  },
  quickStat: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '12px',
  },
  quickStatIcon: {
    fontSize: '24px',
  },
  quickStatValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  quickStatLabel: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  marksTableContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '24px',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  tableActions: {
    display: 'flex',
    gap: '12px',
  },
  exportButton: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#10b981',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  filterButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    color: '#3b82f6',
    padding: '10px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  marksTable: {
    display: 'flex',
    flexDirection: 'column',
  },
  tableRowHeader: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    padding: '16px',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  tableRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(8, 1fr)',
    padding: '16px',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '8px',
    marginBottom: '8px',
    alignItems: 'center',
  },
  tableCell: {
    fontSize: '14px',
    color: '#f8fafc',
  },
  subjectCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  subjectIconSmall: {
    fontSize: '16px',
  },
  obtainedMarks: {
    color: '#3b82f6',
    fontSize: '16px',
  },
  percentageCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  percentageBarContainer: {
    flex: 1,
    height: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  percentageBar: {
    height: '100%',
    borderRadius: '4px',
  },
  percentageText: {
    fontSize: '14px',
    fontWeight: '500',
    minWidth: '40px',
  },
  gradeTag: {
    padding: '4px 12px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'inline-block',
  },
  rankCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  rankNumber: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#f8fafc',
  },
  rankTotal: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  detailsButton: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    color: '#3b82f6',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  papersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
  },
  paperCard: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '24px',
  },
  paperCardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  paperCardIcon: {
    fontSize: '32px',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    width: '60px',
    height: '60px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paperCardTitle: {
    flex: 1,
  },
  paperCardTitle: {
    flex: 1,
    '& h4': {
      margin: '0 0 8px 0',
      fontSize: '18px',
      fontWeight: '600',
    },
  },
  paperCardMeta: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
  },
  correctionsList: {
    marginBottom: '24px',
  },
  correctionsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 16px 0',
  },
  correctionItem: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '8px',
  },
  correctionQuestion: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  questionNumber: {
    fontWeight: '500',
    fontSize: '14px',
  },
  correctionMarks: {
    fontSize: '12px',
    color: '#3b82f6',
    fontWeight: '500',
  },
  correctionComment: {
    fontSize: '14px',
    color: '#cbd5e1',
    margin: 0,
    lineHeight: 1.5,
  },
  overallFeedback: {
    padding: '16px',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  feedbackTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 12px 0',
  },
  feedbackText: {
    fontSize: '14px',
    color: '#cbd5e1',
    margin: 0,
    lineHeight: 1.6,
  },
  paperActions: {
    display: 'flex',
    gap: '12px',
  },
  downloadPaperButton: {
    flex: 1,
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    color: '#3b82f6',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  viewCorrectionsButton: {
    flex: 1,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#10b981',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  performanceContainer: {
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '24px',
  },
  performanceCard: {
    '& h3': {
      marginBottom: '24px',
    },
  },
  analysisGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '24px',
  },
  analysisItem: {
    padding: '20px',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '12px',
  },
  analysisItem: {
    padding: '20px',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '12px',
    '& h4': {
      fontSize: '16px',
      fontWeight: '600',
      margin: '0 0 16px 0',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
  },
  subjectPerformance: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  subjectPerformanceItem: {
    '&:not(:last-child)': {
      marginBottom: '12px',
    },
  },
  subjectPerformanceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
  },
  progressBar: {
    height: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
  },
  gradeDistribution: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  gradeDistributionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  gradeLabel: {
    width: '30px',
    fontSize: '12px',
    fontWeight: 'bold',
  },
  gradeBarContainer: {
    flex: 1,
    height: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  gradeBar: {
    height: '100%',
  },
  gradeCount: {
    width: '20px',
    fontSize: '12px',
    textAlign: 'right',
  },
  monthlyProgress: {
    height: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    '& p': {
      color: '#94a3b8',
      fontSize: '14px',
    },
  },
  achievements: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  achievement: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
  },
  achievementIcon: {
    fontSize: '24px',
  },
  achievement: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    '& div': {
      '& strong': {
        display: 'block',
        fontSize: '14px',
        fontWeight: '500',
      },
      '& small': {
        fontSize: '12px',
        color: '#94a3b8',
      },
    },
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(10px)',
    zIndex: 1000,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '24px',
    width: '90%',
    maxWidth: '800px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: '600',
    margin: 0,
  },
  modalClose: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: '24px',
    cursor: 'pointer',
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    '&:hover': {
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
  },
  modalBody: {
    padding: '24px',
  },
  modalSection: {
    marginBottom: '32px',
  },
  modalSection: {
    marginBottom: '32px',
    '& h4': {
      fontSize: '16px',
      fontWeight: '600',
      margin: '0 0 16px 0',
    },
  },
  modalCorrection: {
    padding: '16px',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '8px',
    marginBottom: '12px',
  },
  modalCorrectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  modalMarks: {
    fontSize: '14px',
    color: '#3b82f6',
    fontWeight: '500',
  },
  modalComment: {
    fontSize: '14px',
    color: '#cbd5e1',
    margin: 0,
    lineHeight: 1.6,
  },
  modalFeedback: {
    fontSize: '14px',
    color: '#cbd5e1',
    lineHeight: 1.6,
    padding: '16px',
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    borderRadius: '8px',
  },
  modalActions: {
    display: 'flex',
    gap: '16px',
    marginTop: '32px',
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#3b82f6',
    border: 'none',
    color: 'white',
    padding: '16px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  modalButtonSecondary: {
    flex: 1,
    backgroundColor: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#cbd5e1',
    padding: '16px',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  footer: {
    padding: '24px 32px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '14px',
    color: '#94a3b8',
    margin: 0,
  },
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  * {
    box-sizing: border-box;
  }
  
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  button {
    font-family: inherit;
    cursor: pointer;
  }
  
  button:hover {
    opacity: 0.9;
  }
`;
document.head.appendChild(styleSheet);

export default StudentDashboard;
