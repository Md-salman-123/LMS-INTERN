// Database indexes for optimal performance
import User from '../models/User.js';
import Course from '../models/Course.js';
import Enrollment from '../models/Enrollment.js';
import Article from '../models/Article.js';
import Quiz from '../models/Quiz.js';

export const createIndexes = async () => {
  try {
    // User indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    await User.collection.createIndex({ organization: 1 });
    await User.collection.createIndex({ role: 1, status: 1 });

    // Course indexes
    await Course.collection.createIndex({ trainer: 1 });
    await Course.collection.createIndex({ organization: 1 });
    await Course.collection.createIndex({ status: 1 });
    await Course.collection.createIndex({ title: 'text', description: 'text' });

    // Enrollment indexes
    await Enrollment.collection.createIndex({ user: 1, course: 1 }, { unique: true });
    await Enrollment.collection.createIndex({ user: 1, status: 1 });
    await Enrollment.collection.createIndex({ course: 1 });

    // Article indexes
    await Article.collection.createIndex({ organization: 1 });
    await Article.collection.createIndex({ category: 1 });
    await Article.collection.createIndex({ title: 'text', content: 'text' });
    await Article.collection.createIndex({ tags: 1 });

    // Quiz indexes
    await Quiz.collection.createIndex({ course: 1 });

    console.log('Database indexes created successfully');
  } catch (error) {
    console.error('Error creating indexes:', error);
  }
};


