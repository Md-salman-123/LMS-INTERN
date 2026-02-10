import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Certificate from '../models/Certificate.js';
import CertificateTemplate from '../models/CertificateTemplate.js';
import User from '../models/User.js';
import Course from '../models/Course.js';
import logger from '../utils/logger.js';

/**
 * Generate QR code for certificate verification
 */
const generateQRCode = async (verificationUrl, filepath) => {
  try {
    // Dynamic import for QRCode (optional dependency)
    const qrcodeModule = await import('qrcode');
    const QRCode = qrcodeModule.default;
    
    await QRCode.toFile(filepath, verificationUrl, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return filepath;
  } catch (error) {
    logger.warn('QRCode module not available or error generating QR code:', error.message);
    // Return null if QR code generation fails - certificate can still be created
    return null;
  }
};

/**
 * Generate certificate PDF with custom template
 */
export const generateCertificate = async (userId, courseId, templateId = null, metadata = {}) => {
  try {
    // Check if certificate already exists
    const existingCert = await Certificate.findOne({ user: userId, course: courseId });
    if (existingCert) {
      return existingCert;
    }

    const user = await User.findById(userId);
    const course = await Course.findById(courseId).populate('trainer', 'profile');

    if (!user || !course) {
      throw new Error('User or course not found');
    }

    // Get template (default or specified)
    let template = null;
    if (templateId) {
      template = await CertificateTemplate.findById(templateId);
    } else {
      // Get default template for organization, then global default (organization null)
      template = await CertificateTemplate.findOne({
        organization: course.organization,
        isDefault: true,
        isActive: true,
      });
      if (!template) {
        template = await CertificateTemplate.findOne({
          organization: null,
          isDefault: true,
          isActive: true,
        });
      }
    }

    // Generate certificate number
    const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Setup paths
    const uploadPath = process.env.UPLOAD_PATH || './uploads';
    const certPath = path.join(uploadPath, 'certificates');
    const qrPath = path.join(uploadPath, 'certificates', 'qr-codes');
    
    if (!fs.existsSync(certPath)) {
      fs.mkdirSync(certPath, { recursive: true });
    }
    if (!fs.existsSync(qrPath)) {
      fs.mkdirSync(qrPath, { recursive: true });
    }

    const filename = `certificate-${certificateNumber}.pdf`;
    const filepath = path.join(certPath, filename);

    // Get template design and content
    const design = template?.design || {};
    const content = template?.content || {};
    const layout = design.layout || 'landscape';

    // Generate verification ID (will be set by pre-save hook, but we need it for QR code)
    const verificationId = `VER-${crypto.randomBytes(8).toString('hex').toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    
    // Generate verification URL
    const baseUrl = process.env.FRONTEND_URL || process.env.BACKEND_URL || 'http://localhost:5173';
    const verificationUrl = `${baseUrl}/verify/${verificationId}`;

    // Generate QR code
    let qrFilename = null;
    let qrFilepath = null;
    if (design.qrCode?.show !== false) {
      qrFilename = `qr-${certificateNumber}.png`;
      qrFilepath = path.join(qrPath, qrFilename);
      await generateQRCode(verificationUrl, qrFilepath);
    }
    
    const doc = new PDFDocument({ 
      size: 'LETTER', 
      layout: layout,
      margin: 50,
    });

    // Pipe PDF to file
    doc.pipe(fs.createWriteStream(filepath));

    // Draw background
    if (design.backgroundColor) {
      doc.rect(0, 0, doc.page.width, doc.page.height)
         .fillColor(design.backgroundColor)
         .fill();
    }

    // Draw border
    if (design.borderColor && design.borderWidth) {
      doc.rect(design.borderWidth, design.borderWidth, 
               doc.page.width - (design.borderWidth * 2), 
               doc.page.height - (design.borderWidth * 2))
         .strokeColor(design.borderColor)
         .lineWidth(design.borderWidth)
         .stroke();
    }

    // Add background image if provided
    if (design.backgroundImage?.url && fs.existsSync(design.backgroundImage.url)) {
      doc.image(design.backgroundImage.url, 0, 0, {
        width: doc.page.width,
        height: doc.page.height,
        opacity: design.backgroundImage.opacity || 0.1,
      });
    }

    // Add logo if provided
    if (design.logo?.url && fs.existsSync(design.logo.url)) {
      const logoPos = design.logo.position || 'top-center';
      let logoX = 50;
      if (logoPos === 'top-center') logoX = (doc.page.width - design.logo.width) / 2;
      else if (logoPos === 'top-right') logoX = doc.page.width - design.logo.width - 50;
      
      doc.image(design.logo.url, logoX, 50, {
        width: design.logo.width || 150,
        height: design.logo.height || 150,
      });
    }

    // Title
    const titleStyle = design.titleStyle || {};
    doc.fontSize(titleStyle.fontSize || 40)
       .font(titleStyle.fontFamily || 'Helvetica-Bold')
       .fillColor(titleStyle.color || '#000000')
       .text(content.title || 'Certificate of Completion', {
         align: titleStyle.alignment || 'center',
         y: design.logo?.url ? 220 : 100,
       });

    // Subtitle
    doc.moveDown();
    doc.fontSize(20)
       .font('Helvetica')
       .fillColor('#000000')
       .text(content.subtitle || 'This is to certify that', { align: 'center' });

    // Recipient name
    const recipientStyle = design.recipientStyle || {};
    doc.moveDown();
    doc.fontSize(recipientStyle.fontSize || 30)
       .font(recipientStyle.fontFamily || 'Helvetica-Bold')
       .fillColor(recipientStyle.color || '#000000')
       .text(
         `${user.profile?.firstName || ''} ${user.profile?.lastName || user.email}`.trim(),
         { align: recipientStyle.alignment || 'center' }
       );

    // Body text
    doc.moveDown();
    doc.fontSize(20)
       .font('Helvetica')
       .fillColor('#000000')
       .text(content.body || 'has successfully completed the course', { align: 'center' });

    // Course title
    const courseStyle = design.courseStyle || {};
    doc.moveDown();
    doc.fontSize(courseStyle.fontSize || 24)
       .font(courseStyle.fontFamily || 'Helvetica-Bold')
       .fillColor(courseStyle.color || '#000000')
       .text(course.title, { align: courseStyle.alignment || 'center' });

    // Certificate number and date
    doc.moveDown(2);
    doc.fontSize(16)
       .font('Helvetica')
       .fillColor('#000000')
       .text(`Certificate Number: ${certificateNumber}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(14)
       .text(
         `Issued on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
         { align: 'center' }
       );

    // Add QR code
    if (design.qrCode?.show !== false && qrFilepath && fs.existsSync(qrFilepath)) {
      const qrPos = design.qrCode?.position || 'bottom-right';
      let qrX = doc.page.width - (design.qrCode?.size || 100) - 50;
      let qrY = doc.page.height - (design.qrCode?.size || 100) - 50;
      
      if (qrPos === 'bottom-center') {
        qrX = (doc.page.width - (design.qrCode?.size || 100)) / 2;
      } else if (qrPos === 'bottom-left') {
        qrX = 50;
      }

      doc.image(qrFilepath, qrX, qrY, {
        width: design.qrCode?.size || 100,
        height: design.qrCode?.size || 100,
      });
    }

    // Add signature and issuer on same page using fixed positions (avoid new page)
    const pageHeight = doc.page.height;
    const sigY = pageHeight - 120;
    const issuerY = pageHeight - 85;
    const footerY = pageHeight - 35;

    if (design.signature?.show !== false) {
      const sigPos = design.signature?.position || 'left';
      let sigX = 100;
      if (sigPos === 'center') sigX = doc.page.width / 2 - 100;
      else if (sigPos === 'right') sigX = doc.page.width - 200;

      doc.fontSize(14)
         .fillColor('#000000')
         .text('_________________________', sigX, sigY, { align: 'left' })
         .font('Helvetica')
         .text(design.signature?.label || 'Trainer Signature', sigX, sigY + 20, { align: 'left' });
    }

    // Issuer / platform name (e.g. LMS Portal) — fixed Y so it stays on page 1
    const issuerName = content.issuer || 'LMS Portal';
    doc.fontSize(14)
       .font('Helvetica-Bold')
       .fillColor('#000000')
       .text(issuerName, 0, issuerY, { align: 'center', width: doc.page.width });

    // Footer
    if (content.footer) {
      doc.fontSize(12)
       .font('Helvetica')
       .fillColor('#000000')
       .text(content.footer, 0, footerY, { align: 'center', width: doc.page.width });
    }

    doc.end();

    // Wait for PDF to be written
    await new Promise((resolve) => {
      doc.on('end', resolve);
    });

    // Create certificate record
    const certificate = await Certificate.create({
      user: userId,
      course: courseId,
      certificateNumber,
      verificationId,
      qrCodeUrl: qrFilename ? `/uploads/certificates/qr-codes/${qrFilename}` : null,
      template: template?._id,
      pdfUrl: `/uploads/certificates/${filename}`,
      issuedBy: course.trainer?._id,
      metadata: {
        completionDate: metadata.completionDate || new Date(),
        score: metadata.score,
        grade: metadata.grade,
      },
    });

    return certificate;
  } catch (error) {
    logger.error('Certificate generation error:', error);
    throw error;
  }
};

/**
 * Regenerate certificate PDF (single-page layout) and overwrite existing file.
 * Use when serving view/download so old 2-page PDFs become 1 page.
 */
export const regenerateCertificatePdf = async (certificate) => {
  try {
    const cert = certificate._doc ? certificate : certificate.toObject?.() || certificate;
    const user = cert.user?.email ? cert.user : await User.findById(cert.user);
    const course = cert.course?.title ? cert.course : await Course.findById(cert.course).populate('trainer', 'profile');
    if (!user || !course) return;

    let template = null;
    if (cert.template) {
      template = await CertificateTemplate.findById(cert.template);
    } else {
      template = await CertificateTemplate.findOne({
        organization: course.organization,
        isDefault: true,
        isActive: true,
      }) ||
      await CertificateTemplate.findOne({
        organization: null,
        isDefault: true,
        isActive: true,
      });
    }

    const design = template?.design || {};
    const content = template?.content || {};
    const layout = design.layout || 'landscape';
    const certificateNumber = cert.certificateNumber;
    const verificationId = cert.verificationId;

    const uploadPath = process.env.UPLOAD_PATH
      ? path.resolve(process.env.UPLOAD_PATH)
      : path.join(process.cwd(), 'uploads');
    const certPath = path.join(uploadPath, 'certificates');
    const qrPath = path.join(uploadPath, 'certificates', 'qr-codes');
    const relativePath = (cert.pdfUrl || '').replace(/^\/?uploads\/?/, '').trim() || `certificates/certificate-${certificateNumber}.pdf`;
    const filepath = path.join(uploadPath, relativePath);
    const tmpFilepath = filepath + '.tmp';

    if (!fs.existsSync(certPath)) fs.mkdirSync(certPath, { recursive: true });
    if (!fs.existsSync(qrPath)) fs.mkdirSync(qrPath, { recursive: true });

    const baseUrl = process.env.FRONTEND_URL || process.env.BACKEND_URL || 'http://localhost:5173';
    const verificationUrl = `${baseUrl}/verify/${verificationId}`;
    let qrFilepath = path.join(qrPath, `qr-${certificateNumber}.png`);
    if (design.qrCode?.show !== false && !fs.existsSync(qrFilepath)) {
      await generateQRCode(verificationUrl, qrFilepath);
    }
    if (design.qrCode?.show === false) qrFilepath = null;

    const issuedDate = cert.issuedAt || cert.metadata?.completionDate || new Date();

    const doc = new PDFDocument({ size: 'LETTER', layout, margin: 50 });
    doc.pipe(fs.createWriteStream(tmpFilepath));

    if (design.backgroundColor) {
      doc.rect(0, 0, doc.page.width, doc.page.height).fillColor(design.backgroundColor).fill();
    }
    if (design.borderColor && design.borderWidth) {
      doc.rect(design.borderWidth, design.borderWidth, doc.page.width - design.borderWidth * 2, doc.page.height - design.borderWidth * 2)
        .strokeColor(design.borderColor).lineWidth(design.borderWidth).stroke();
    }
    if (design.logo?.url && fs.existsSync(design.logo.url)) {
      let logoX = (doc.page.width - (design.logo.width || 150)) / 2;
      doc.image(design.logo.url, logoX, 50, { width: design.logo.width || 150, height: design.logo.height || 150 });
    }

    const titleStyle = design.titleStyle || {};
    doc.fontSize(titleStyle.fontSize || 40).font(titleStyle.fontFamily || 'Helvetica-Bold').fillColor(titleStyle.color || '#000000')
      .text(content.title || 'Certificate of Completion', { align: 'center', y: design.logo?.url ? 220 : 100 });
    doc.moveDown();
    doc.fontSize(20).font('Helvetica').fillColor('#000000').text(content.subtitle || 'This is to certify that', { align: 'center' });
    const recipientStyle = design.recipientStyle || {};
    doc.moveDown();
    doc.fontSize(recipientStyle.fontSize || 30).font(recipientStyle.fontFamily || 'Helvetica-Bold').fillColor(recipientStyle.color || '#000000')
      .text(`${user.profile?.firstName || ''} ${user.profile?.lastName || user.email}`.trim(), { align: 'center' });
    doc.moveDown();
    doc.fontSize(20).font('Helvetica').fillColor('#000000').text(content.body || 'has successfully completed the course', { align: 'center' });
    const courseStyle = design.courseStyle || {};
    doc.moveDown();
    doc.fontSize(courseStyle.fontSize || 24).font(courseStyle.fontFamily || 'Helvetica-Bold').fillColor(courseStyle.color || '#000000')
      .text(course.title, { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(16).font('Helvetica').fillColor('#000000').text(`Certificate Number: ${certificateNumber}`, { align: 'center' });
    doc.moveDown();
    doc.fontSize(14).font('Helvetica').fillColor('#000000')
      .text(`Issued on ${new Date(issuedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, { align: 'center' });

    if (design.qrCode?.show !== false && qrFilepath && fs.existsSync(qrFilepath)) {
      const qrSize = design.qrCode?.size || 100;
      const qrY = doc.page.height - qrSize - 50;
      let qrX = doc.page.width - qrSize - 50;
      if (design.qrCode?.position === 'bottom-center') qrX = (doc.page.width - qrSize) / 2;
      else if (design.qrCode?.position === 'bottom-left') qrX = 50;
      doc.image(qrFilepath, qrX, qrY, { width: qrSize, height: qrSize });
    }

    const pageHeight = doc.page.height;
    const sigY = pageHeight - 120;
    const issuerY = pageHeight - 85;
    const footerY = pageHeight - 35;
    if (design.signature?.show !== false) {
      let sigX = 100;
      if (design.signature?.position === 'center') sigX = doc.page.width / 2 - 100;
      else if (design.signature?.position === 'right') sigX = doc.page.width - 200;
      doc.fontSize(14).fillColor('#000000').text('_________________________', sigX, sigY, { align: 'left' })
        .font('Helvetica').text(design.signature?.label || 'Trainer Signature', sigX, sigY + 20, { align: 'left' });
    }
    const issuerName = content.issuer || 'LMS Portal';
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#000000')
      .text(issuerName, 0, issuerY, { align: 'center', width: doc.page.width });
    if (content.footer) {
      doc.fontSize(12).font('Helvetica').fillColor('#000000')
        .text(content.footer, 0, footerY, { align: 'center', width: doc.page.width });
    }

    doc.end();
    await new Promise((resolve) => { doc.on('end', resolve); });
    if (fs.existsSync(tmpFilepath) && fs.statSync(tmpFilepath).size > 0) {
      fs.renameSync(tmpFilepath, filepath);
    } else if (fs.existsSync(tmpFilepath)) {
      fs.unlinkSync(tmpFilepath);
    }
  } catch (err) {
    logger.warn('Regenerate certificate PDF failed:', err.message);
  }
};

