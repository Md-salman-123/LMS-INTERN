import dotenv from 'dotenv';
import connectDB from '../config/database.js';
import Course from '../models/Course.js';
import Module from '../models/Module.js';
import Lesson from '../models/Lesson.js';
import User from '../models/User.js';

dotenv.config();

/**
 * Operating System course – modules and video lessons.
 * Videos from Neso Academy (English) – structured OS course with modules.
 * Source: Neso Academy YouTube playlist (Operating System).
 */
const OS_COURSE_VIDEOS = [
  {
    moduleTitle: 'Introduction to Operating Systems',
    moduleDescription: 'Overview of operating systems, design goals, and computer system operation.',
    lessons: [
      {
        title: 'Introduction to Operating Systems',
        videoId: 'vBURTt97EkA',
        duration: 17,
        name: 'Neso Academy – Introduction to OS',
      },
      {
        title: 'Operating System Design & Implementation',
        videoId: 't_McsJ1RGQg',
        duration: 15,
        name: 'Neso Academy – OS Design & Implementation',
      },
      {
        title: 'Basics of Computer System Operation',
        videoId: 'VjPgYcQqqN0',
        duration: 12,
        name: 'Neso Academy – Computer System Operation',
      },
    ],
  },
  {
    moduleTitle: 'Process & CPU Scheduling',
    moduleDescription: 'Process concepts, CPU scheduling algorithms, and priority scheduling.',
    lessons: [
      {
        title: 'Introduction to CPU Scheduling',
        videoId: 'EWkQl0n0w5M',
        duration: 14,
        name: 'Neso Academy – CPU Scheduling',
      },
      {
        title: 'Scheduling Algorithms - Priority Scheduling',
        videoId: 'yKD3pcFvGmY',
        duration: 12,
        name: 'Neso Academy – Priority Scheduling',
      },
      {
        title: 'Priority Scheduling - Solved Problem',
        videoId: 'Z2KsfhEJOFA',
        duration: 10,
        name: 'Neso Academy – Priority Scheduling Solved',
      },
    ],
  },
  {
    moduleTitle: 'Memory Management',
    moduleDescription: 'Memory hierarchy, allocation, and virtual memory concepts.',
    lessons: [
      {
        title: 'Introduction to Memory',
        videoId: 'PujjqfUhtNo',
        duration: 15,
        name: 'Neso Academy – Introduction to Memory',
      },
    ],
  },
  {
    moduleTitle: 'Process Synchronization',
    moduleDescription: 'Cooperating processes, critical sections, and synchronization mechanisms.',
    lessons: [
      {
        title: 'Monitors in Operating Systems',
        videoId: 'ufdQ0GR855M',
        duration: 12,
        name: 'Neso Academy – Monitors',
      },
    ],
  },
  {
    moduleTitle: 'Deadlocks',
    moduleDescription: 'Deadlock characterization, prevention, avoidance, and recovery.',
    lessons: [
      {
        title: 'Introduction to Deadlocks',
        videoId: '7bnpFpYZtVk',
        duration: 20,
        name: 'Neso Academy – Deadlocks',
      },
    ],
  },
];

function youtubeUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

const seedOSCourseVideos = async () => {
  try {
    await connectDB();
    console.log('✓ Connected to MongoDB\n');

    // Find Operating System course (by title)
    const osCourse = await Course.findOne({
      $or: [
        { title: /operating system/i },
        { title: /operating systems/i },
        { title: /intro to os/i },
        { title: /introduction to os/i },
      ],
    });

    if (!osCourse) {
      console.log('⚠ No Operating System course found in the database.');
      console.log('  Create a course with title containing "Operating System" or "Introduction to OS", then run this script again.\n');
      process.exit(1);
    }

    // Ensure course has a trainer (required for modules/lessons)
    let trainerId = osCourse.trainer;
    if (!trainerId) {
      const trainer = await User.findOne({ role: { $in: ['trainer', 'admin', 'super_admin'] } });
      if (!trainer) {
        console.log('⚠ No trainer/admin user found. Run npm run seed:all first.\n');
        process.exit(1);
      }
      trainerId = trainer._id;
      osCourse.trainer = trainerId;
      await osCourse.save();
      console.log(`✓ Assigned trainer to course: ${trainer.email}\n`);
    }

    // Delete existing modules and their lessons for this course
    const existingModules = await Module.find({ course: osCourse._id });
    for (const mod of existingModules) {
      await Lesson.deleteMany({ module: mod._id });
      await Module.findByIdAndDelete(mod._id);
    }
    osCourse.modules = [];
    await osCourse.save();
    console.log(`✓ Cleared ${existingModules.length} existing module(s) and their lessons.\n`);

    console.log(`Seeding OS course: "${osCourse.title}"\n`);

    let totalLessons = 0;

    for (let i = 0; i < OS_COURSE_VIDEOS.length; i++) {
      const modData = OS_COURSE_VIDEOS[i];
      const module = await Module.create({
        title: modData.moduleTitle,
        description: modData.moduleDescription,
        course: osCourse._id,
        order: i + 1,
      });

      osCourse.modules.push(module._id);

      for (let j = 0; j < modData.lessons.length; j++) {
        const les = modData.lessons[j];
        const videoUrl = youtubeUrl(les.videoId);
        const lesson = await Lesson.create({
          title: les.title,
          content: `Watch: ${les.title}. Video from Neso Academy.`,
          type: 'video',
          module: module._id,
          order: j + 1,
          duration: les.duration || 10,
          resources: [
            {
              type: 'video',
              url: videoUrl,
              name: les.name || les.title,
            },
          ],
        });
        module.lessons.push(lesson._id);
        totalLessons++;
        console.log(`  [${i + 1}.${j + 1}] ${les.title}`);
      }

      await module.save();
      console.log(`  → Module "${modData.moduleTitle}" (${modData.lessons.length} lessons)\n`);
    }

    await osCourse.save();

    // Update course tutorial video to first OS intro video
    const firstVideo = OS_COURSE_VIDEOS[0].lessons[0];
    osCourse.tutorialVideo = {
      url: youtubeUrl(firstVideo.videoId),
      title: firstVideo.title,
    };
    await osCourse.save();

    console.log('----------------------------------------------------------------------');
    console.log('SUMMARY');
    console.log('----------------------------------------------------------------------');
    console.log(`Course: ${osCourse.title}`);
    console.log(`Modules: ${OS_COURSE_VIDEOS.length}`);
    console.log(`Lessons (videos): ${totalLessons}`);
    console.log('Tutorial video set to: ' + firstVideo.title);
    console.log('----------------------------------------------------------------------\n');
    console.log('✓ Operating System course updated with modules and video lessons.\n');

    process.exit(0);
  } catch (err) {
    console.error('Error seeding OS course videos:', err);
    process.exit(1);
  }
};

seedOSCourseVideos();
