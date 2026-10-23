import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import LoadingSpinner from '../../components/LoadingSpinner';
import AlertMessage from '../../components/AlertMessage';
import {
  Users,
  Layers,
  Calendar,
  Clock,
  Video,
  FileCheck2,
  ChevronRight,
  Edit3,
  CheckCircle,
  XCircle,
  History,
  AlertCircle,
  Search,
  Download,
  FileSpreadsheet,
  UserCheck,
  Percent,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';

const CandidatesPipeline = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDriveId = searchParams.get('driveId') || '';

  const [drives, setDrives] = useState([]);
  const [selectedDriveId, setSelectedDriveId] = useState(initialDriveId);
  const [currentDrive, setCurrentDrive] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [stageCounts, setStageCounts] = useState({});
  const [totalCandidatesCount, setTotalCandidatesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [minPercentageFilter, setMinPercentageFilter] = useState('');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Multi-selection & Bulk Advancement
  const [selectedCandidates, setSelectedCandidates] = useState([]);
  const [advancingGD, setAdvancingGD] = useState(false);

  // Update Stage / Evaluation Modal
  const [activeCandidate, setActiveCandidate] = useState(null);
  const [modalForm, setModalForm] = useState({
    stageName: '',
    status: 'scheduled',
    overallStatus: 'shortlisted',
    interviewDate: '',
    interviewTime: '',
    locationOrLink: '',
    score: '',
    remarks: '',
    candidateNotes: '',
    reason: '',
  });
  const [savingEvaluation, setSavingEvaluation] = useState(false);

  // Transition History Modal
  const [historyCandidate, setHistoryCandidate] = useState(null);

  // Fetch all drives for dropdown
  useEffect(() => {
    const fetchDrives = async () => {
      try {
        const res = await axiosClient.get('/drives', { params: { limit: 100 } });
        if (res.data.success && res.data.drives.length > 0) {
          setDrives(res.data.drives);
          if (!selectedDriveId) {
            setSelectedDriveId(res.data.drives[0]._id);
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load drives');
      }
    };
    fetchDrives();
  }, []);

  // Fetch candidates for selected drive
  const fetchCandidates = async () => {
    if (!selectedDriveId) return;
    try {
      setLoading(true);
      const res = await axiosClient.get(`/candidates/drive/${selectedDriveId}`, {
        params: {
          stage: stageFilter,
          status: statusFilter,
          search,
          minPercentage: minPercentageFilter,
        },
      });
      if (res.data.success) {
        setCurrentDrive(res.data.drive);
        setCandidates(res.data.candidates);
        if (res.data.stageCounts) {
          setStageCounts(res.data.stageCounts);
        }
        if (res.data.totalCandidates !== undefined) {
          setTotalCandidatesCount(res.data.totalCandidates);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load candidates pipeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDriveId) {
      setSearchParams({ driveId: selectedDriveId });
    }
  }, [selectedDriveId]);

  useEffect(() => {
    if (!selectedDriveId) return;

    const timer = setTimeout(() => {
      fetchCandidates();
      setSelectedCandidates([]);
    }, 300);

    return () => clearTimeout(timer);
  }, [selectedDriveId, stageFilter, statusFilter, minPercentageFilter, search]);


  const stagesList = currentDrive?.stages || [
    'Examination',
    'Group Discussion (GD)',
    'Technical Interview',
    'HR Interview',
    'CEO Interview',
    'Selected or Rejected',
  ];

  const gdStageName =
    stagesList.find((s) => s.toLowerCase().includes('gd') || s.toLowerCase().includes('group discussion')) ||
    stagesList[1] ||
    'Group Discussion (GD)';

  const currentStageIndex = stageFilter ? stagesList.indexOf(stageFilter) : 0;
  const nextStageIndex = currentStageIndex >= 0 && currentStageIndex + 1 < stagesList.length ? currentStageIndex + 1 : 1;
  const nextStageName = stagesList[nextStageIndex] || 'Group Discussion (GD)';


  // Multi-select handlers
  const handleToggleSelect = (studentId) => {
    if (!studentId) return;
    setSelectedCandidates((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    if (selectedCandidates.length === candidates.length && candidates.length > 0) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(candidates.map((c) => c.student?._id).filter(Boolean));
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('');
    setMinPercentageFilter('');
    setStageFilter('');
  };

  // Export to Excel / CSV with UTF-8 BOM
  const handleExportToExcel = () => {
    if (!candidates || candidates.length === 0) {
      setError('No candidate data available to export with the current filters.');
      return;
    }

    const headers = [
      'Candidate Name',
      'Email',
      'Phone',
      'College',
      'Degree / Department',
      'Graduation Year',
      'Current Stage',
      'Overall Status',
      'Exam Score',
      'Total Marks',
      'Exam Percentage (%)',
      'Round Evaluation Status',
      'Interview Date',
      'Interview Time',
      'Meeting Link / Location',
      'Evaluation Score',
      'Admin Remarks',
      'Candidate Notes',
    ];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = candidates.map((cand) => {
      const s = cand.student || {};
      const p = s.profile || {};
      const attempt = cand.examAttempt || {};
      const currEval = cand.roundEvaluations?.find((r) => r.stageName === cand.currentStage) || {};

      return [
        escapeCSV(s.name || ''),
        escapeCSV(s.email || ''),
        escapeCSV(s.phone || p.phone || ''),
        escapeCSV(p.college || ''),
        escapeCSV(p.department || p.degree || ''),
        escapeCSV(p.graduationYear || ''),
        escapeCSV(cand.currentStage || ''),
        escapeCSV(cand.overallStatus || ''),
        escapeCSV(attempt.score !== undefined ? attempt.score : ''),
        escapeCSV(attempt.totalMarks !== undefined ? attempt.totalMarks : ''),
        escapeCSV(attempt.percentage !== undefined ? `${attempt.percentage}%` : ''),
        escapeCSV(currEval.status || ''),
        escapeCSV(currEval.interviewDate ? new Date(currEval.interviewDate).toLocaleDateString() : ''),
        escapeCSV(currEval.interviewTime || ''),
        escapeCSV(currEval.locationOrLink || ''),
        escapeCSV(currEval.score !== null && currEval.score !== undefined ? currEval.score : ''),
        escapeCSV(currEval.remarks || ''),
        escapeCSV(currEval.candidateNotes || ''),
      ].join(',');
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const stageSlug = stageFilter ? stageFilter.replace(/[^a-zA-Z0-9]/g, '_') : 'All_Stages';
    const driveCodeSlug = currentDrive?.driveCode || 'Recruitment';
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('href', url);
    link.setAttribute('download', `${driveCodeSlug}_${stageSlug}_Candidates_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Bulk / Direct Advance to Next Stage
  const handleAdvanceToStage = async (specificIds = null, candidateName = null, targetStage = nextStageName) => {
    let ids = specificIds;
    if (!ids) {
      if (selectedCandidates.length > 0) {
        ids = selectedCandidates;
      } else {
        // Auto-target shortlisted candidates who are not yet at the target stage
        const shortlisted = candidates.filter((c) => c.overallStatus === 'shortlisted' && c.currentStage !== targetStage);
        if (shortlisted.length > 0) {
          ids = shortlisted.map((c) => c.student?._id).filter(Boolean);
        } else {
          ids = candidates.filter((c) => c.currentStage !== targetStage).map((c) => c.student?._id).filter(Boolean);
        }
      }
    }

    if (!ids || ids.length === 0) {
      setError(`Please select candidate(s) to advance to ${targetStage}.`);
      return;
    }

    const confirmMsg = candidateName
      ? `Advance candidate "${candidateName}" to ${targetStage}?`
      : `Are you sure you want to advance ${ids.length} candidate(s) to ${targetStage}?`;

    if (!window.confirm(confirmMsg)) {
      return;
    }

    try {
      setAdvancingGD(true);
      setError('');
      const res = await axiosClient.post('/candidates/bulk-advance', {
        driveId: selectedDriveId,
        studentIds: ids,
        targetStage: targetStage,
        reason: `Shortlisted and advanced to ${targetStage} round`,
      });

      if (res.data.success) {
        setSuccess(res.data.message || `Successfully advanced ${res.data.updatedCount || ids.length} candidate(s) to ${targetStage}`);
        setSelectedCandidates([]);
        fetchCandidates();
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to advance candidate(s) to ${targetStage}`);
    } finally {
      setAdvancingGD(false);
    }
  };


  const handleOpenEvaluationModal = (candidate) => {
    setActiveCandidate(candidate);
    const activeEval = candidate.roundEvaluations?.find((r) => r.stageName === candidate.currentStage) || {};

    setModalForm({
      stageName: candidate.currentStage,
      status: activeEval.status || 'scheduled',
      overallStatus: candidate.overallStatus || 'shortlisted',
      interviewDate: activeEval.interviewDate ? new Date(activeEval.interviewDate).toISOString().split('T')[0] : '',
      interviewTime: activeEval.interviewTime || '',
      locationOrLink: activeEval.locationOrLink || '',
      score: activeEval.score !== null && activeEval.score !== undefined ? String(activeEval.score) : '',
      remarks: activeEval.remarks || '',
      candidateNotes: activeEval.candidateNotes || '',
      reason: `Evaluated for ${candidate.currentStage}`,
    });
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!activeCandidate) return;

    try {
      setSavingEvaluation(true);
      setError('');
      const res = await axiosClient.put('/candidates/update-stage', {
        driveId: selectedDriveId,
        studentId: activeCandidate.student?._id,
        ...modalForm,
      });

      if (res.data.success) {
        setSuccess('Candidate stage evaluation & schedule updated successfully');
        setActiveCandidate(null);
        fetchCandidates();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update candidate progression');
    } finally {
      setSavingEvaluation(false);
    }
  };


  return (
    <div className="container py-4">
      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
        <div>
          <h2 className="fw-bold mb-1">Recruitment Pipeline & Candidate Progression</h2>
          <p className="text-muted small mb-0">Manage multi-round candidate advancement, schedules, scores, and status</p>
        </div>

        {/* Drive Selector */}
        <div style={{ minWidth: 260 }}>
          <select
            className="form-select fw-semibold border-primary"
            value={selectedDriveId}
            onChange={(e) => setSelectedDriveId(e.target.value)}
          >
            {drives.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name} ({d.driveCode})
              </option>
            ))}
          </select>
        </div>
      </div>

      <AlertMessage message={error} onClose={() => setError('')} type="danger" />
      <AlertMessage message={success} onClose={() => setSuccess('')} type="success" />

      {/* Pipeline Stages Navigation Pills & Stage Export */}
      <div className="card custom-card p-3 mb-4">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="d-flex flex-wrap align-items-center gap-2 overflow-auto py-1">
            <button
              type="button"
              className={`btn btn-sm ${stageFilter === '' ? 'btn-primary-custom' : 'btn-outline-custom'}`}
              onClick={() => setStageFilter('')}
            >
              All Stages ({totalCandidatesCount || candidates.length})
            </button>
            {stagesList.map((stageName, idx) => {
              const count = stageCounts[stageName] !== undefined ? stageCounts[stageName] : 0;
              const isCurrent = stageFilter === stageName;
              return (
                <button
                  key={idx}
                  type="button"
                  className={`btn btn-sm d-flex align-items-center gap-1 ${
                    isCurrent ? 'btn-primary-custom' : 'btn-outline-custom'
                  }`}
                  onClick={() => setStageFilter(stageName)}
                >
                  <span>{stageName}</span>
                  <span className={`badge ${isCurrent ? 'bg-white text-primary' : 'bg-light text-dark'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="btn btn-sm btn-outline-success d-flex align-items-center gap-1 text-nowrap ms-auto shadow-sm"
            onClick={handleExportToExcel}
            disabled={candidates.length === 0}
            title="Export current stage candidates to Excel"
          >
            <FileSpreadsheet size={15} />
            <span>Export Stage to Excel</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar (Filter button removed, instant reactive filtering with manual percentage input) */}
      <div className="row g-3 align-items-center mb-4">
        <div className="col-md-5">
          <div className="input-group">
            <span className="input-group-text bg-light border-end-0">
              <Search size={16} className="text-muted" />
            </span>
            <input
              type="text"
              className="form-control border-start-0"
              placeholder="Search candidate name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="btn btn-outline-secondary border-start-0"
                onClick={() => setSearch('')}
                title="Clear search"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        <div className="col-md-3">
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="selected">Selected</option>
            <option value="pending">Pending</option>
            <option value="on-hold">On Hold</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="col-md-3">
          <div className="input-group">
            <span className="input-group-text bg-light text-muted" title="Minimum Exam Percentage Cutoff">
              <Percent size={15} />
            </span>
            <input
              type="number"
              min="0"
              max="100"
              step="any"
              className="form-control"
              placeholder="Min % cutoff (e.g. 60)"
              value={minPercentageFilter}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '' || (Number(val) >= 0 && Number(val) <= 100)) {
                  setMinPercentageFilter(val);
                }
              }}
            />
            {minPercentageFilter && (
              <button
                type="button"
                className="btn btn-outline-secondary border-start-0"
                onClick={() => setMinPercentageFilter('')}
                title="Clear percentage cutoff"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        <div className="col-md-1">
          <button
            type="button"
            className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center"
            onClick={handleResetFilters}
            disabled={!search && !statusFilter && !minPercentageFilter && !stageFilter}
            title="Reset all filters"
            style={{ height: '38px' }}
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>


      {/* Batch Actions & Next Stage Advancement Bar */}
      <div className="card custom-card p-3 mb-4 bg-light border-0 shadow-sm">
        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="form-check d-flex align-items-center gap-2 mb-0">
              <input
                type="checkbox"
                className="form-check-input"
                id="selectAllCandidates"
                checked={candidates.length > 0 && selectedCandidates.length === candidates.length}
                onChange={handleSelectAll}
                style={{ cursor: 'pointer', width: 18, height: 18 }}
              />
              <label className="form-check-label small fw-semibold cursor-pointer mb-0" htmlFor="selectAllCandidates">
                Select All ({candidates.length})
              </label>
            </div>
            {selectedCandidates.length > 0 && (
              <span className="badge bg-primary text-white fw-medium px-2 py-1">
                {selectedCandidates.length} Selected
              </span>
            )}
            {minPercentageFilter && (
              <span className="badge bg-info-subtle text-info fw-medium px-2 py-1">
                Cutoff &ge; {minPercentageFilter}%
              </span>
            )}
            {stageFilter && (
              <span className="badge bg-secondary-subtle text-secondary fw-medium px-2 py-1">
                Stage: {stageFilter}
              </span>
            )}
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-success d-flex align-items-center gap-1 bg-white shadow-sm"
              onClick={handleExportToExcel}
              disabled={candidates.length === 0}
              title="Download Excel/CSV of current filtered candidates"
            >
              <FileSpreadsheet size={15} />
              <span>Export to Excel ({candidates.length})</span>
            </button>

            <button
              type="button"
              className="btn btn-sm btn-success d-flex align-items-center gap-1 shadow-sm text-white"
              onClick={() => handleAdvanceToStage(null, null, nextStageName)}
              disabled={advancingGD || candidates.length === 0}
              title={`Advance candidates to ${nextStageName}`}
            >
              <UserCheck size={15} />
              <span>
                {advancingGD
                  ? `Advancing to ${nextStageName}...`
                  : selectedCandidates.length > 0
                  ? `Advance Selected (${selectedCandidates.length}) to ${nextStageName}`
                  : `Advance Shortlisted to ${nextStageName}`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Candidates List / Grid */}
      {loading ? (
        <LoadingSpinner text="Loading candidate progression..." />
      ) : candidates.length === 0 ? (
        <div className="card custom-card text-center py-5">
          <p className="text-muted mb-0">No candidates found matching the selected stage and filters.</p>
        </div>
      ) : (
        <div className="d-flex flex-column gap-3">
          {candidates.map((cand) => {
            const student = cand.student;
            const attempt = cand.examAttempt;
            const activeViewStage = stageFilter || cand.currentStage;
            const stageEval =
              cand.roundEvaluations?.find((r) => r.stageName === activeViewStage) ||
              cand.roundEvaluations?.find((r) => r.stageName === cand.currentStage);
            const isSelected = selectedCandidates.includes(student?._id);
            const isCurrentStageDifferent = stageFilter && stageFilter !== cand.currentStage;
            const canAdvance = cand.currentStage !== nextStageName;

            return (
              <div
                key={cand._id}
                className={`card custom-card p-4 transition-all ${
                  isSelected ? 'border-primary shadow-sm bg-primary-subtle bg-opacity-10' : ''
                }`}
              >
                <div className="row align-items-center g-3">
                  <div className="col-lg-4">
                    <div className="d-flex align-items-center gap-3">
                      <div className="form-check d-flex align-items-center mb-0">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(student?._id)}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                      </div>
                      <div
                        className="bg-primary-subtle text-primary fw-bold rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 44, height: 44 }}
                      >
                        {student?.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <h6 className="fw-bold mb-0 text-dark">{student?.name}</h6>
                        <div className="text-muted small">{student?.email}</div>
                        <div className="text-muted small">
                          {student?.profile?.college || 'Candidate'} | Grad: {student?.profile?.graduationYear || '-'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stage & Status */}
                  <div className="col-lg-3">
                    <div className="d-flex flex-column gap-1">
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span className="small text-muted">Current Round:</span>
                        <span className="badge bg-primary text-white fw-semibold">
                          {cand.currentStage}
                        </span>
                        {isCurrentStageDifferent && (
                          <span className="badge bg-success-subtle text-success border border-success small py-1">
                            <ArrowRight size={11} className="me-1" />
                            Advanced
                          </span>
                        )}
                      </div>
                      <div className="d-flex align-items-center gap-2 flex-wrap">
                        <span className="small text-muted">Status:</span>
                        <span className={`badge-custom badge-${cand.overallStatus}`}>
                          {cand.overallStatus}
                        </span>
                        {stageEval?.status && stageEval.status !== cand.overallStatus && (
                          <span className="badge bg-light text-secondary border small">
                            {activeViewStage}: {stageEval.status}
                          </span>
                        )}
                      </div>
                      {attempt && (
                        <div className="small d-flex align-items-center gap-2 mt-1">
                          <span className="text-muted">Exam:</span>
                          <strong>{attempt.score}/{attempt.totalMarks}</strong>
                          <span
                            className={`badge ${
                              attempt.percentage >= 70
                                ? 'bg-success text-white'
                                : attempt.percentage >= 50
                                ? 'bg-primary text-white'
                                : 'bg-secondary text-white'
                            }`}
                          >
                            {attempt.percentage}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interview Schedule Info */}
                  <div className="col-lg-2">
                    {stageEval?.interviewDate ? (
                      <div className="small">
                        <div className="text-muted d-flex align-items-center gap-1">
                          <Calendar size={13} /> {new Date(stageEval.interviewDate).toLocaleDateString()}
                        </div>
                        {stageEval.interviewTime && (
                          <div className="text-muted d-flex align-items-center gap-1">
                            <Clock size={13} /> {stageEval.interviewTime}
                          </div>
                        )}
                        {stageEval.locationOrLink && (
                          <a
                            href={stageEval.locationOrLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary d-flex align-items-center gap-1 text-truncate"
                            style={{ maxWidth: 140 }}
                          >
                            <Video size={13} /> Meet Link
                          </a>
                        )}
                      </div>
                    ) : (
                      <span className="small text-muted">No schedule set</span>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="col-lg-3 text-lg-end">
                    <div className="d-flex flex-wrap justify-content-lg-end gap-2">
                      {canAdvance ? (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-success d-flex align-items-center gap-1"
                          title={`Directly advance ${student?.name} to ${nextStageName}`}
                          onClick={() => handleAdvanceToStage([student?._id], student?.name, nextStageName)}
                          disabled={advancingGD}
                        >
                          <UserCheck size={14} /> Advance to {nextStageName.includes('(') ? nextStageName.split('(')[1].replace(')', '') : nextStageName}
                        </button>
                      ) : (
                        <span className="badge bg-success-subtle text-success border border-success p-2 d-inline-flex align-items-center gap-1">
                          <CheckCircle size={13} /> In {cand.currentStage}
                        </span>
                      )}
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-custom"
                        title="View Transition History"
                        onClick={() => setHistoryCandidate(cand)}
                      >
                        <History size={14} /> History
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary-custom d-flex align-items-center gap-1"
                        onClick={() => handleOpenEvaluationModal(cand)}
                      >
                        <Edit3 size={14} /> Manage Round
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}


      {/* Stage Evaluation & Interview Scheduling Modal */}
      {activeCandidate && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <div>
                  <h5 className="modal-title fw-bold">Candidate Progression: {activeCandidate.student?.name}</h5>
                  <div className="text-muted small">Update round stage, interview schedule, and evaluation</div>
                </div>
                <button type="button" className="btn-close" onClick={() => setActiveCandidate(null)}></button>
              </div>

              <form onSubmit={handleModalSubmit}>
                <div className="modal-body p-4">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Target Stage / Round *</label>
                      <select
                        className="form-select"
                        value={modalForm.stageName}
                        onChange={(e) => setModalForm({ ...modalForm, stageName: e.target.value })}
                        required
                      >
                        {stagesList.map((stg, i) => (
                          <option key={i} value={stg}>
                            {i + 1}. {stg}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label small fw-semibold">Overall Candidate Status *</label>
                      <select
                        className="form-select"
                        value={modalForm.overallStatus}
                        onChange={(e) => setModalForm({ ...modalForm, overallStatus: e.target.value })}
                        required
                      >
                        <option value="shortlisted">Shortlisted</option>
                        <option value="pending">Pending</option>
                        <option value="on-hold">On Hold</option>
                        <option value="selected">Selected (Offer Candidate)</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Round Status</label>
                      <select
                        className="form-select"
                        value={modalForm.status}
                        onChange={(e) => setModalForm({ ...modalForm, status: e.target.value })}
                      >
                        <option value="scheduled">Scheduled</option>
                        <option value="cleared">Cleared</option>
                        <option value="pending">Pending</option>
                        <option value="on-hold">On Hold</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Interview Date</label>
                      <input
                        type="date"
                        className="form-control"
                        value={modalForm.interviewDate}
                        onChange={(e) => setModalForm({ ...modalForm, interviewDate: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Interview Time</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. 10:30 AM EST"
                        value={modalForm.interviewTime}
                        onChange={(e) => setModalForm({ ...modalForm, interviewTime: e.target.value })}
                      />
                    </div>

                    <div className="col-md-8">
                      <label className="form-label small fw-semibold">Meeting URL / Room Location</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="https://meet.google.com/xyz or Office Room 402"
                        value={modalForm.locationOrLink}
                        onChange={(e) => setModalForm({ ...modalForm, locationOrLink: e.target.value })}
                      />
                    </div>

                    <div className="col-md-4">
                      <label className="form-label small fw-semibold">Evaluation Score (Optional)</label>
                      <input
                        type="number"
                        step="0.5"
                        className="form-control"
                        placeholder="e.g. 8.5"
                        value={modalForm.score}
                        onChange={(e) => setModalForm({ ...modalForm, score: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold">Candidate Notes (Visible to Student)</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Instructions or preparation guidance for candidate..."
                        value={modalForm.candidateNotes}
                        onChange={(e) => setModalForm({ ...modalForm, candidateNotes: e.target.value })}
                      />
                    </div>

                    <div className="col-12">
                      <label className="form-label small fw-semibold text-danger">
                        Internal Admin Remarks (Hidden from Student)
                      </label>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="Private recruiter evaluation notes, feedback, and technical impressions..."
                        value={modalForm.remarks}
                        onChange={(e) => setModalForm({ ...modalForm, remarks: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn btn-light" onClick={() => setActiveCandidate(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary-custom" disabled={savingEvaluation}>
                    {savingEvaluation ? 'Saving Progression...' : 'Save Stage Progression'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Stage Transition History Modal */}
      {historyCandidate && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content border-0 shadow">
              <div className="modal-header">
                <h5 className="modal-title fw-bold">Stage Transition History: {historyCandidate.student?.name}</h5>
                <button type="button" className="btn-close" onClick={() => setHistoryCandidate(null)}></button>
              </div>
              <div className="modal-body p-4">
                {historyCandidate.stageHistory?.length === 0 ? (
                  <p className="text-muted small">No stage transitions recorded yet.</p>
                ) : (
                  <div className="list-group">
                    {historyCandidate.stageHistory.map((hist, idx) => (
                      <div key={idx} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <span className="badge bg-secondary-subtle text-secondary small">{hist.fromStage} &rarr; {hist.toStage}</span>
                            <span className="badge-custom badge-shortlisted">{hist.status}</span>
                          </div>
                          <div className="small text-muted">{hist.reason || 'Stage progression update'}</div>
                        </div>
                        <div className="text-muted small text-nowrap">
                          {new Date(hist.changedAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-light" onClick={() => setHistoryCandidate(null)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CandidatesPipeline;
