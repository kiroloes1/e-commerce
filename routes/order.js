const express = require('express');
const router = express.Router();
const authMiddleware = require(`${__dirname}/../middlewares/authMiddleware`);
const authorization = require(`${__dirname}/../middlewares/authorization`);
const orderUser = require(`${__dirname}/../controllers/order/user`);

const multer  =require('multer');
const strong=multer.memoryStorage();
const uploads=multer({strong:strong})


router.use(authMiddleware.protected);

//  Create order 
router.post('/', uploads.single('file'), orderUser.createOrder);


module.exports = router;
