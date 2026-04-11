const express = require("express");
const router = express.Router();

const cartController = require(`${__dirname}/../controllers/cart/cartController`);
const authMiddleware = require(`${__dirname}/../middlewares/authMiddleware`);


router.use(authMiddleware.protected);


//  Get user cart
router.get("/", cartController.getCartByUser);


//  Create or Update cart (send full items array)
router.post("/", cartController.addToCart);

router.put("/", cartController.updateCart);


//  Delete cart
router.delete("/", cartController.deleteCartByUser);


module.exports = router;