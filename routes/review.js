const express = require('express');
const router = express.Router();

const authMiddleware = require(`${__dirname}/../middlewares/authMiddleware`);
const authorization = require(`${__dirname}/../middlewares/authorization`);
const reviewController = require(`${__dirname}/../controllers/review/review`);

// Get reviews for a product
router.get('/product/:productId', reviewController.getReviewsByProduct);

router.get('/getBestReviews', reviewController.getBestReviews);
router.use(authMiddleware.protected);

// Create review
router.post('/', reviewController.createReview);

// Get reviews by user
router.get('/userReviews', reviewController.getReviewsByUser);






// Update review
router.put('/:reviewId', reviewController.updateReview);

// Delete review
router.delete('/:reviewId', reviewController.deleteReview);

module.exports = router;
