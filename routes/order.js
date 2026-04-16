const express = require('express');
const router = express.Router();
const authMiddleware = require(`${__dirname}/../middlewares/authMiddleware`);
const authorization = require(`${__dirname}/../middlewares/authorization`);
const orderUser = require(`${__dirname}/../controllers/order/user`);
const upload = require(`${__dirname}/../config/multerConfig`);

const multer  =require('multer');
const strong=multer.memoryStorage();
const uploads=multer({strong:strong})


router.use(authMiddleware.protected);

//  Create order 
router.post('/', upload.single('file'), orderUser.createOrder);

router.get('/', orderUser.viewMyOrders);

router.get('/:id',  orderUser.viewMyOrder);

router.patch('/:id', orderUser.cancelOrder);

module.exports = router;
