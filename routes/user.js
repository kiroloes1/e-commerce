const express = require(`express`);
const router=express.Router();
const authMiddleware = require(`${__dirname}/../middlewares/authMiddleware`);
const adminControllers = require(`${__dirname}/../controllers/user/auth`);

// login route
router.post('/login', adminControllers.login);


// login route
router.post('/sign-up', adminControllers.signUp);

// refresh token
router.post('/refresh-token', adminControllers.refreshToken);

// reset password
router.put('/reset-password', adminControllers.resetPassword);

// forget password
router.put('/forgot-password', adminControllers.forgetPassword);

// protected routes
router.use(authMiddleware.protected);

// update password
router.put('/update-password', adminControllers.updatePassword);

module.exports=router;