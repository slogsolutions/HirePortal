const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/roles.middleware');
const {
  createUser,
  getUsers,
  updateUser,
  deleteUser
} = require('../controllers/user.controller');

const router = express.Router();

// Apply protect and admin middleware to all routes
router.use(protect);
router.use(requireRole('admin'));

// User management routes
router.route('/')
  .post(createUser)
  .get(getUsers);

router.route('/:id')
  .put(updateUser)
  .delete(deleteUser);

module.exports = router;
