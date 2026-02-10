import dotenv from 'dotenv';
import Course from '../models/Course.js';
import connectDB from '../config/database.js';

dotenv.config();

/**
 * Course-specific tutorial videos (YouTube).
 * Matched by keywords in course title (case-insensitive).
 * First matching rule wins.
 * Order matters - more specific matches should come first.
 */
const COURSE_TUTORIALS = [
  // Frontend Frameworks (specific first)
  {
    keywords: ['react', 'reactjs', 'react.js'],
    url: 'https://www.youtube.com/watch?v=bMknfKXIFA8',
    title: "React Course - Beginner's Tutorial",
    desc: 'freeCodeCamp – React JS Full Course',
  },
  {
    keywords: ['vue', 'vuejs', 'vue.js'],
    url: 'https://www.youtube.com/watch?v=FXpIoQ_rT_c',
    title: 'Vue.js Course for Beginners',
    desc: 'freeCodeCamp – Vue.js Tutorial',
  },
  {
    keywords: ['angular'],
    url: 'https://www.youtube.com/watch?v=3qBXWUpoPHo',
    title: 'Angular Course for Beginners'
    desc: 'freeCodeCamp – Angular Tutorial',
  },
  {
    keywords: ['next.js', 'nextjs'],
    url: 'https://www.youtube.com/watch?v=__mSgDEOyv8',
    title: 'Next.js Tutorial for Beginners',
    desc: 'freeCodeCamp – Next.js Full Course',
  },
  
  // Programming Languages
  {
    keywords: ['javascript', 'js '],
    url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
    title: 'JavaScript Tutorial for Beginners',
    desc: 'freeCodeCamp – Learn JavaScript - Full Course for Beginners',
  },
  {
    keywords: ['typescript', 'ts '],
    url: 'https://www.youtube.com/watch?v=30LWjhZzg50',
    title: 'TypeScript Course for Beginners',
    desc: 'freeCodeCamp – TypeScript Tutorial',
  },
  {
    keywords: ['python'],
    url: 'https://www.youtube.com/watch?v=_uQrJ0TkZlc',
    title: 'Python Tutorial for Beginners',
    desc: 'Programming with Mosh – Learn Python',
  },
  {
    keywords: ['java'],
    url: 'https://www.youtube.com/watch?v=eIrMbAQSU34',
    title: 'Java Tutorial for Beginners',
    desc: 'freeCodeCamp – Java Programming Full Course',
  },
  {
    keywords: ['c++', 'cpp', 'c plus plus'],
    url: 'https://www.youtube.com/watch?v=vLnPwxZdW4Y',
    title: 'C++ Tutorial for Beginners',
    desc: 'freeCodeCamp – C++ Programming Full Course',
  },
  {
    keywords: ['c#', 'csharp'],
    url: 'https://www.youtube.com/watch?v=GhQdlIFylQ8',
    title: 'C# Tutorial for Beginners',
    desc: 'freeCodeCamp – C# Programming Full Course',
  },
  {
    keywords: ['php'],
    url: 'https://www.youtube.com/watch?v=OK_JCtrrv-c',
    title: 'PHP Tutorial for Beginners',
    desc: 'freeCodeCamp – PHP Programming Full Course',
  },
  {
    keywords: ['ruby'],
    url: 'https://www.youtube.com/watch?v=t_ispmWmdjY',
    title: 'Ruby Tutorial for Beginners',
    desc: 'freeCodeCamp – Ruby Programming Full Course',
  },
  {
    keywords: ['go', 'golang'],
    url: 'https://www.youtube.com/watch?v=un6ZyFkqFKo',
    title: 'Go Programming Tutorial',
    desc: 'freeCodeCamp – Go Programming Full Course',
  },
  {
    keywords: ['rust'],
    url: 'https://www.youtube.com/watch?v=zF34dRivLOw',
    title: 'Rust Programming Tutorial',
    desc: 'freeCodeCamp – Rust Programming Full Course',
  },
  
  // Backend & Server
  {
    keywords: ['node', 'nodejs', 'node.js'],
    url: 'https://www.youtube.com/watch?v=Oe421EPjeBE',
    title: 'Node.js Full Course for Beginners',
    desc: 'freeCodeCamp – Node.js Tutorial',
  },
  {
    keywords: ['express', 'expressjs'],
    url: 'https://www.youtube.com/watch?v=SccSCuHhOw0',
    title: 'Express.js Tutorial',
    desc: 'freeCodeCamp – Express.js Full Course',
  },
  {
    keywords: ['django'],
    url: 'https://www.youtube.com/watch?v=F5mRW0jo-U4',
    title: 'Django Tutorial for Beginners',
    desc: 'freeCodeCamp – Django Full Course',
  },
  {
    keywords: ['flask'],
    url: 'https://www.youtube.com/watch?v=Z1RJmh_OqeA',
    title: 'Flask Tutorial for Beginners',
    desc: 'freeCodeCamp – Flask Full Course',
  },
  {
    keywords: ['spring', 'spring boot'],
    url: 'https://www.youtube.com/watch?v=vtPkZShrvXQ',
    title: 'Spring Boot Tutorial',
    desc: 'freeCodeCamp – Spring Boot Full Course',
  },
  
  // Databases
  {
    keywords: ['mongodb', 'mongo'],
    url: 'https://www.youtube.com/watch?v=-56x56UppqQ',
    title: 'MongoDB Tutorial for Beginners',
    desc: 'Web Dev Simplified – MongoDB Full Course',
  },
  {
    keywords: ['mysql'],
    url: 'https://www.youtube.com/watch?v=7S_tz1z_5bA',
    title: 'MySQL Tutorial for Beginners',
    desc: 'freeCodeCamp – MySQL Full Course',
  },
  {
    keywords: ['postgresql', 'postgres'],
    url: 'https://www.youtube.com/watch?v=qw--VYLpxG4',
    title: 'PostgreSQL Tutorial',
    desc: 'freeCodeCamp – PostgreSQL Full Course',
  },
  {
    keywords: ['sql', 'database'],
    url: 'https://www.youtube.com/watch?v=HXV3zeQKqGY',
    title: 'SQL Tutorial for Beginners',
    desc: 'freeCodeCamp – SQL Full Course',
  },
  {
    keywords: ['redis'],
    url: 'https://www.youtube.com/watch?v=G1rOthIU-uo',
    title: 'Redis Tutorial',
    desc: 'freeCodeCamp – Redis Full Course',
  },
  
  // Web Development
  {
    keywords: ['html', 'css', 'web development'],
    url: 'https://www.youtube.com/watch?v=qz0aGYrrlhU',
    title: 'HTML & CSS Full Course',
    desc: 'freeCodeCamp – HTML CSS Tutorial',
  },
  {
    keywords: ['bootstrap'],
    url: 'https://www.youtube.com/watch?v=Jyvffr3aCp0',
    title: 'Bootstrap Tutorial',
    desc: 'freeCodeCamp – Bootstrap Full Course',
  },
  {
    keywords: ['tailwind', 'tailwindcss'],
    url: 'https://www.youtube.com/watch?v=4wGmylafgM4',
    title: 'Tailwind CSS Tutorial',
    desc: 'freeCodeCamp – Tailwind CSS Full Course',
  },
  {
    keywords: ['sass', 'scss'],
    url: 'https://www.youtube.com/watch?v=akDIJa0AP5c',
    title: 'SASS Tutorial',
    desc: 'freeCodeCamp – SASS Full Course',
  },
  
  // DevOps & Tools
  {
    keywords: ['git', 'github'],
    url: 'https://www.youtube.com/watch?v=RGOj5yH7evk',
    title: 'Git and GitHub for Beginners',
    desc: 'freeCodeCamp – Git Tutorial',
  },
  {
    keywords: ['docker'],
    url: 'https://www.youtube.com/watch?v=fqMOX6JJhGo',
    title: 'Docker Tutorial for Beginners',
    desc: 'freeCodeCamp – Docker Full Course',
  },
  {
    keywords: ['kubernetes', 'k8s'],
    url: 'https://www.youtube.com/watch?v=X48VuDVv0do',
    title: 'Kubernetes Tutorial',
    desc: 'freeCodeCamp – Kubernetes Full Course',
  },
  {
    keywords: ['aws', 'amazon web services'],
    url: 'https://www.youtube.com/watch?v=ulprqHHWlng',
    title: 'AWS Tutorial for Beginners',
    desc: 'freeCodeCamp – AWS Full Course',
  },
  {
    keywords: ['linux'],
    url: 'https://www.youtube.com/watch?v=ROjZy1WbCIA',
    title: 'Linux Tutorial for Beginners',
    desc: 'freeCodeCamp – Linux Full Course',
  },
  
  // Computer Science & Theory
  {
    keywords: ['operating system', 'operating systems', 'os ', 'intro to os', 'introduction to os', 'intro to operating'],
    url: 'https://www.youtube.com/watch?v=vBURTt97EkA',
    title: 'Introduction to Operating Systems',
    desc: 'Neso Academy – Operating System',
  },
  {
    keywords: ['data structure', 'data structures'],
    url: 'https://www.youtube.com/watch?v=RBSGKlAvoiM',
    title: 'Data Structures and Algorithms',
    desc: 'freeCodeCamp – DSA Full Course',
  },
  {
    keywords: ['algorithm', 'algorithms'],
    url: 'https://www.youtube.com/watch?v=8hly31xKli0',
    title: 'Algorithms and Data Structures',
    desc: 'freeCodeCamp – Algorithms Full Course',
  },
  {
    keywords: ['machine learning', 'ml ', 'ai ', 'artificial intelligence'],
    url: 'https://www.youtube.com/watch?v=aircAruvnKk',
    title: 'Machine Learning Course',
    desc: '3Blue1Brown – Neural Networks',
  },
  {
    keywords: ['deep learning'],
    url: 'https://www.youtube.com/watch?v=aircAruvnKk',
    title: 'Deep Learning Course',
    desc: '3Blue1Brown – Neural Networks',
  },
  
  // Mobile Development
  {
    keywords: ['react native'],
    url: 'https://www.youtube.com/watch?v=0-S5a0eXPoc',
    title: 'React Native Tutorial',
    desc: 'freeCodeCamp – React Native Full Course',
  },
  {
    keywords: ['flutter'],
    url: 'https://www.youtube.com/watch?v=1ukSR1GRtMU',
    title: 'Flutter Tutorial for Beginners',
    desc: 'freeCodeCamp – Flutter Full Course',
  },
  {
    keywords: ['android'],
    url: 'https://www.youtube.com/watch?v=fis26HvvDII',
    title: 'Android Development Tutorial',
    desc: 'freeCodeCamp – Android Development Full Course',
  },
  {
    keywords: ['ios', 'swift'],
    url: 'https://www.youtube.com/watch?v=comQ1-x2a1Q',
    title: 'iOS Development Tutorial',
    desc: 'freeCodeCamp – iOS Development Full Course',
  },
  
  // Testing
  {
    keywords: ['testing', 'unit test', 'jest'],
    url: 'https://www.youtube.com/watch?v=7r4xVDI2vho',
    title: 'Software Testing Tutorial',
    desc: 'freeCodeCamp – Testing Full Course',
  },
  
  // Security
  {
    keywords: ['cybersecurity', 'cyber security', 'security'],
    url: 'https://www.youtube.com/watch?v=inWWhr5tnEA',
    title: 'Cybersecurity Course',
    desc: 'freeCodeCamp – Cybersecurity Full Course',
  },
  
  // Blockchain
  {
    keywords: ['blockchain'],
    url: 'https://www.youtube.com/watch?v=gyMwXuJrbJQ',
    title: 'Blockchain Tutorial',
    desc: 'freeCodeCamp – Blockchain Full Course',
  },
  {
    keywords: ['solidity'],
    url: 'https://www.youtube.com/watch?v=ipwxYa-F1uY',
    title: 'Solidity Tutorial',
    desc: 'freeCodeCamp – Solidity Full Course',
  },
];

function matchTutorial(courseTitle) {
  if (!courseTitle || typeof courseTitle !== 'string') {
    return null;
  }
  
  const t = courseTitle.toLowerCase().trim();
  
  // Try multi-word phrases first (more specific matches)
  for (const rule of COURSE_TUTORIALS) {
    for (const keyword of rule.keywords) {
      const kw = keyword.toLowerCase().trim();
      // For multi-word keywords, use direct substring match
      if (kw.includes(' ') && t.includes(kw)) {
        return { url: rule.url, title: rule.title };
      }
    }
  }
  
  // Then try exact word matches (single words with boundaries)
  for (const rule of COURSE_TUTORIALS) {
    for (const keyword of rule.keywords) {
      const kw = keyword.toLowerCase().trim();
      // Skip if already matched as multi-word
      if (kw.includes(' ')) continue;
      // Check for word boundaries to avoid partial matches
      const wordBoundaryRegex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (wordBoundaryRegex.test(t)) {
        return { url: rule.url, title: rule.title };
      }
    }
  }
  
  // Fallback to substring matching (less specific but catches more)
  for (const rule of COURSE_TUTORIALS) {
    if (rule.keywords.some((k) => t.includes(k.toLowerCase()))) {
      return { url: rule.url, title: rule.title };
    }
  }
  
  return null;
}

const addTutorialVideos = async () => {
  try {
    // Check for force flag
    const forceUpdate = process.argv.includes('--force') || process.argv.includes('-f');
    
    await connectDB();
    console.log('✓ Connected to MongoDB\n');
    
    if (forceUpdate) {
      console.log('⚠ Force update mode: Will overwrite existing tutorial videos\n');
    }

    const courses = await Course.find({});
    console.log(`Found ${courses.length} courses\n`);

    if (courses.length === 0) {
      console.log('⚠ No courses found. Create some courses first.\n');
      process.exit(0);
    }

    let updated = 0;
    let skipped = 0;
    let noMatch = 0;
    let alreadyHasVideo = 0;

    for (const course of courses) {
      // Skip if course already has a tutorial video (unless force update)
      if (course.tutorialVideo?.url && !forceUpdate) {
        console.log(`[SKIP] "${course.title}" – already has tutorial video (use --force to overwrite)`);
        alreadyHasVideo++;
        continue;
      }

      const match = matchTutorial(course.title);

      if (!match) {
        console.log(`[NO MATCH] "${course.title}" – no matching tutorial; skipped`);
        noMatch++;
        continue;
      }

      course.tutorialVideo = {
        url: match.url,
        title: match.title,
      };

      await course.save();
      console.log(`[UPDATED] "${course.title}" → ${match.title}`);
      updated++;
    }

    console.log('\n----------------------------------------------------------------------');
    console.log('SUMMARY');
    console.log('----------------------------------------------------------------------');
    console.log(`Total courses: ${courses.length}`);
    console.log(`Updated with correct tutorial: ${updated}`);
    console.log(`Already had tutorial video: ${alreadyHasVideo}`);
    console.log(`No matching tutorial (skipped): ${noMatch}`);
    console.log('----------------------------------------------------------------------\n');

    if (updated > 0) {
      console.log('✓ Course-specific tutorial videos set.\n');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error adding tutorial videos:', err);
    process.exit(1);
  }
};

addTutorialVideos();
