import Article from '../models/Article.js';
import Category from '../models/Category.js';

// @desc    Get all articles
// @route   GET /api/articles
// @access  Private
export const getArticles = async (req, res, next) => {
  try {
    const { search, category, tag } = req.query;
    let query = {};

    if (req.user.organization) {
      query.organization = req.user.organization;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      query.category = category;
    }

    if (tag) {
      query.tags = { $in: [tag] };
    }

    const articles = await Article.find(query)
      .populate('author', 'email profile')
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: articles.length,
      data: articles,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single article
// @route   GET /api/articles/:id
// @access  Private
export const getArticle = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id)
      .populate('author', 'email profile')
      .populate('category', 'name');

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found',
      });
    }

    // Increment views
    article.views += 1;
    await article.save();

    res.status(200).json({
      success: true,
      data: article,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create article
// @route   POST /api/articles
// @access  Private/Trainer/Admin
export const createArticle = async (req, res, next) => {
  try {
    const { title, content, category, tags } = req.body;

    const article = await Article.create({
      title,
      content,
      category,
      tags: tags || [],
      author: req.user._id,
      organization: req.user.organization,
    });

    res.status(201).json({
      success: true,
      data: article,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update article
// @route   PUT /api/articles/:id
// @access  Private/Trainer/Admin
export const updateArticle = async (req, res, next) => {
  try {
    let article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found',
      });
    }

    // Check authorization
    if (
      article.author.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to update this article',
      });
    }

    const { title, content, category, tags } = req.body;

    if (title) article.title = title;
    if (content) article.content = content;
    if (category) article.category = category;
    if (tags) article.tags = tags;

    await article.save();

    res.status(200).json({
      success: true,
      data: article,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete article
// @route   DELETE /api/articles/:id
// @access  Private/Trainer/Admin
export const deleteArticle = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id);

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found',
      });
    }

    if (
      article.author.toString() !== req.user._id.toString() &&
      !['super_admin', 'admin'].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete this article',
      });
    }

    await article.deleteOne();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get article versions
// @route   GET /api/articles/:id/versions
// @access  Private
export const getArticleVersions = async (req, res, next) => {
  try {
    const article = await Article.findById(req.params.id).select('versions');

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found',
      });
    }

    res.status(200).json({
      success: true,
      data: article.versions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all categories
// @route   GET /api/categories
// @access  Private
export const getCategories = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.organization) {
      query.organization = req.user.organization;
    }

    const categories = await Category.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    const category = await Category.create({
      name,
      description,
      organization: req.user.organization,
    });

    res.status(201).json({
      success: true,
      data: category,
    });
  } catch (error) {
    next(error);
  }
};


