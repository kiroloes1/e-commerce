const express = require('express');
const router = express.Router();
const authMiddleware = require(`${__dirname}/../middlewares/authMiddleware`);
const authorization = require(`${__dirname}/../middlewares/authorization`);

const {
  createAbout,
  getAbout,
  updateAbout,
  deleteAbout,
  getWalletNumbers,
  addWalletNumber,
  deleteWalletNumber,
  updateWalletNumber
}  =require(`${__dirname}/../controllers/about/aboutController`)


router.get("/", getAbout);
router.get("/wallet", getWalletNumbers);

router.use(authMiddleware.protected);
router.use(authorization.role('admin'));

router.post("/", createAbout);

router.put("/", updateAbout);
router.delete("/", deleteAbout);



router.post("/wallet", addWalletNumber);
router.delete("/wallet", deleteWalletNumber);
router.put("/wallet", updateWalletNumber);

module.exports = router;
