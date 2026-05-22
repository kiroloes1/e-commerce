const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const { role } = require("../middlewares/authorization");

const offerController = require(`../controllers/order/offer`);

// protect all routes
router.use(authMiddleware.protected);



/**
 * GET ALL OFFERS
 */
router.get("/", offerController.getOffers);

router.get("/getProducts", offerController.getProducts);
router.get("/searchProducts", offerController.searchProducts);

router.get("/checkOfferUsage/:offerId/:productId", offerController.checkOfferUsage);


/**
 * GET SINGLE OFFER
 */
router.get("/:id", offerController.getOfferById);



// allow only admin + superadmin
router.use(role("superadmin", "admin"));

/**
 * CREATE OFFER
 */
router.post("/", offerController.createOffer);



/**
 * UPDATE OFFER
 */
router.put("/:id", offerController.updateOffer);

/**
 * DELETE OFFER
 */
router.delete("/:id", offerController.deleteOffer);

/**
 * TOGGLE OFFER STATUS (enable/disable)
 */
router.patch("/:id/toggle", offerController.toggleOfferStatus);

module.exports = router;
