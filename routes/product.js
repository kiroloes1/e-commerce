const express = require('express');
const router = express.Router();
const authMiddleware = require(`${__dirname}/../middlewares/authMiddleware`);
const {role}=require(`${__dirname}/../middlewares/authorization`)
const productController = require(`${__dirname}/../controllers/product/productController`);
const upload = require(`${__dirname}/../config/multerConfig`);

const multer  =require('multer');
const storage=multer.memoryStorage();
const uploads=multer({storage:storage})


//  Get all products clients
router.get('/allClients', productController.getAllProductsClients);

router.get('/allClientsLimit', productController.getAllProductsClientsLimit);

// get all products  based on category
router.get('/getProductsByCategory', productController.getProductsByCategory);

//  Get all products
router.get('/all',authMiddleware.protected,role("superadmin" ,"admin"), productController.getAllProducts);

//  Search products
router.get('/search/query', productController.search);

//  Get all categories (filter products by category)
router.get('/categories/all', productController.filterProductBasedOnCategory);

// get suggestion
router.get('/suggestion', productController.suggestion);

//  Get product by ID
router.get('/:id', productController.getProductById);


router.use(authMiddleware.protected);
router.use(role("superadmin" ,"admin"));




//      PRODUCTS  


//  Create product manually
router.post('/', productController.createProduct);

//  Create products from Excel
router.post('/add-product-from-excel-sheets', uploads.single('file'), productController.createFromExcel);

router.get('/getByIdForAdmin/:id', productController.getProductByIdAdmin );

//  Update product
router.put('/:productId', productController.updateProduct);

//  Delete product
router.delete('/:productId', productController.deleteProduct);

//  Upload product image
router.post('/:productId/upload-image', upload.single('image'), productController.uploadImageToProduct);

//  Delete product image
router.delete('/:productId/delete-image', productController.deleteImageToProduct);


module.exports = router;
