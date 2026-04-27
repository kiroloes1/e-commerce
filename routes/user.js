const express = require(`express`);
const router=express.Router();
const authMiddleware = require(`${__dirname}/../middlewares/authMiddleware`);
const {role}=require(`${__dirname}/../middlewares/authorization`)
const adminControllers = require(`${__dirname}/../controllers/user/auth`);
const userController=require(`${__dirname}/../controllers/user/userController`)
// login route
router.post('/login', adminControllers.login);


// login  by phone route
router.post('/phoneLogin', adminControllers.phoneLogin);


// login route
router.post('/sign-up', adminControllers.signUp);

// reset password
router.put('/reset-password', adminControllers.resetPassword);

// forget password
router.put('/forgot-password', adminControllers.forgetPassword);

// protected routes
router.use(authMiddleware.protected);

// update password
router.put('/update-password', adminControllers.updatePassword);
router.put('/updateProfile', userController.updateProfile);

router.get('/getProfile', userController.getProfile);


router.use(role("superadmin" ,"admin"));
router.patch('/deactivateUserById/:customerId', userController.deactivateUserById);
router.delete('/deleteUser/:customerId', userController.deleteUser);
router.get('/getUser/:customerId', userController.getUser);



router.use(role("superadmin"));
router.get('/getAllAdmin', userController.getAllAdmin);
router.get('/createAdmin', userController.createAdmin);
router.get('/changeRole', userController.changeRole);

router.use(role("admin"));
router.get('/getUsers', userController.getUsers);



router.put('/updateUser/:customerId', userController.updateUser);




module.exports=router;
