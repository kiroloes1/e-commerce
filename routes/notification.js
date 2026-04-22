


const express = require('express');
const router = express.Router();
const authMiddleware = require(`${__dirname}/../middlewares/authMiddleware`);
const authorization = require(`${__dirname}/../middlewares/authorization`);
const notificationConttroller = require(`${__dirname}/../controllers/notification/notification`);





router.use(authMiddleware.protected);

// get notifications
router.get('/', notificationConttroller.getUserNotifications);





module.exports = router;