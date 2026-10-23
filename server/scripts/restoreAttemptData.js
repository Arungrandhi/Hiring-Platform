const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../src/models/User');
const Subject = require('../src/models/Subject');
const RecruitmentDrive = require('../src/models/RecruitmentDrive');
const QuestionPaper = require('../src/models/QuestionPaper');
const ExamAttempt = require('../src/models/ExamAttempt');
const CandidateProgress = require('../src/models/CandidateProgress');
const DriveRegistration = require('../src/models/DriveRegistration');

const buildMultiPaperSnapshot = (drive, papers) => {
  const allQuestions = [];
  const papersSummary = [];
  let globalOrder = 1;
  let totalMarks = 0;

  (papers || []).forEach((paper) => {
    if (paper) {
      papersSummary.push({
        _id: paper._id,
        title: paper.title,
        subjectName: paper.subject?.name || 'General',
        subjectCode: paper.subject?.code || '',
        questionCount: paper.questions ? paper.questions.length : 0,
        totalMarks: paper.totalMarks || 0,
      });

      (paper.questions || []).forEach((q) => {
        const qMarks = Number(q.marks) || 1;
        totalMarks += qMarks;
        const negMarks =
          Number(q.negativeMarks) !== undefined && Number(q.negativeMarks) > 0
            ? Number(q.negativeMarks)
            : (paper.negativeMarking?.enabled ? (paper.negativeMarking.perQuestionPenalty || 0) : 0);

        allQuestions.push({
          _id: q._id,
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          marks: qMarks,
          negativeMarks: negMarks,
          order: globalOrder++,
          paperId: paper._id,
          paperTitle: paper.title,
          subjectName: paper.subject?.name || 'General',
          subjectCode: paper.subject?.code || '',
          explanation: q.explanation || '',
        });
      });
    }
  });

  const passingPercentage = drive.passingCriteria?.minPercentage || 50;
  const passingMarks = drive.passingCriteria?.minMarks || Math.ceil((totalMarks * passingPercentage) / 100);

  const title =
    papers.length > 1
      ? drive.name || papers.map((p) => p.title).join(' & ')
      : papers[0]?.title || drive.name || 'Examination';

  return {
    title,
    duration: drive.totalDuration || 30,
    totalMarks,
    passingMarks,
    negativeMarking: {
      enabled: papers.some((p) => p.negativeMarking?.enabled),
      perQuestionPenalty: papers[0]?.negativeMarking?.perQuestionPenalty || 0,
    },
    papers: papersSummary,
    questions: allQuestions,
  };
};

async function restoreData() {
  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    'mongodb+srv://arungrandhi:ARUN123@cluster0.k1xoqch.mongodb.net/Hiring-Platform?retryWrites=true&w=majority&appName=Cluster0';
  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB at', mongoUri);

  // Fetch all drives and papers
  const drives = await RecruitmentDrive.find({}).lean();
  const papers = await QuestionPaper.find({}).populate('subject').lean();
  const paperMap = new Map(papers.map((p) => [String(p._id), p]));

  // Restore 1: Parameswara in SSS-DRIVE-2026
  // Attempt ID: 6ad05958a943a61b83d25049
  const drive2026 = drives.find((d) => String(d._id) === '6ad05903a943a61b83d24ffb');
  const drive2027 = drives.find((d) => String(d._id) === '6ad05a84a943a61b83d2523e');
  const driveSaanvika2026 = drives.find((d) => String(d._id) === '6acf66730fff558eae8a8411');

  const papers2026 = (drive2026.selectedPapers || []).map((id) => paperMap.get(String(id))).filter(Boolean);
  const snapshot2026 = buildMultiPaperSnapshot(drive2026, papers2026);

  const papers2027 = (drive2027.selectedPapers || []).map((id) => paperMap.get(String(id))).filter(Boolean);
  const snapshot2027 = buildMultiPaperSnapshot(drive2027, papers2027);

  const papersSaanvika = (driveSaanvika2026.selectedPapers || []).map((id) => paperMap.get(String(id))).filter(Boolean);
  const snapshotSaanvika = buildMultiPaperSnapshot(driveSaanvika2026, papersSaanvika);

  const paraId = '6ad05946a943a61b83d25015';
  const saiId = '6ad06cb86c18170cfea505ce';
  const alexId = '6acf66730fff558eae8a840d';

  // 1. Parameswara on SSS-DRIVE-2026
  const attemptPara2026 = {
    _id: new mongoose.Types.ObjectId('6ad05958a943a61b83d25049'),
    student: new mongoose.Types.ObjectId(paraId),
    drive: new mongoose.Types.ObjectId('6ad05903a943a61b83d24ffb'),
    questionPapers: drive2026.selectedPapers,
    paperSnapshot: snapshot2026,
    attemptNumber: 1,
    startTime: new Date('2026-10-15T04:40:56.923Z'),
    deadline: new Date('2026-10-15T05:10:56.923Z'),
    submittedAt: new Date('2026-10-15T04:41:18.263Z'),
    submissionStatus: 'submitted',
    score: 4,
    totalMarks: 4,
    percentage: 100,
    isPassed: true,
    answers: snapshot2026.questions.slice(0, 2).map((q) => ({
      questionId: q._id,
      selectedOption: q.correctAnswer,
      answeredAt: new Date('2026-10-15T04:41:10.000Z'),
    })),
  };

  // 2. Parameswara on SSS-DRIVE-2027
  const attemptPara2027 = {
    _id: new mongoose.Types.ObjectId('6ad05a98a943a61b83d2527c'),
    student: new mongoose.Types.ObjectId(paraId),
    drive: new mongoose.Types.ObjectId('6ad05a84a943a61b83d2523e'),
    questionPapers: drive2027.selectedPapers,
    paperSnapshot: snapshot2027,
    attemptNumber: 1,
    startTime: new Date('2026-10-15T04:46:16.389Z'),
    deadline: new Date('2026-10-15T05:16:16.389Z'),
    submittedAt: new Date('2026-10-15T05:02:23.707Z'),
    submissionStatus: 'submitted',
    score: 2.5,
    totalMarks: 7,
    percentage: 35.71,
    isPassed: false,
    answers: snapshot2027.questions.map((q, idx) => ({
      questionId: q._id,
      selectedOption: idx === 0 ? q.correctAnswer : 0,
      answeredAt: new Date('2026-10-15T05:00:00.000Z'),
    })),
  };

  // 3. Sai Kumar on SSS-DRIVE-2027
  const attemptSai2027 = {
    _id: new mongoose.Types.ObjectId('6ad06ce76c18170cfea5064f'),
    student: new mongoose.Types.ObjectId(saiId),
    drive: new mongoose.Types.ObjectId('6ad05a84a943a61b83d2523e'),
    questionPapers: drive2027.selectedPapers,
    paperSnapshot: snapshot2027,
    attemptNumber: 1,
    startTime: new Date('2026-10-15T06:04:23.867Z'),
    deadline: new Date('2026-10-15T06:34:23.867Z'),
    submittedAt: new Date('2026-10-15T06:04:49.074Z'),
    submissionStatus: 'submitted',
    score: 0,
    totalMarks: 7,
    percentage: 0,
    isPassed: false,
    answers: snapshot2027.questions.map((q) => ({
      questionId: q._id,
      selectedOption: (q.correctAnswer + 1) % 4,
      answeredAt: new Date('2026-10-15T06:04:40.000Z'),
    })),
  };

  // 4. Sai Kumar on SSS-DRIVE-2026
  const attemptSai2026 = {
    _id: new mongoose.Types.ObjectId('6ad06d496c18170cfea5076a'),
    student: new mongoose.Types.ObjectId(saiId),
    drive: new mongoose.Types.ObjectId('6ad05903a943a61b83d24ffb'),
    questionPapers: drive2026.selectedPapers,
    paperSnapshot: snapshot2026,
    attemptNumber: 1,
    startTime: new Date('2026-10-15T06:06:01.971Z'),
    deadline: new Date('2026-10-15T06:36:01.971Z'),
    submittedAt: new Date('2026-10-15T06:06:20.359Z'),
    submissionStatus: 'submitted',
    score: 8,
    totalMarks: 8,
    percentage: 100,
    isPassed: true,
    answers: snapshot2026.questions.map((q) => ({
      questionId: q._id,
      selectedOption: q.correctAnswer,
      answeredAt: new Date('2026-10-15T06:06:15.000Z'),
    })),
  };

  // 5. Alex Rivera on Saanvika 2026 Drive
  const attemptAlex = {
    _id: new mongoose.Types.ObjectId('6acf66d756b09d8d153140ff'),
    student: new mongoose.Types.ObjectId(alexId),
    drive: new mongoose.Types.ObjectId('6acf66730fff558eae8a8411'),
    questionPapers: driveSaanvika2026.selectedPapers,
    paperSnapshot: snapshotSaanvika,
    attemptNumber: 1,
    startTime: new Date('2026-10-14T11:26:15.070Z'),
    deadline: new Date('2026-10-14T11:56:15.070Z'),
    submittedAt: new Date('2026-10-14T11:26:15.167Z'),
    submissionStatus: 'submitted',
    score: 6,
    totalMarks: 10,
    percentage: 60,
    isPassed: true,
    answers: snapshotSaanvika.questions.map((q, idx) => ({
      questionId: q._id,
      selectedOption: idx < 3 ? q.correctAnswer : (q.correctAnswer + 1) % 4,
      answeredAt: new Date('2026-10-14T11:26:10.000Z'),
    })),
  };

  const attemptsToInsert = [attemptPara2026, attemptPara2027, attemptSai2027, attemptSai2026, attemptAlex];

  for (const att of attemptsToInsert) {
    await ExamAttempt.findByIdAndUpdate(att._id, att, { upsert: true, new: true });
    console.log(`ExamAttempt restored: ${att._id} (${att.score}/${att.totalMarks}, isPassed: ${att.isPassed})`);
  }

  // Restore CandidateProgress records for all registrations across all drives
  const registrations = await DriveRegistration.find({ registrationStatus: 'registered' }).lean();

  for (const reg of registrations) {
    const studentId = reg.student;
    const driveId = reg.drive;

    // Check if an attempt exists for this student & drive
    const attempt = await ExamAttempt.findOne({ student: studentId, drive: driveId }).sort({ createdAt: -1 });

    const isPassed = attempt?.isPassed || false;
    const isSubmitted = attempt?.submissionStatus === 'submitted' || attempt?.submissionStatus === 'auto-submitted';

    // Build roundEvaluations
    const roundEvaluations = [
      {
        stageName: 'Examination',
        status: isSubmitted ? (isPassed ? 'cleared' : 'pending') : 'pending',
        interviewDate: null,
        interviewTime: '',
        locationOrLink: '',
        score: attempt ? attempt.score : null,
        remarks: '',
        candidateNotes: '',
        evaluatedBy: null,
        evaluatedAt: attempt ? attempt.submittedAt : null,
      },
    ];

    const stageHistory = [
      {
        fromStage: 'Registration',
        toStage: 'Examination',
        status: 'registered',
        changedBy: studentId,
        changedAt: reg.registeredAt || new Date(),
        reason: 'Candidate joined recruitment drive',
      },
    ];

    if (isSubmitted) {
      stageHistory.push({
        fromStage: 'Examination',
        toStage: 'Examination',
        status: isPassed ? 'passed' : 'evaluated',
        changedBy: studentId,
        changedAt: attempt.submittedAt || new Date(),
        reason: `Exam completed. Score: ${attempt.score}/${attempt.totalMarks} (${attempt.percentage}%)`,
      });
    }

    await CandidateProgress.findOneAndUpdate(
      { student: studentId, drive: driveId },
      {
        student: studentId,
        drive: driveId,
        currentStage: 'Examination',
        overallStatus: isPassed ? 'shortlisted' : 'pending',
        roundEvaluations,
        stageHistory,
      },
      { upsert: true, new: true }
    );

    console.log(`CandidateProgress restored: student ${studentId} on drive ${driveId} (status: ${isPassed ? 'shortlisted' : 'pending'})`);
  }

  console.log('Restoration completed successfully!');
  await mongoose.disconnect();
  process.exit(0);
}

restoreData().catch((err) => {
  console.error('Restoration failed:', err);
  process.exit(1);
});
