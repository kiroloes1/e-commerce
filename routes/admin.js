const express = require('express');
const router = express.Router();
const authMiddleware = require(`${__dirname}/../middlewares/authMiddleware`);
const authorization = require(`${__dirname}/../middlewares/authorization`);
const adminController = require(`${__dirname}/../controllers/admin/admin`);





router.use(authMiddleware.protected);

router.use(authorization.role('admin'));



//  send message to all users (notification)
router.post('/brodcast', adminController.sendToAllUsers);




module.exports = router;