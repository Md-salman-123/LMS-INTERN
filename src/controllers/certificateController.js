import Certificate from '../models/Certificate.js';
import { generateCertificate } from '../services/certificateService.js';
import Enrollment from '../models/Enrollment.js';
import Quiz from '../models/Quiz.js';
import QuizAttempt from '../models/QuizAttempt.js';
import fs from 'fs';
import path from 'path';

// @desc    Generate certificate (auto or manual). Requires 100% course completion AND passed quiz.
// @route   POST /api/certificates/generate
// @access  Private
export const createCertificate = async (req, res, next) => {
  try {
    const { userId, courseId, templateId, autoGenerate } = req.body;
    const targetUserId = userId || req.user._id;

    // Check if user completed the course
    const enrollment = await Enrollment.findOne({
      user: targetUserId,
      course: courseId,
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        error: 'User is not enrolled in this course',
      });
    }

    // Certificate requires 100% course completion
    if (enrollment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Complete the course (100%) to be eligible for a certificate',
      });
    }

    // Certificate also requires passing a course quiz (if the course has quizzes)
    const courseQuizzes = await Quiz.find({ course: courseId }).select('_id').lean();
    const quizIds = courseQuizzes.map((q) => q._id);
    if (quizIds.length > 0) {
      const passedAttempt = await QuizAttempt.findOne({
        user: targetUserId,
        quiz: { $in: quizIds },
        passed: true,
      });
      if (!passedAttempt) {
        return res.status(400).json({
          success: false,
          error: 'You must pass the course quiz to receive a certificate',
        });
      }
    }

    // Get enrollment metadata for certificate
    const metadata = {
      completionDate: enrollment.completedAt || new Date(),
      score: enrollment.averageQuizScore || enrollment.averageAssignmentScore,
      grade: null, // Can be calculated from scores
    };

    const certificate = await generateCertificate(targetUserId, courseId, templateId, metadata);

    res.status(201).json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Verify certificate by verification ID
// @route   GET /api/certificates/verify/:verificationId
// @access  Public
export const verifyCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findOne({
      verificationId: req.params.verificationId,
    })
      .populate('user', 'email profile')
      .populate('course', 'title description')
      .populate('issuedBy', 'email profile');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found or invalid verification ID',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        certificate: {
          certificateNumber: certificate.certificateNumber,
          issuedAt: certificate.issuedAt,
          course: certificate.course.title,
          recipient: `${certificate.user.profile?.firstName || ''} ${certificate.user.profile?.lastName || certificate.user.email}`.trim(),
          issuedBy: certificate.issuedBy?.profile?.firstName
            ? `${certificate.issuedBy.profile.firstName} ${certificate.issuedBy.profile.lastName}`.trim()
            : certificate.issuedBy?.email,
        },
        isValid: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get certificate by share token
// @route   GET /api/certificates/share/:shareToken
// @access  Public
export const getCertificateByShareToken = async (req, res, next) => {
  try {
    const certificate = await Certificate.findOne({
      shareToken: req.params.shareToken,
      isPublic: true,
    })
      .populate('user', 'email profile')
      .populate('course', 'title description');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found or sharing is disabled',
      });
    }

    res.status(200).json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle certificate public sharing
// @route   PUT /api/certificates/:id/share
// @access  Private
export const toggleCertificateSharing = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found',
      });
    }

    // Check authorization
    if (
      certificate.user.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to modify this certificate',
      });
    }

    certificate.isPublic = !certificate.isPublic;
    if (certificate.isPublic && !certificate.shareToken) {
      // Generate share token if making public
      const crypto = (await import('crypto')).default;
      certificate.shareToken = crypto.randomBytes(16).toString('hex');
    } else if (!certificate.isPublic) {
      certificate.shareToken = null;
    }

    await certificate.save();

    res.status(200).json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user certificates
// @route   GET /api/certificates
// @access  Private
export const getCertificates = async (req, res, next) => {
  try {
    let query = {};

    // Learners and students see only their own certificates; staff can filter by userId
    const isLearner = ['learner', 'student'].includes(req.user.role);
    if (isLearner) {
      query.user = req.user._id;
    } else if (req.body.userId) {
      query.user = req.body.userId;
    }

    const certificates = await Certificate.find(query)
      .populate('user', 'email profile')
      .populate('course', 'title description')
      .sort({ issuedAt: -1 });

    res.status(200).json({
      success: true,
      count: certificates.length,
      data: certificates,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Download certificate
// @route   GET /api/certificates/:id/download
// @access  Private
export const downloadCertificate = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate('user', 'email profile')
      .populate('course', 'title');

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found',
      });
    }

    const ownerId = (certificate.user?._id || certificate.user)?.toString?.();
    if (ownerId !== req.user._id.toString() && !['super_admin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to download this certificate',
      });
    }

    const uploadPath = process.env.UPLOAD_PATH
      ? path.resolve(process.env.UPLOAD_PATH)
      : path.join(process.cwd(), 'uploads');
    const relativePath = (certificate.pdfUrl || '').replace(/^\/?uploads\/?/, '').trim() || `certificates/certificate-${certificate.certificateNumber}.pdf`;
    let filepath = path.join(uploadPath, relativePath);

    if (!fs.existsSync(filepath)) {
      const backendDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
      const fallbackPath = path.join(backendDir, 'uploads', relativePath);
      if (fs.existsSync(fallbackPath)) {
        filepath = fallbackPath;
      } else {
        return res.status(404).json({
          success: false,
          error: 'Certificate file not found',
        });
      }
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="certificate-${certificate.certificateNumber}.pdf"`);
    res.sendFile(path.resolve(filepath));
  } catch (error) {
    next(error);
  }
};

