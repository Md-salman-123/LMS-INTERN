import CodingLab from '../models/CodingLab.js';
import CodingLabSubmission from '../models/CodingLabSubmission.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { runTestCases } from '../services/codeExecutionService.js';

/** Create sample coding labs when DB has none (so app works without running seed) */
async function ensureSampleCodingLabs() {
  const count = await CodingLab.countDocuments();
  if (count > 0) return;

  const User = (await import('../models/User.js')).default;
  const Organization = (await import('../models/Organization.js')).default;
  const user = await User.findOne().sort({ createdAt: 1 });
  const org = await Organization.findOne();
  if (!user) return;

  const samples = [
    {
      title: 'Hello World in JavaScript',
      description: 'Write a program that prints "Hello, World!" to the console.',
      problemStatement: 'Write a JavaScript program that prints "Hello, World!" using console.log().',
      language: 'javascript',
      starterCode: '// Write your code here\nconsole.log("Hello, World!");',
      testCases: [{ input: ' ', expectedOutput: 'Hello, World!', isHidden: false, points: 10 }],
      constraints: ['Output must match exactly'],
      hints: ['Use console.log()'],
      difficulty: 'easy',
      points: 10,
      status: 'published',
      createdBy: user._id,
      organization: org?._id,
      allowMultipleSubmissions: true,
    },
    {
      title: 'Sum of Two Numbers',
      description: 'Write a function that returns the sum of two numbers.',
      problemStatement: 'Write a function `sum(a, b)` that returns a + b.',
      language: 'javascript',
      starterCode: 'function sum(a, b) {\n  return 0;\n}',
      testCases: [
        { input: '5,3', expectedOutput: '8', isHidden: false, points: 5 },
        { input: '-1,1', expectedOutput: '0', isHidden: false, points: 5 },
      ],
      constraints: ['Function must be named "sum"'],
      hints: ['Use the + operator'],
      difficulty: 'easy',
      points: 10,
      status: 'published',
      createdBy: user._id,
      organization: org?._id,
      allowMultipleSubmissions: true,
    },
  ];
  await CodingLab.insertMany(samples);
}

// @desc    Get all coding labs
// @route   GET /api/coding-labs
// @access  Public/Private
export const getCodingLabs = asyncHandler(async (req, res) => {
  const { course, lesson, language, difficulty, status, search } = req.query;
  const query = {};

  if (course) query.course = course;
  if (lesson) query.lesson = lesson;
  if (language) query.language = language;
  if (difficulty) query.difficulty = difficulty;
  
  if (status) {
    query.status = status;
  } else {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin' || req.user.role === 'trainer')) {
      // Show all for admins/trainers
    } else {
      query.status = 'published';
    }
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
    ];
  }

  try {
    let codingLabs = await CodingLab.find(query)
      .populate('course', 'title thumbnail')
      .populate('lesson', 'title')
      .populate('createdBy', 'profile.firstName profile.lastName email')
      .sort({ createdAt: -1 })
      .lean();

    if (codingLabs.length === 0 && Object.keys(query).length <= 1) {
      await ensureSampleCodingLabs();
      codingLabs = await CodingLab.find(query)
        .populate('course', 'title thumbnail')
        .populate('lesson', 'title')
        .populate('createdBy', 'profile.firstName profile.lastName email')
        .sort({ createdAt: -1 })
        .lean();
    }

    res.json({
      success: true,
      data: codingLabs || [],
    });
  } catch (error) {
    console.error('Error fetching coding labs:', error);
    try {
      let codingLabs = await CodingLab.find(query).sort({ createdAt: -1 }).lean();
      if (codingLabs.length === 0 && Object.keys(query).length <= 1) {
        await ensureSampleCodingLabs();
        codingLabs = await CodingLab.find(query).sort({ createdAt: -1 }).lean();
      }
      res.json({ success: true, data: codingLabs || [] });
    } catch (fallbackError) {
      console.error('Fallback fetch failed:', fallbackError);
      res.json({ success: true, data: [] });
    }
  }
});

// @desc    Get single coding lab
// @route   GET /api/coding-labs/:id
// @access  Public/Private
export const getCodingLab = asyncHandler(async (req, res) => {
  let codingLab;
  try {
    codingLab = await CodingLab.findById(req.params.id)
      .populate('course', 'title thumbnail')
      .populate('lesson', 'title')
      .populate('createdBy', 'profile.firstName profile.lastName email');
  } catch (error) {
    console.error('Error populating coding lab:', error);
    // If populate fails, try without populate
    codingLab = await CodingLab.findById(req.params.id);
  }

  if (!codingLab) {
    return res.status(404).json({
      success: false,
      error: 'Coding lab not found',
    });
  }

  // Check if lab is published (unless user is admin/trainer)
  if (
    codingLab.status !== 'published' &&
    (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.role !== 'trainer'))
  ) {
    return res.status(403).json({
      success: false,
      error: 'This coding lab is not available',
    });
  }

  // Get user's submissions (if authenticated)
  let submissions = [];
  if (req.user && req.user._id) {
    try {
      submissions = await CodingLabSubmission.find({
        codingLab: req.params.id,
        user: req.user._id,
      })
        .sort({ createdAt: -1 })
        .lean();
    } catch (error) {
      console.error('Error fetching submissions:', error);
      submissions = [];
    }
  }

  // Don't send solution, expected outputs, or hidden test cases to students (questions only)
  const labData = codingLab.toObject ? codingLab.toObject() : codingLab;
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'super_admin' && req.user.role !== 'trainer')) {
    delete labData.solution;
    labData.testCases = (labData.testCases || [])
      .filter((tc) => !tc.isHidden)
      .map(({ input, points, _id }) => ({ input, points: points ?? 1, _id })); // no expectedOutput
  }

  res.json({
    success: true,
    data: {
      codingLab: labData,
      submissions,
    },
  });
});

// @desc    Create coding lab
// @route   POST /api/coding-labs
// @access  Private/Trainer/Admin
export const createCodingLab = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    problemStatement,
    course,
    lesson,
    language,
    starterCode,
    solution,
    testCases,
    constraints,
    hints,
    difficulty,
    points,
    timeLimit,
    allowMultipleSubmissions,
    showSolution,
  } = req.body;

  const codingLab = await CodingLab.create({
    title,
    description,
    problemStatement,
    course,
    lesson,
    language: language || 'javascript',
    starterCode: starterCode || '',
    solution: solution || '',
    testCases: testCases || [],
    constraints: constraints || [],
    hints: hints || [],
    difficulty: difficulty || 'medium',
    points: points || 10,
    timeLimit: timeLimit || 0,
    allowMultipleSubmissions: allowMultipleSubmissions !== false,
    showSolution: showSolution || false,
    createdBy: req.user._id,
    organization: req.user.organization,
    status: 'draft',
  });

  res.status(201).json({
    success: true,
    data: codingLab,
  });
});

// @desc    Submit code solution
// @route   POST /api/coding-labs/:id/submit
// @access  Private
export const submitCode = asyncHandler(async (req, res) => {
  const { code, language } = req.body;

  const codingLab = await CodingLab.findById(req.params.id);

  if (!codingLab) {
    return res.status(404).json({
      success: false,
      error: 'Coding lab not found',
    });
  }

  if (codingLab.status !== 'published') {
    return res.status(403).json({
      success: false,
      error: 'This coding lab is not available',
    });
  }

  // Get user's previous submissions count
  const previousSubmissions = await CodingLabSubmission.countDocuments({
    codingLab: req.params.id,
    user: req.user._id,
  });

  if (!codingLab.allowMultipleSubmissions && previousSubmissions > 0) {
    return res.status(403).json({
      success: false,
      error: 'Multiple submissions not allowed for this lab',
    });
  }

  // Execute code and run test cases
  const testResults = [];
  let status = 'pending';
  let score = 0;
  let totalPoints = 0;
  let percentage = 0;

  if (codingLab.testCases && codingLab.testCases.length > 0) {
    const visibleTests = codingLab.testCases.filter((tc) => !tc.isHidden);
    totalPoints = visibleTests.reduce((sum, tc) => sum + (tc.points || 1), 0);

    try {
      // Run test cases using code execution service
      const executionResults = await runTestCases(
        code,
        language || codingLab.language,
        visibleTests
      );

      testResults.push(...executionResults);

      // Calculate score
      const passedTests = executionResults.filter((r) => r.passed);
      score = passedTests.reduce((sum, r) => {
        const testCase = visibleTests.find((tc) => (tc._id || tc.id) === r.testCaseId);
        return sum + (testCase?.points || 1);
      }, 0);

      percentage = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
      status = percentage === 100 ? 'passed' : percentage > 0 ? 'failed' : 'error';
    } catch (error) {
      console.error('Test execution error:', error);
      status = 'error';
    }
  } else {
    // No test cases - mark as pending
    status = 'pending';
  }

  // Calculate execution time
  const startTime = Date.now();
  const timeTaken = Math.round((Date.now() - startTime) / 1000); // in seconds

  const submission = await CodingLabSubmission.create({
    codingLab: req.params.id,
    user: req.user._id,
    code,
    language: language || codingLab.language,
    testResults,
    status,
    score,
    totalPoints,
    percentage,
    attemptNumber: previousSubmissions + 1,
    timeTaken,
  });

  // Award points if passed
  if (status === 'passed' && score > 0) {
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(req.user._id);
    if (user) {
      user.points = (user.points || 0) + score;
      await user.save();
    }
  }

  res.status(201).json({
    success: true,
    data: submission,
    message:
      status === 'passed'
        ? 'Congratulations! All test cases passed!'
        : status === 'failed'
        ? 'Some test cases failed. Try again!'
        : 'Code submitted successfully. Results will be available shortly.',
  });
});

// @desc    Get user submissions for a coding lab
// @route   GET /api/coding-labs/:id/submissions
// @access  Private
export const getSubmissions = asyncHandler(async (req, res) => {
  const submissions = await CodingLabSubmission.find({
    codingLab: req.params.id,
    user: req.user._id,
  })
    .sort({ createdAt: -1 })
    .limit(10);

  res.json({
    success: true,
    data: submissions,
  });
});

// @desc    Update coding lab
// @route   PUT /api/coding-labs/:id
// @access  Private/Trainer/Admin
export const updateCodingLab = asyncHandler(async (req, res) => {
  let codingLab = await CodingLab.findById(req.params.id);

  if (!codingLab) {
    return res.status(404).json({
      success: false,
      error: 'Coding lab not found',
    });
  }

  // Check authorization
  if (
    codingLab.createdBy.toString() !== req.user._id.toString() &&
    !req.user.isAdmin()
  ) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to update this coding lab',
    });
  }

  codingLab = await CodingLab.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.json({
    success: true,
    data: codingLab,
  });
});

// @desc    Delete coding lab
// @route   DELETE /api/coding-labs/:id
// @access  Private/Trainer/Admin
export const deleteCodingLab = asyncHandler(async (req, res) => {
  const codingLab = await CodingLab.findById(req.params.id);

  if (!codingLab) {
    return res.status(404).json({
      success: false,
      error: 'Coding lab not found',
    });
  }

  // Check authorization
  if (
    codingLab.createdBy.toString() !== req.user._id.toString() &&
    !req.user.isAdmin()
  ) {
    return res.status(403).json({
      success: false,
      error: 'Not authorized to delete this coding lab',
    });
  }

  await codingLab.deleteOne();

  res.json({
    success: true,
    data: {},
  });
});

