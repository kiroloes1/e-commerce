const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/authMiddleware");
const { role } = require("../middlewares/authorization");


const comboController = require(`${__dirname}/../controllers/order/compoOffer`);




// protect all routes
router.use(authMiddleware.protected);

// Get all Combo Offers
router.get("/", comboController.getComboOffers);

// Get single Combo Offer
router.get("/:id", comboController.getComboOfferById);

// Check usage (user auth required)
router.get(
  "/:comboId/usage",
  comboController.checkComboUsage
);

// allow only admin + superadmin
router.use(role("superadmin", "admin"));

// Create Combo Offer
router.post("/", comboController.createComboOffer);


// Update Combo Offer
router.put("/:id", comboController.updateComboOffer);

// Delete Combo Offer
router.delete("/:id", comboController.deleteComboOffer);

// Toggle active/inactive
router.patch("/:id/toggle", comboController.toggleComboStatus);



module.exports = router;