const express = require('express');
const router = express.Router();
const authMiddleware = require(`${__dirname}/../middlewares/authMiddleware`);
const {role}=require(`${__dirname}/../middlewares/authorization`)
const orderUser = require(`${__dirname}/../controllers/order/user`);
const adminOrderUser=require(`${__dirname}/../controllers/order/admin`)
const upload = require(`${__dirname}/../config/multerConfig`);

// const multer  =require('multer');
// const strong=multer.memoryStorage();
// const uploads=multer({strong:strong})

router.get('/bestSeller', orderUser.bestSeller);
router.use(authMiddleware.protected);

// USER ROUTES
router.post('/', upload.single('file'), orderUser.createOrder);
router.get('/', orderUser.viewMyOrders);
router.get('/my/:id', orderUser.viewMyOrder);
router.patch('/cancel/:id', orderUser.cancelOrder);

router.get('/viewMyOrdersDeliverd', orderUser.viewMyOrdersDeliverd);




// ADMIN MIDDLEWARE
router.use(role("superadmin" ,"admin"));

// ADMIN ROUTES
router.get('/all',adminOrderUser.viewAllOrders);
router.get('/maybesell', adminOrderUser.maybesell);
router.get('/bestSellerAdmin',adminOrderUser.bestSellerAdmin);
router.get('/by-id/:id',  adminOrderUser.viewOrderById);
router.put('/status/:id', adminOrderUser.updateStatus);
router.put('/approve/:id',adminOrderUser.approvePayment);
router.put('/reject/:id', adminOrderUser.rejectPayment);
router.put('/note/:id',   adminOrderUser.addAdminNote);




module.exports = router;
