const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const Subject = require('../src/models/Subject');
const QuestionPaper = require('../src/models/QuestionPaper');
const RecruitmentDrive = require('../src/models/RecruitmentDrive');
const DriveRegistration = require('../src/models/DriveRegistration');
const CandidateProgress = require('../src/models/CandidateProgress');
const { logActivity } = require('../src/services/activityLogger');

const seedDemoData = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      'mongodb+srv://arungrandhi:ARUN123@cluster0.k1xoqch.mongodb.net/Hiring-Platform?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('[Seed] Connected to MongoDB at', mongoUri);

    // 1. Create or ensure Super Admin
    const superAdminPassword = await User.hashPassword('SuperAdmin@123');
    let superAdmin = await User.findOneAndUpdate(
      { email: 'superadmin@hiringplatform.com' },
      {
        name: 'Platform Super Administrator',
        email: 'superadmin@hiringplatform.com',
        phone: '+1-555-0100',
        passwordHash: superAdminPassword,
        role: 'superadmin',
        status: 'active',
      },
      { upsert: true, new: true }
    );
    console.log('[Seed] Super Admin ready: superadmin@hiringplatform.com / SuperAdmin@123');

    // 2. Create or ensure Admin
    const adminPassword = await User.hashPassword('Admin@123');
    let admin = await User.findOneAndUpdate(
      { email: 'admin@techcorp.com' },
      {
        name: 'Sarah Jenkins (Lead Recruiter)',
        email: 'admin@techcorp.com',
        phone: '+1-555-0155',
        passwordHash: adminPassword,
        role: 'admin',
        status: 'active',
        createdBy: superAdmin._id,
      },
      { upsert: true, new: true }
    );
    console.log('[Seed] Admin ready: admin@techcorp.com / Admin@123');

    // 3. Create or ensure Student
    const studentPassword = await User.hashPassword('Student@123');
    let student = await User.findOneAndUpdate(
      { email: 'student@example.com' },
      {
        name: 'Alex Rivera',
        email: 'student@example.com',
        phone: '+1-555-0199',
        passwordHash: studentPassword,
        role: 'student',
        status: 'active',
        profile: {
          college: 'California Institute of Technology',
          qualification: 'B.Tech Computer Science',
          graduationYear: 2026,
          department: 'Computer Science & Engineering',
        },
      },
      { upsert: true, new: true }
    );
    console.log('[Seed] Student ready: student@example.com / Student@123');

    // 4. Create Subjects
    let subjectWeb = await Subject.findOneAndUpdate(
      { name: 'Full Stack Web Engineering' },
      {
        name: 'Full Stack Web Engineering',
        code: 'CS-FSW',
        description: 'Frontend and Backend technologies including React, Node.js, Express, and Database design.',
        status: 'active',
        createdBy: admin._id,
      },
      { upsert: true, new: true }
    );

    let subjectAlgo = await Subject.findOneAndUpdate(
      { name: 'Data Structures & Algorithms' },
      {
        name: 'Data Structures & Algorithms',
        code: 'CS-DSA',
        description: 'Core computational problems, time complexity, trees, graphs, and dynamic programming.',
        status: 'active',
        createdBy: admin._id,
      },
      { upsert: true, new: true }
    );
    console.log('[Seed] Subjects seeded successfully');

    // 5. Create Question Paper
    const questionsData = [
      {
        questionText: 'What is the primary role of the Virtual DOM in React?',
        options: [
          'Directly updates the native browser DOM synchronously on every keystroke',
          'Minimizes costly real DOM manipulations by computing differences (reconciliation) in memory',
          'Enables server-side database querying without an Express backend',
          'Replaces HTML5 web workers for multi-threaded browser computing',
        ],
        correctAnswer: 1,
        marks: 2,
        negativeMarks: 0.5,
        explanation: 'React Virtual DOM reconciles state changes in memory and batches updates to minimize real DOM repaints and reflows.',
        order: 1,
      },
      {
        questionText: 'Which HTTP status code should be returned when an authentication token is missing or invalid?',
        options: [
          '200 OK',
          '401 Unauthorized',
          '403 Forbidden',
          '404 Not Found',
        ],
        correctAnswer: 1,
        marks: 2,
        negativeMarks: 0.5,
        explanation: '401 Unauthorized indicates that the request lacks valid authentication credentials for the target resource.',
        order: 2,
      },
      {
        questionText: 'In MongoDB, what type of index prevents duplicate combinations of two fields (e.g., student and drive)?',
        options: [
          'Text Index',
          'Geospatial Index',
          'Compound Unique Index',
          'Hashed Index',
        ],
        correctAnswer: 2,
        marks: 2,
        negativeMarks: 0.5,
        explanation: 'A compound unique index enforces uniqueness across the combination of specified index fields.',
        order: 3,
      },
      {
        questionText: 'What does the Node.js event loop do when it reaches the "poll" phase?',
        options: [
          'Retrieves new I/O events and executes their I/O related callbacks',
          'Executes timers whose threshold has passed',
          'Immediately closes all idle MongoDB connections',
          'Terminates the active Node thread and restarts the process',
        ],
        correctAnswer: 0,
        marks: 2,
        negativeMarks: 0.5,
        explanation: 'The poll phase calculates how long to block and polls for I/O events, then processes events in the poll queue.',
        order: 4,
      },
      {
        questionText: 'Which middleware is best suited to set secure HTTP response headers in an Express application?',
        options: [
          'morgan',
          'cors',
          'helmet',
          'bcryptjs',
        ],
        correctAnswer: 2,
        marks: 2,
        negativeMarks: 0.5,
        explanation: 'Helmet helps secure Express apps by setting various HTTP response headers (Content-Security-Policy, HSTS, X-Frame-Options, etc.).',
        order: 5,
      },
    ];

    let questionPaper = await QuestionPaper.findOneAndUpdate(
      { title: 'Full Stack Engineering Core Assessment' },
      {
        title: 'Full Stack Engineering Core Assessment',
        subject: subjectWeb._id,
        instructions: 'Answer all 5 multiple choice questions. Negative marking of 0.5 marks applies for incorrect answers. Passing score is 6 marks (60%).',
        difficulty: 'Medium',
        duration: 30, // 30 minutes
        totalMarks: 10,
        passingMarks: 6,
        negativeMarking: {
          enabled: true,
          perQuestionPenalty: 0.5,
        },
        questions: questionsData,
        status: 'published',
        version: 1,
        createdBy: admin._id,
      },
      { upsert: true, new: true }
    );
    console.log('[Seed] Published Question Paper ready with 5 questions');

    // 6. Create Recruitment Drive
    const now = new Date();
    const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    let drive = await RecruitmentDrive.findOneAndUpdate(
      { driveCode: 'HIRE-TECH26' },
      {
        name: 'Saanvika Software Solutions 2026 Graduate Software Engineer Drive',
        jobTitle: 'Junior Full Stack Software Engineer',
        jobDescription: 'Join our high-performing core engineering team developing scalable cloud solutions with React, Node.js, and MongoDB.',
        eligibility: {
          department: 'Computer Science, Information Technology, or equivalent',
          minGraduationYear: 2024,
          maxGraduationYear: 2027,
          minimumPercentage: 60,
          additionalNotes: 'Proficiency in JavaScript, Data Structures, and REST APIs is expected.',
        },
        selectedPapers: [questionPaper._id],
        totalDuration: 30,
        passingCriteria: {
          minPercentage: 60,
          minMarks: 6,
        },
        maxAttempts: 1,
        driveCode: 'HIRE-TECH26',
        status: 'active',
        startDate: now,
        endDate: nextMonth,
        stages: [
          'Examination',
          'Group Discussion (GD)',
          'Technical Interview',
          'HR Interview',
          'CEO Interview',
          'Selected or Rejected',
        ],
        createdBy: admin._id,
      },
      { upsert: true, new: true }
    );
    console.log('[Seed] Active Recruitment Drive ready with code: HIRE-TECH26');

    // 7. Register Student to Drive & initialize CandidateProgress
    await DriveRegistration.findOneAndUpdate(
      { student: student._id, drive: drive._id },
      {
        $set: {
          student: student._id,
          drive: drive._id,
          registrationStatus: 'registered',
          registeredAt: new Date(),
        },
      },
      { upsert: true }
    );

    await CandidateProgress.findOneAndUpdate(
      { student: student._id, drive: drive._id },
      {
        $set: {
          student: student._id,
          drive: drive._id,
          currentStage: 'Examination',
          overallStatus: 'pending',
          roundEvaluations: [
            {
              stageName: 'Examination',
              status: 'pending',
            },
          ],
          stageHistory: [
            {
              fromStage: 'Registration',
              toStage: 'Examination',
              status: 'registered',
              changedBy: student._id,
              changedAt: new Date(),
              reason: 'Seeded student registration',
            },
          ],
        },
      },
      { upsert: true }
    );
    console.log('[Seed] Student registered to HIRE-TECH26 drive');

    // 8. Log initial activity
    await logActivity({
      actor: superAdmin,
      action: 'DEMO_DATA_SEEDED',
      resourceType: 'System',
      resourceId: null,
      metadata: { driveCode: 'HIRE-TECH26' },
    });

    console.log('\n====================================================');
    console.log('DEMO DATA SEEDED SUCCESSFULLY!');
    console.log('====================================================');
    console.log('1. Super Admin:');
    console.log('   Email:    superadmin@hiringplatform.com');
    console.log('   Password: SuperAdmin@123');
    console.log('\n2. Admin:');
    console.log('   Email:    admin@techcorp.com');
    console.log('   Password: Admin@123');
    console.log('\n3. Student:');
    console.log('   Email:    student@example.com');
    console.log('   Password: Student@123');
    console.log('\n4. Active Recruitment Drive:');
    console.log('   Name:     Saanvika Software Solutions 2026 Graduate Software Engineer Drive');
    console.log('   Code:     HIRE-TECH26');
    console.log('====================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Seed Error]', err);
    process.exit(1);
  }
};

seedDemoData();
