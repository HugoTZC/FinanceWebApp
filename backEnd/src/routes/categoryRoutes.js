const express = require('express');
const categoryController = require('../controllers/categoryController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// All routes are protected
router.use(protect);

// Category routes
router.get('/default', categoryController.getDefaultCategories);
router.get('/', categoryController.getAllCategories);
router.get('/type/:type', categoryController.getCategoriesByType);

// User category routes
router.route('/user')
  .get(categoryController.getUserCategories)
  .post(categoryController.createUserCategory);

router.route('/user/:id')
  .get(categoryController.getUserCategory)
  .patch(categoryController.updateUserCategory)
  .delete(categoryController.deleteUserCategory);

module.exports = router;