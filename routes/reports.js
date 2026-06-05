const express = require('express');
const router = express.Router();
const authMiddleware = require(`${__dirname}/../middlewares/authMiddleware`);
const {role}=require(`${__dirname}/../middlewares/authorization`)
const reports = require(`${__dirname}/../controllers/reports/reports`);





router.use(authMiddleware.protected);
router.use(role("superadmin" ,"admin"));


router.get('/', reports.getSalesReport);
router.get('/getUserName', reports.getUserName);
router.get('/getOffersReport', reports.getOffersReport);
router.get('/getCombosReport', reports.getCombosReport);





module.exports = router;
