const express = require('express');
const router = express.Router();
const authMiddleware = require(`${__dirname}/../middlewares/authMiddleware`);
const authorization = require(`${__dirname}/../middlewares/authorization`);
const productController = require(`${__dirname}/../controllers/product/productController`);
const upload = require(`${__dirname}/../config/multerConfig`);

//  Get all products
router.get('/all', productController.getAllProducts);


//  Get all products clients
router.get('/allClients', productController.getAllProductsClients);


//  Get product by ID
router.get('/:id', productController.getProductById);

//  Search products
router.get('/search/query', productController.search);

//  Get all categories (filter products by category)
router.get('/categories/all', productController.filterProductBasedOnCategory);

router.use(authMiddleware.protected);
router.use(authorization.role('admin'));


//      PRODUCTS  


//  Create product manually
router.post('/', productController.createProduct);

//  Create products from Excel
router.post('/add-product-from-excel-sheets', upload.single('file'), productController.createFromExcel);


//  Update product
router.put('/:productId', productController.updateProduct);

//  Delete product
router.delete('/:productId', productController.deleteProduct);

//  Upload product image
router.post('/:productId/upload-image', upload.single('image'), productController.uploadImageToProduct);

//  Delete product image
router.delete('/:productId/delete-image', productController.deleteImageToProduct);


module.exports = router;