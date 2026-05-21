const express =
require("express");

const router =
express.Router();

const {
createCoupon,
getCoupons,
getCoupon,
updateCoupon,
deleteCoupon,
applyCoupon }=require(`${__dirname}/../controllers/coupon/coupon`);
const authMiddleware = require(`${__dirname}/../middlewares/authMiddleware`);
const {role}=require(`${__dirname}/../middlewares/authorization`)


router.use(authMiddleware.protected);
router.get("/",getCoupons);
router.get("/:id",getCoupon);
router.post("/apply",applyCoupon);


router.use(role("superadmin" ,"admin"));
router.post("/",createCoupon);
router.put("/:id",updateCoupon);
router.delete("/:id",deleteCoupon);



module.exports=router;