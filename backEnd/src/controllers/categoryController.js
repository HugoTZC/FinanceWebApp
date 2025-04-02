const CategoryModel = require("../models/categoryModel")
const asyncHandler = require("../utils/asyncHandler")
const { AppError } = require("../middleware/errorHandler")

/**
 * Get all categories
 * @route GET /api/categories
 * @access Private
 */
const getCategories = asyncHandler(async (req, res) => {
  const { type } = req.query

  const categories = await CategoryModel.getAll(req.user.id, type)

  res.status(200).json({
    success: true,
    count: categories.length,
    data: categories,
  })
})

/**
 * Get a category by ID
 * @route GET /api/categories/:id
 * @access Private
 */
const getCategory = asyncHandler(async (req, res) => {
  const category = await CategoryModel.getById(req.params.id, req.user.id)

  if (!category) {
    throw new AppError("Category not found", 404)
  }

  res.status(200).json({
    success: true,
    data: category,
  })
})

/**
 * Create a new category
 * @route POST /api/categories
 * @access Private
 */
const createCategory = asyncHandler(async (req, res) => {
  const { name, color, type } = req.body

  const category = await CategoryModel.create({
    user_id: req.user.id,
    name,
    color,
    type,
  })

  res.status(201).json({
    success: true,
    data: category,
  })
})

/**
 * Update a category
 * @route PUT /api/categories/:id
 * @access Private
 */
const updateCategory = asyncHandler(async (req, res) => {
  const { name, color, type } = req.body

  const category = await CategoryModel.update(req.params.id, req.user.id, {
    name,
    color,
    type,
  })

  if (!category) {
    throw new AppError("Category not found", 404)
  }

  res.status(200).json({
    success: true,
    data: category,
  })
})

/**
 * Delete a category
 * @route DELETE /api/categories/:id
 * @access Private
 */
const deleteCategory = asyncHandler(async (req, res) => {
  try {
    const success = await CategoryModel.delete(req.params.id, req.user.id)

    if (!success) {
      throw new AppError("Category not found", 404)
    }

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    })
  } catch (error) {
    if (error.message === "Cannot delete default category") {
      throw new AppError("Cannot delete default category", 400)
    }
    throw error
  }
})

/**
 * Get category spending
 * @route GET /api/categories/spending
 * @access Private
 */
const getCategorySpending = asyncHandler(async (req, res) => {
  const { year, month } = req.query

  if (!year || !month) {
    throw new AppError("Year and month are required", 400)
  }

  const spending = await CategoryModel.getCategorySpending(req.user.id, Number.parseInt(year), Number.parseInt(month))

  res.status(200).json({
    success: true,
    data: spending,
  })
})

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  getCategorySpending,
}

