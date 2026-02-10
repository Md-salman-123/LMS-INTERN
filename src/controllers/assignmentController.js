import Assignment from '../models/Assignment.js';
import AssignmentSubmission from '../models/AssignmentSubmission.js';
import Course from '../models/Course.js';
import { updateEnrollmentAfterAssignment } from '../utils/updateEnrollmentMetrics.js';
import { runTestCases } from '../services/codeExecutionService.js';

// @desc    Create assignment
// @route   POST /api/assignments
// @access  Private/Trainer
export const createAssignment = async (req, res, next) => {
  try {
    const {
      course,
      title,
      description,
      instructions,
      attachments,
      dueDate,
      allowLateSubmission,
      latePenalty,
      maxFileSize,
      allowedFileTypes,
      maxSubmissions,
      totalPoints,
      passingScore,
      gradingType,
      rubric,
      testCases,
      status,
    } = req.body;

    // Verify course ownership
    const courseDoc = await Course.findById(course);
    if (
      courseDoc.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to create assignment for this course',
      });
    }

    const assignment = await Assignment.create({
      course,
      title,
      description,
      instructions,
      attachments: attachments || [],
      dueDate: new Date(dueDate),
      allowLateSubmission: allowLateSubmission || false,
      latePenalty: latePenalty || 0,
      maxFileSize: maxFileSize || 10,
      allowedFileTypes: allowedFileTypes || [],
      maxSubmissions: maxSubmissions || 1,
      totalPoints: totalPoints || 100,
      passingScore: passingScore || 70,
      gradingType: gradingType || 'points',
      rubric: rubric || [],
      testCases: Array.isArray(testCases) ? testCases : [],
      status: status || 'draft',
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get assignments for a course
// @route   GET /api/assignments/course/:courseId
// @access  Private
export const getCourseAssignments = async (req, res, next) => {
  try {
    const assignments = await Assignment.find({ course: req.params.courseId })
      .populate('createdBy', 'email profile')
      .sort({ dueDate: 1 });

    res.status(200).json({
      success: true,
      count: assignments.length,
      data: assignments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get assignment details
// @route   GET /api/assignments/:id
// @access  Private
export const getAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id)
      .populate('course', 'title')
      .populate('createdBy', 'email profile');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found',
      });
    }

    res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update assignment
// @route   PUT /api/assignments/:id
// @access  Private/Trainer
export const updateAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate('course');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found',
      });
    }

    // Check authorization
    if (
      assignment.course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this assignment',
      });
    }

    const updateFields = [
      'title',
      'description',
      'instructions',
      'attachments',
      'dueDate',
      'allowLateSubmission',
      'latePenalty',
      'maxFileSize',
      'allowedFileTypes',
      'maxSubmissions',
      'totalPoints',
      'passingScore',
      'gradingType',
      'rubric',
      'testCases',
      'status',
    ];

    for (const field of updateFields) {
      if (req.body[field] !== undefined) {
        if (field === 'dueDate') {
          assignment[field] = new Date(req.body[field]);
        } else if (field === 'testCases') {
          assignment.testCases = Array.isArray(req.body.testCases) ? req.body.testCases : assignment.testCases || [];
        } else {
          assignment[field] = req.body[field];
        }
      }
    }

    await assignment.save();

    res.status(200).json({
      success: true,
      data: assignment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete assignment
// @route   DELETE /api/assignments/:id
// @access  Private/Trainer
export const deleteAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate('course');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found',
      });
    }

    // Check authorization
    if (
      assignment.course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this assignment',
      });
    }

    await assignment.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Submit assignment
// @route   POST /api/assignments/:id/submit
// @access  Private
export const submitAssignment = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found',
      });
    }

    if (assignment.status !== 'published') {
      return res.status(400).json({
        success: false,
        error: 'Assignment is not available for submission',
      });
    }

    // Check submission limits
    const existingSubmissions = await AssignmentSubmission.find({
      user: req.user._id,
      assignment: assignment._id,
    });

    if (existingSubmissions.length >= assignment.maxSubmissions) {
      return res.status(400).json({
        success: false,
        error: `Maximum submissions (${assignment.maxSubmissions}) reached`,
      });
    }

    const { submissionFiles, textSubmission, submissionLanguage } = req.body;

    const lang = (submissionLanguage && String(submissionLanguage).toLowerCase().trim()) || 'javascript';

    let executionResults = null;
    const testCases = assignment.testCases || [];
    let testResultsToSave = [];
    let testsPassedToSave = null;
    let testsTotalToSave = null;
    let allTestsPassedToSave = null;

    // If assignment has test cases, run them and only accept when all pass
    if (testCases.length > 0) {
      try {
        const results = await runTestCases(
          textSubmission || '',
          lang,
          testCases
        );
        executionResults = results;
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: 'Code could not be run. Check your syntax and try again.',
          testResults: [],
        });
      }

      const allPassed = executionResults.every((r) => r.passed);
      const testsTotal = executionResults.length;
      const testsPassed = executionResults.filter((r) => r.passed).length;

      if (!allPassed) {
        const visibleResults = executionResults.map((r, i) => ({
          passed: r.passed,
          input: testCases[i]?.isHidden ? '(hidden)' : r.input,
          expectedOutput: testCases[i]?.isHidden ? '(hidden)' : r.expectedOutput,
          actualOutput: testCases[i]?.isHidden ? '(hidden)' : r.actualOutput,
          error: r.error,
        }));
        return res.status(400).json({
          success: false,
          error: `${testsPassed}/${testsTotal} test cases passed. Fix your solution and try again.`,
          testResults: visibleResults,
          testsPassed,
          testsTotal,
        });
      }
    }

    if (testCases.length > 0 && executionResults) {
      testResultsToSave = executionResults.map((r, i) => ({
        testCaseId: testCases[i]?._id,
        passed: r.passed,
        input: testCases[i]?.isHidden ? '(hidden)' : r.input,
        expectedOutput: testCases[i]?.isHidden ? '(hidden)' : r.expectedOutput,
        actualOutput: testCases[i]?.isHidden ? '(hidden)' : r.actualOutput,
        error: r.error,
      }));
      testsTotalToSave = executionResults.length;
      testsPassedToSave = executionResults.filter((r) => r.passed).length;
      allTestsPassedToSave = true;
    }

    // Check late submission
    const now = new Date();
    const isLate = now > new Date(assignment.dueDate);
    let daysLate = 0;
    let latePenalty = 0;

    if (isLate) {
      if (!assignment.allowLateSubmission) {
        return res.status(400).json({
          success: false,
          error: 'Late submissions are not allowed',
        });
      }

      daysLate = Math.ceil((now - new Date(assignment.dueDate)) / (1000 * 60 * 60 * 24));
      latePenalty = assignment.latePenalty * daysLate;
    }

    const submission = await AssignmentSubmission.create({
      assignment: assignment._id,
      user: req.user._id,
      submissionFiles: submissionFiles || [],
      textSubmission: textSubmission || '',
      submissionLanguage: submissionLanguage || undefined,
      submittedAt: now,
      isLate,
      daysLate,
      latePenalty,
      attemptNumber: existingSubmissions.length + 1,
      totalPoints: assignment.totalPoints,
      testResults: testResultsToSave,
      testsPassed: testsPassedToSave,
      testsTotal: testsTotalToSave,
      allTestsPassed: allTestsPassedToSave,
    });

    res.status(201).json({
      success: true,
      data: submission,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Run assignment test cases (no submission)
// @route   POST /api/assignments/:id/run-tests
// @access  Private
export const runAssignmentTests = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) {
      return res.status(404).json({ success: false, error: 'Assignment not found' });
    }
    const testCases = assignment.testCases || [];
    if (testCases.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'This assignment has no test cases',
      });
    }
    const { code, language } = req.body;
    const lang = (language && String(language).toLowerCase().trim()) || 'javascript';
    let executionResults;
    try {
      executionResults = await runTestCases(code || '', lang, testCases);
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: 'Code could not be run. Check your syntax and try again.',
        testResults: [],
        testsPassed: 0,
        testsTotal: testCases.length,
        allPassed: false,
      });
    }
    const testsTotal = executionResults.length;
    const testsPassed = executionResults.filter((r) => r.passed).length;
    const allPassed = testsPassed === testsTotal;
    const visibleResults = executionResults.map((r, i) => ({
      passed: r.passed,
      input: testCases[i]?.isHidden ? '(hidden)' : r.input,
      expectedOutput: testCases[i]?.isHidden ? '(hidden)' : r.expectedOutput,
      actualOutput: testCases[i]?.isHidden ? '(hidden)' : r.actualOutput,
      error: r.error,
    }));
    return res.status(200).json({
      success: true,
      data: {
        testResults: visibleResults,
        testsPassed,
        testsTotal,
        allPassed,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Grade assignment submission
// @route   PUT /api/assignments/:id/submissions/:submissionId/grade
// @access  Private/Trainer
export const gradeAssignment = async (req, res, next) => {
  try {
    const submission = await AssignmentSubmission.findById(req.params.submissionId)
      .populate('assignment');

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'Submission not found',
      });
    }

    const assignment = submission.assignment;
    if (!assignment) {
      return res.status(400).json({
        success: false,
        error: 'Assignment not found for this submission',
      });
    }
    const course = await Course.findById(assignment.course);
    if (!course) {
      return res.status(400).json({
        success: false,
        error: 'Course not found',
      });
    }
    if (
      course.trainer.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to grade this submission',
      });
    }

    const { score, feedback, grade } = req.body;
    const numScore = Number(score);
    if (Number.isNaN(numScore) || numScore < 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid score (number >= 0)',
      });
    }

    submission.score = numScore;
    submission.percentage = assignment.totalPoints > 0
      ? Math.round((numScore / assignment.totalPoints) * 100)
      : 0;

    // Apply late penalty if applicable
    if (submission.isLate && submission.latePenalty > 0) {
      const penaltyAmount = (submission.score * submission.latePenalty) / 100;
      submission.score = Math.max(0, submission.score - penaltyAmount);
      submission.percentage = assignment.totalPoints > 0
        ? Math.round((submission.score / assignment.totalPoints) * 100)
        : 0;
    }

    submission.grade = grade || null;
    submission.feedback = feedback || '';
    submission.gradedBy = req.user._id;
    submission.gradedAt = new Date();
    submission.status = 'graded';

    await submission.save();

    // Update enrollment performance metrics
    await updateEnrollmentAfterAssignment(submission.user, assignment.course);

    res.status(200).json({
      success: true,
      data: submission,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get assignment submissions
// @route   GET /api/assignments/:id/submissions
// @access  Private
export const getAssignmentSubmissions = async (req, res, next) => {
  try {
    const assignment = await Assignment.findById(req.params.id).populate('course');

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: 'Assignment not found',
      });
    }

    let query = { assignment: assignment._id };

    // If learner, only show own submissions
    if (req.user.role === 'learner' || req.user.role === 'student') {
      query.user = req.user._id;
    }

    // If trainer/admin, can see all submissions
    const submissions = await AssignmentSubmission.find(query)
      .populate('user', 'email profile')
      .populate('gradedBy', 'email profile')
      .sort({ submittedAt: -1 });

    res.status(200).json({
      success: true,
      count: submissions.length,
      data: submissions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user's submission for an assignment
// @route   GET /api/assignments/:id/my-submission
// @access  Private
export const getMySubmission = async (req, res, next) => {
  try {
    const submission = await AssignmentSubmission.findOne({
      assignment: req.params.id,
      user: req.user._id,
    })
      .populate('assignment')
      .populate('gradedBy', 'email profile')
      .sort({ submittedAt: -1 });

    if (!submission) {
      return res.status(404).json({
        success: false,
        error: 'No submission found',
      });
    }

    res.status(200).json({
      success: true,
      data: submission,
    });
  } catch (error) {
    next(error);
  }
};

