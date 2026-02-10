import dotenv from 'dotenv';
import CertificateTemplate from '../models/CertificateTemplate.js';
import User from '../models/User.js';
import Organization from '../models/Organization.js';
import connectDB from '../config/database.js';

dotenv.config();

const TEMPLATE_NAME = 'LMS Portal';

const seedCertificateTemplate = async () => {
  try {
    await connectDB();

    const admin = await User.findOne({ role: { $in: ['super_admin', 'admin'] } });
    if (!admin) {
      console.log('No admin user found. Run: npm run seed:admin');
      process.exit(1);
    }

    const organization = await Organization.findOne();
    const orgId = organization ? organization._id : null;

    const existing = await CertificateTemplate.findOne({
      organization: orgId,
      isDefault: true,
      isActive: true,
    });

    if (existing) {
      console.log('Default certificate template already exists:', existing.name);
      process.exit(0);
    }

    await CertificateTemplate.updateMany(
      { organization: orgId, isDefault: true },
      { isDefault: false }
    );

    const template = await CertificateTemplate.create({
      name: TEMPLATE_NAME,
      description: 'Default certificate template for LMS Portal',
      organization: orgId,
      createdBy: admin._id,
      isDefault: true,
      isActive: true,
      design: {
        layout: 'landscape',
        backgroundColor: '#FFFFFF',
        borderColor: '#1e40af',
        borderWidth: 4,
        titleStyle: {
          fontSize: 40,
          fontFamily: 'Helvetica-Bold',
          color: '#000000',
          alignment: 'center',
        },
        recipientStyle: {
          fontSize: 30,
          fontFamily: 'Helvetica-Bold',
          color: '#000000',
          alignment: 'center',
        },
        courseStyle: {
          fontSize: 24,
          fontFamily: 'Helvetica-Bold',
          color: '#000000',
          alignment: 'center',
        },
        signature: {
          show: true,
          position: 'left',
          label: 'Authorized Signature',
        },
        qrCode: {
          show: true,
          position: 'bottom-right',
          size: 100,
        },
      },
      content: {
        title: 'Certificate of Completion',
        subtitle: 'This is to certify that',
        body: 'has successfully completed the course',
        issuer: 'LMS Portal',
      },
    });

    console.log('========================================');
    console.log('Certificate template created successfully');
    console.log('========================================');
    console.log('Name:', template.name);
    console.log('Default: true');
    console.log('Issuer: LMS Portal');
    console.log('========================================');
    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seedCertificateTemplate();
