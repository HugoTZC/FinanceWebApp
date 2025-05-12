const categoryModel = require('../models/categoryModel');
const { AppError } = require('../utils/helpers');

/**
 * Get all default categories
 * @route GET /api/categories/default
 */
exports.getDefaultCategories = async (req, res, next) => {
  try {
    // Get default categories
    const categories = await categoryModel.getDefaultCategories();
    
    res.status(200).json({
      status: 'success',
      data: {
        categories
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all categories (default + user)
 * @route GET /api/categories
 */
exports.getAllCategories = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get all categories
    const categories = await categoryModel.getAllCategories(userId);
    
    res.status(200).json({
      status: 'success',
      data: {
        categories
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get categories by type
 * @route GET /api/categories/type/:type
 */
exports.getCategoriesByType = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type } = req.params;
    
    // Validate type
    if (!['income', 'expense'].includes(type)) {
      return next(new AppError('Invalid category type', 400));
    }
    
    // Get categories by type
    const categories = await categoryModel.getCategoriesByType(userId, type);
    
    res.status(200).json({
      status: 'success',
      data: {
        categories
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create user category
 * @route POST /api/categories
 */
exports.createUserCategory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, type, category_group, icon, color } = req.body;
    
    console.log('Creating category with data:', { userId, name, type, category_group, icon, color });
    
    // Create user category
    const category = await categoryModel.createUserCategory({
      user_id: userId,
      name,
      type,
      category_group,
      icon,
      color
    });
    
    console.log('Category created:', category);
    
    res.status(201).json({
      status: 'success',
      data: {
        category
      }
    });
  } catch (error) {
    console.error('Error creating category:', error);
    next(error);
  }
};

/**
 * Get user categories
 * @route GET /api/categories/user
 */
exports.getUserCategories = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get user categories
    const categories = await categoryModel.getUserCategories(userId);
    
    res.status(200).json({
      status: 'success',
      data: {
        categories
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get user category by ID
 * @route GET /api/categories/user/:id
 */
exports.getUserCategory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Get user category
    const category = await categoryModel.findUserCategoryById(id, userId);
    
    if (!category) {
      return next(new AppError('Category not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        category
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update user category
 * @route PATCH /api/categories/user/:id
 */
exports.updateUserCategory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { name, type, category_group, icon, color } = req.body;
    
    // Update user category
    const category = await categoryModel.updateUserCategory(id, userId, {
      name,
      type,
      category_group,
      icon,
      color
    });
    
    if (!category) {
      return next(new AppError('Category not found', 404));
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        category
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user category
 * @route DELETE /api/categories/user/:id
 */
exports.deleteUserCategory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Delete user category
    const success = await categoryModel.deleteUserCategory(id, userId);
    
    if (!success) {
      return next(new AppError('Category not found', 404));
    }
    
    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (error) {
    next(error);
  }
};