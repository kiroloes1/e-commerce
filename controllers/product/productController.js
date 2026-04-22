const productModel=require(`${__dirname}/../../models/product`);
const XLSX = require("xlsx");
const uploadToCloud=require(`${__dirname}/../../services/cloudinary`)
const cloudinary = require(`${__dirname}/../../config/cloudinaryConfig`);
const fs = require('fs');
const ReviewModel = require(`${__dirname}/../../models/review`);
// create product
exports.createProduct = async (req, res) => {
    const {
        code,
        productName,
        description,
        category,
        unit_type,
        unitsPerPackage,
        availableQuantity,
        packageSellingPrice,
        pieceSellingPrice,
        purchasePrice,
        
    } = req.body;

    // ✅ Validation
    if (
        !code ||
        !productName ||
        !unit_type ||
        !unitsPerPackage ||
        !availableQuantity ||
        !packageSellingPrice ||
        !pieceSellingPrice ||
        !purchasePrice
    ) {
        return res.status(400).json({ message: "يجب عليك ملئ الحقول المطلوبه" });
    }

    try {
        // ✅ Check if product code already exists
        const existingProduct = await productModel.findOne({ code });
        if (existingProduct) {
            return res.status(400).json({ message: "المنتج هذا موجود بالفعل يجب عليك تغير كود المنتج" });
        }

        // ✅ Create product instance
        const newProduct = new productModel({
            code,
            productName,
            description,
            category,
            unit_type,
            unitsPerPackage,
            availableQuantity,
            packageSellingPrice,
            pieceSellingPrice,
            purchasePrice,

        });

        // ✅ totalUnits and status will be calculated in pre-save hook
        await newProduct.save();

        return res.status(201).json({
            message: "تم اضافه المنتج بنجاح",
            product: newProduct
        });

    } catch (err) {
        
        return res.status(500).json({ message: "حدث خطأ ما" + err.message });
    }
};


// create from excel sheet
exports.createFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const file = req.file.buffer;
    const workbook = XLSX.read(file, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert worksheet to JSON
    const productData = XLSX.utils.sheet_to_json(worksheet);

    let added = 0;
    let skipped = 0;
    let errors = [];

    for (const product of productData) {
      const {
        code,
        productName,
        description,
        category,
        unit_type,
        unitsPerPackage,
        availableQuantity,
        packageSellingPrice,
        pieceSellingPrice,
        purchasePrice,
      } = product;

      // Validate required fields
      if (!code || !productName || !unit_type || !unitsPerPackage || !availableQuantity ||
          !packageSellingPrice || !pieceSellingPrice || !purchasePrice) {
        skipped++;
        errors.push({
          product: code || productName || "Unknown",
          reason: "هذه الحقول مطلوبه لهذا المنتج"
        });
        continue;
      }

      // Check for duplicate code
      const existing = await productModel.findOne({ code });
      if (existing) {
        skipped++;
        errors.push({ product: code, reason: "Duplicate code" });
        continue;
      }

      // Save new product
      const newProduct = new productModel({
        code,
        productName,
        description,
        category,
        unit_type,
        unitsPerPackage: Number(unitsPerPackage),
        availableQuantity: Number(availableQuantity),
        packageSellingPrice: Number(packageSellingPrice),
        pieceSellingPrice: Number(pieceSellingPrice),
        purchasePrice: Number(purchasePrice),
        
      });

      await newProduct.save();
      added++;
    }

    return res.status(200).json({
      message: "تم رفع المنتجات بنجاح",
      added,
      skipped,
      errors,
    });

  } catch (err) {
    return res.status(500).json({ message: "حدث خطأ اثناء رفع المنتجات: " + err.message });
  }
};


// GET all products admin
exports.getAllProducts = async (req, res) => {
  try {
    const products = await productModel.find();
    const productsWithRatings = await Promise.all(products.map(async (product) => {
      const reviews = await ReviewModel.find({ productId: product._id });
      const averageRating = reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
      return {
        ...product.toObject(),
        rating: averageRating
      };
    }));
    
    
    return res.status(200).json({
      message: "تم جلب جميع المنتجات بنجاح",
      data: productsWithRatings,
      length: productsWithRatings.length
    });
  } catch (err) {
    return res.status(500).json({ message: "حدث خطأ أثناء جلب المنتجات: " + err.message });
  }
};

//   GET all products clients
exports.getAllProductsClients = async (req, res) => {
  try {
    const products = await productModel.find({},{purchasePrice:0});
    const productsWithRatings = await Promise.all(products.map(async (product) => {
      const reviews = await ReviewModel.find({ productId: product._id });
      const averageRating = reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
      return {
        ...product.toObject(),
        rating: averageRating
      };
    }));

    return res.status(200).json({
      message: "تم جلب جميع المنتجات بنجاح",
      data: productsWithRatings,
      length:products.length
    });
  } catch (err) {
    return res.status(500).json({ message: "حدث خطأ أثناء جلب المنتجات: " + err.message });
  }
};

// get product by limit  to clients
exports.getAllProductsClientsLimit = async (req, res) => {
  try {
    const {limit} =req.query || 10
  const products = await productModel
  .find({
    totalUnits: { $gt: 0 }
  } ,{purchasePrice: 0} )
  .limit(limit);

     const productsWithRatings = await Promise.all(products.map(async (product) => {
      const reviews = await ReviewModel.find({ productId: product._id });
      const averageRating = reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;  
      return {
        ...product.toObject(),
        rating: averageRating

      };
    }));

    return res.status(200).json({
      message: "تم جلب جميع المنتجات بنجاح",
      data: productsWithRatings,
      length:products.length
    });
  } catch (err) {
    return res.status(500).json({ message: "حدث خطأ أثناء جلب المنتجات: " + err.message });
  }
};

// filter to  product based on category
exports.filterProductBasedOnCategory=async(req,res)=>{
    try{
      const categories = await productModel.distinct("category");
        return res.status(200).json({
      message: "تم جلب جميع الاصناف بنجاح",
      data: categories,
      length:categories.length
    });




    }catch(err){
       return res.status(500).json({ message: "حدث خطأ أثناء جلب الاصناف: " + err.message });
    }
    
}

exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.query;
    let limit = parseInt(req.query.limit) || 8;

    let products;

    if (!category) {
    
      products = await productModel
        .find({}, { purchasePrice: 0 })
        .limit(limit);
    } else {
      
      products = await productModel
        .find({ category: category }, { purchasePrice: 0 })
        .limit(limit);

     
      if (products.length === 0) {
        products = await productModel
          .find({}, { purchasePrice: 0 })
          .limit(limit);
      }
    }

      const productsWithRatings = await Promise.all(products.map(async (product) => {
      const reviews = await ReviewModel.find({ productId: product._id });
      const averageRating = reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
      return {
        ...product.toObject(),
        rating: averageRating
      };
    }));


    return res.status(200).json({
      message: "تم جلب جميع الاصناف بنجاح",
      data: productsWithRatings,
      length: products.length
    });

  } catch (err) {
    return res.status(500).json({
      message: "حدث خطأ أثناء جلب المنتج: " + err.message
    });
  }
};
// GET product by ID
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await productModel.findById(id,{purchasePrice:0});
    if (!product) {
      return res.status(404).json({ message: "المنتج غير موجود" });
    }
      const reviews = await ReviewModel.find({ productId: product._id });
      const averageRating = reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
      const productWithRating = {
        ...product.toObject(),
        rating: averageRating
      };

    return res.status(200).json({
      message: "تم جلب المنتج بنجاح",
      data: productWithRating
    });
  } catch (err) {
    return res.status(500).json({ message: "حدث خطأ أثناء جلب المنتج: " + err.message });
  }
};


// DELETE product
exports.deleteProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!productId) {
      return res.status(400).json({ message: "من فضلك اختر المنتج أولاً" });
    }

    // Find product first
    const product = await productModel.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "هذا المنتج غير موجود" });
    }

    // Delete product image from Cloudinary if exists
    if (product.image?.publicId) {
      await cloudinary.uploader.destroy(product.image.publicId);
    }

    // Delete product from database
    await productModel.findByIdAndDelete(productId);

    res.status(200).json({
      message: "تم حذف المنتج بنجاح",
      product
    });

  } catch (err) {
    return res.status(500).json({ message: "حدث خطأ أثناء حذف المنتج: " + err.message });
  }
};


// search by query + limit  

exports.search = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const { category, search } = req.query;

    if (!search) {
      return res.status(400).json({ message: "من فضلك ادخل كلمات للبحث عنها" });
    }

    let query = {
      ...(category && { category }),
      $text: { $search: search }
    };

    let products = await productModel
      .find(query, { score: { $meta: "textScore" }, purchasePrice: 0 })
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .lean();

    if (!products.length) {
      const fallbackQuery = {
        ...(category && { category }),
        $or: [
          { productName: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } }
        ]
      };

      products = await productModel.find(fallbackQuery).limit(limit).lean();
    }

      const productsWithRatings = await Promise.all(products.map(async (product) => {
      const reviews = await ReviewModel.find({ productId: product._id });
      const averageRating = reviews.length > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 0;
      return {
        ...product,
        rating: averageRating
      };

    }));


    res.status(200).json({
      message: `تم العثور على ${products.length} منتج(ات)`,
      data: productsWithRatings
    });

  } catch (err) {
    res.status(500).json({ message: "حدث خطأ أثناء البحث: " + err.message });
  }
};

// suggestion 
exports.suggestion = async (req, res) => {
  try {
    const { category } = req.query;

    let filter = {};

    if (category) {
      filter.category = category;
    }

    const suggestion = await productModel.find(
      filter,
      {
        category: 1,
        description: 1,
        productName: 1
      }
    )

    res.status(200).json({
      message: `تم العثور على ${suggestion.length} منتج(ات)`,
      data: suggestion
    });

  } catch (err) {
    res.status(500).json({
      message: "حدث خطأ أثناء البحث: " + err.message
    });
  }
};
// UPDATE product
exports.updateProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!productId) {
      return res.status(400).json({ message: "من فضلك اختر المنتج أولاً" });
    }

    const updateData = req.body;

    // Validate numeric fields if provided
    if (updateData.unitsPerPackage !== undefined) {
      updateData.unitsPerPackage = Number(updateData.unitsPerPackage);
    }
    if (updateData.availableQuantity !== undefined) {
      updateData.availableQuantity = Number(updateData.availableQuantity);
    }
    if (updateData.packageSellingPrice !== undefined) {
      updateData.packageSellingPrice = Number(updateData.packageSellingPrice);
    }
    if (updateData.pieceSellingPrice !== undefined) {
      updateData.pieceSellingPrice = Number(updateData.pieceSellingPrice);
    }
    if (updateData.purchasePrice !== undefined) {
      updateData.purchasePrice = Number(updateData.purchasePrice);
    }

    // Calculate totalUnits if relevant fields are updated
    if (updateData.availableQuantity !== undefined || updateData.unitsPerPackage !== undefined) {
      const product = await productModel.findById(productId);
      if (!product) {
        return res.status(404).json({ message: "هذا المنتج غير موجود" });
      }
      const unitsPerPackage = updateData.unitsPerPackage ?? product.unitsPerPackage;
      const availableQuantity = updateData.availableQuantity ?? product.availableQuantity;
      updateData.totalUnits = unitsPerPackage * availableQuantity;

      // Update status automatically
      updateData.status = availableQuantity > 0 ? "active" : "out-of-stock";
    }

    const updatedProduct = await productModel.findByIdAndUpdate(
      productId,
      { $set: updateData },
      { new: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "هذا المنتج غير موجود" });
    }

    res.status(200).json({
      message: "تم تحديث المنتج بنجاح",
      product: updatedProduct
    });

  } catch (err) {
    res.status(500).json({ message: "حدث خطأ أثناء تحديث المنتج: " + err.message });
  }
};


// upload image to product
exports.uploadImageToProduct = async (req, res) => {
  try {
    const file = req.file;
    const folderBase = 'productImage';
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ message: "من فضلك اختر المنتج اولا" });
    }

    const product = await productModel.findById(productId, { image: 1 });
    if (!product) {
      return res.status(400).json({ message: "هذا المنتج غير موجود" });
    }

    if (!file) {
      return res.status(400).json({ message: "لم يتم إرسال أي صورة" });
    }

   
    if (product?.image?.publicId) {
      await uploadToCloud.deleteFromCloud(product.image.publicId);
    }

    
    const result = await uploadToCloud.uploadToCloud(file, `${folderBase}/image`);
    product.image.url = result.url;
    product.image.publicId = result.publicId;

    await product.save();

   

    res.status(201).json({
      message: "تم رفع الصورة لهذا المنتج",
      product
    });

  } catch (err) {
    return res.status(500).json({ message: "حدث خطأ أثناء رفع الصورة لهذا المنتج: " + err.message });
  }
};


// DELETE image from product
exports.deleteImageToProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    if (!productId) {
      return res.status(400).json({ message: "من فضلك اختر المنتج أولاً" });
    }

    const product = await productModel.findById(productId, { image: 1 });
    if (!product) {
      return res.status(404).json({ message: "هذا المنتج غير موجود" });
    }

    // Delete image from Cloudinary if exists
    if (product.image?.publicId) {
      await cloudinary.uploader.destroy(product.image.publicId);
      product.image = null; // remove reference from DB
      await product.save();
    } else {
      return res.status(400).json({ message: "لا توجد صورة لحذفها لهذا المنتج" });
    }

    res.status(200).json({
      message: "تم حذف الصورة لهذا المنتج بنجاح",
      product
    });

  } catch (err) {
    return res.status(500).json({ message: "حدث خطأ أثناء حذف الصورة: " + err.message });
  }
};



