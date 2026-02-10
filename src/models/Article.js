import mongoose from 'mongoose';

const articleVersionSchema = new mongoose.Schema({
  content: String,
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const articleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide an article title'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, 'Please provide article content'],
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
    },
    tags: [String],
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
    },
    versions: [articleVersionSchema],
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Save version before updating
articleSchema.pre('save', function (next) {
  if (this.isModified('content') && !this.isNew) {
    this.versions.push({
      content: this.content,
      updatedBy: this.author,
      updatedAt: new Date(),
    });
  }
  next();
});

const Article = mongoose.model('Article', articleSchema);

export default Article;


