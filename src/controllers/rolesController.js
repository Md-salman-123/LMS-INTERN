// Defined roles & permissions (Super Admin / System Owner configurable concept)
const ROLES = [
  {
    key: 'super_admin',
    label: 'Super Admin (System Owner)',
    description: 'Full control over the entire LMS platform',
    permissions: [
      'Create / manage Admins, Trainers, Students',
      'Define roles & permissions',
      'Global system settings (branding, domain, language)',
      'Manage all courses (view/edit/delete)',
      'Multi-organization / institution control',
      'View full analytics & audit logs',
      'Manage payments, subscriptions & plans',
      'Security settings (2FA, backups, access rules)',
    ],
  },
  {
    key: 'admin',
    label: 'Admin (Organization / Platform Manager)',
    description: 'Manages daily operations but not the system itself',
    permissions: [
      'Create & manage Trainers and Students',
      'Approve / reject courses',
      'Assign trainers to courses',
      'Manage categories & course visibility',
      'View reports for their organization',
      'Handle student enrollments',
      'Moderate content & discussions',
    ],
    cannot: [
      'Manage Super Admin',
      'Change global system settings',
      'Access other organizations\' data',
    ],
  },
  {
    key: 'trainer',
    label: 'Trainer',
    description: 'Instructor and content creator',
    permissions: [
      'Create and manage own courses',
      'Manage batches, assignments, quizzes',
      'View student progress',
    ],
  },
  {
    key: 'student',
    label: 'Student',
    description: 'Learner',
    permissions: ['Enroll in courses', 'View content', 'Submit assignments', 'Track progress'],
  },
  { key: 'learner', label: 'Learner', description: 'Alias for Student', permissions: [] },
  { key: 'instructor', label: 'Instructor', description: 'Alias for Trainer', permissions: [] },
];

export const getRoles = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, data: ROLES });
  } catch (error) {
    next(error);
  }
};
