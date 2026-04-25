const productModel=require(`${__dirname}/../../models/product`);
const XLSX = require("xlsx");
const uploadToCloud=require(`${__dirname}/../../services/cloudinary`)
const cloudinary = require(`${__dirname}/../../config/cloudinaryConfig`);
const fs = require('fs');
const ReviewModel = require(`${__dirname}/../../models/review`);
const mongoose = require("mongoose");
const { getIO } = require(`${__dirname}/../../sockets/socket`);
const { createNotification } = require(`${__dirname}/../../controllers/notification/notification`);
const OrderModel =require(`${__dirname}/../../models/order`);

const basePipeline = [
  {
    $lookup: {
      from: "reviews",
      localField: "_id",
      foreignField: "productId",
      as: "reviews"
    }
  },
  {
    $addFields: {
      averageRating: {
        $ifNull: [{ $avg: "$reviews.rating" }, 0]
      },
      reviewsCount: {
        $size: "$reviews"
      }
    }
  },
  {
    $project: {
      purchasePrice: 0,
       reviews: 0,
    }
  }
];

//   ############   add new product #############
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
        imageUrl
        
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
            image:{
              url:imageUrl || "",
              publicId:""
            }

        });

        // ✅ totalUnits and status will be calculated in pre-save hook
        await newProduct.save();


         createNotification(
          null,
         "منتج جديد" ,
         "تم إضافة منتج جديد في المتجر " + newProduct.productName,
        )



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


//   ############    get product #############


//  ########  get product to admin   ###################

// GET all products admin
exports.getAllProducts = async (req, res) => {
  try {
    const products = await productModel.aggregate([
      {
        $lookup: {
          from: "reviews", // اسم collection
          localField: "_id",
          foreignField: "productId",
          as: "reviews"
        }
      },
      {
        $addFields: {
          averageRating: { $avg: "$reviews.rating" }
        }
      }
    ]);

    return res.status(200).json({
      message: "تم جلب جميع المنتجات بنجاح",
      data: products,
      length: products.length
    });

  } catch (err) {
    return res.status(500).json({
      message: "حدث خطأ أثناء جلب المنتجات: " + err.message
    });
  }
};

// GET  product  to admin
exports.getProductByIdAdmin = async (req, res) => {
  try {
    const { id } = req.params;



    if (product.length === 0) {
      return res.status(404).json({
        message: "المنتج غير موجود"
      });
    }

    return res.status(200).json({
      message: "تم جلب المنتج بنجاح",
      data: product[0]
    });

  } catch (err) {
    return res.status(500).json({
      message: err.message
    });
  }
};


//   GET all products clients
exports.getAllProductsClients = async (req, res) => {
  try {
    const products = await productModel.aggregate([
      ...basePipeline
    ]);

    return res.status(200).json({
      message: "تم جلب جميع المنتجات بنجاح",
      data: products,
      length: products.length
    });

  } catch (err) {
    return res.status(500).json({
      message: err.message
    });
  }
};

// get product by limit  to clients (global login or not )
exports.getAllProductsClientsLimit = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const userId=req.user.userId;

    
    const products = await productModel.aggregate([
      {
        $match: {
          totalUnits: { $gt: 0 }
        }
      },
      ...basePipeline,
      {
        $limit: limit
      }
    ]);


if (userId) {
  const userOrders = await OrderModel.find(
    { user: userId },
    { "items.product": 1 }
  ).populate({
    path: "items.product",
    select: "category"
  });

  const categories = userOrders.flatMap(order =>
    order.items.map(item => item.product?.category)
  );

  const uniqueCategories = [...new Set(categories.map(c => c.toString()))];

  const filterProduct = await productModel.find({
    category: { $in: uniqueCategories }
  });

  console.log(filterProduct);

      return res.status(200).json({
      message: "تم جلب المنتجات بنجاح",
      data: filterProduct,
      length: filterProduct.length
    });

}
    return res.status(200).json({
      message: "تم جلب المنتجات بنجاح",
      data: products,
      length: products.length
    });

  } catch (err) {
    return res.status(500).json({
      message: err.message
    });
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
    const limit = parseInt(req.query.limit) || 8;

    let pipeline = [];

    if (category) {
      pipeline.push({
        $match: { category: category }
      });
    }

    pipeline.push(
      ...basePipeline,
      {
        $limit: limit
      }
    );

    let products = await productModel.aggregate(pipeline);

    // fallback
    if (products.length === 0 && category) {
      products = await productModel.aggregate([
        ...basePipeline,
        { $limit: limit }
      ]);
    }

    return res.status(200).json({
      message: "تم جلب المنتجات بنجاح",
      data: products,
      length: products.length
    });

  } catch (err) {
    return res.status(500).json({
      message: err.message
    });
  }
};

// GET product by ID

exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await productModel.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(id)
        }
      },
      ...basePipeline
    ]);

    if (product.length === 0) {
      return res.status(404).json({
        message: "المنتج غير موجود"
      });
    }

    return res.status(200).json({
      message: "تم جلب المنتج بنجاح",
      data: product[0]
    });

  } catch (err) {
    return res.status(500).json({
      message: err.message
    });
  }
};

// search by query + limit  

exports.search = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const { category, search } = req.query;

    if (!search) {
      return res.status(400).json({
        message: "من فضلك ادخل كلمات للبحث عنها"
      });
    }

    let pipeline = [];

    // 1. TEXT SEARCH
    pipeline.push({
      $match: {
        ...(category && { category }),
        $text: { $search: search }
      }
    });

    // 2. ADD SCORE
    pipeline.push({
      $addFields: {
        score: { $meta: "textScore" }
      }
    });

    // 3. SORT BY RELEVANCE
    pipeline.push({
      $sort: {
        score: -1
      }
    });

    // 4. JOIN REVIEWS
    pipeline.push(
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "productId",
          as: "reviews"
        }
      },
      {
        $addFields: {
          averageRating: {
            $ifNull: [{ $avg: "$reviews.rating" }, 0]
          },
          reviewsCount: {
            $size: "$reviews"
          }
        }
      }
    );

    // 5. HIDE FIELDS
    pipeline.push({
      $project: {
        purchasePrice: 0
      }
    });

    // 6. LIMIT
    pipeline.push({
      $limit: limit
    });

    let products = await productModel.aggregate(pipeline);

    // 🔁 fallback (regex search)
    if (!products.length) {
      products = await productModel.aggregate([
        {
          $match: {
            ...(category && { category }),
            $or: [
              { productName: { $regex: search, $options: "i" } },
              { description: { $regex: search, $options: "i" } }
            ]
          }
        },
        {
          $lookup: {
            from: "reviews",
            localField: "_id",
            foreignField: "productId",
            as: "reviews"
          }
        },
        {
          $addFields: {
            averageRating: {
              $ifNull: [{ $avg: "$reviews.rating" }, 0]
            },
            reviewsCount: {
              $size: "$reviews"
            }
          }
        },
        {
          $project: {
            purchasePrice: 0
          }
        },
        {
          $limit: limit
        }
      ]);
    }

    return res.status(200).json({
      message: `تم العثور على ${products.length} منتج(ات)`,
      data: products
    });

  } catch (err) {
    return res.status(500).json({
      message: "حدث خطأ أثناء البحث: " + err.message
    });
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



//  #############   update & delete ##########################


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


// ################   update And delete image #####################

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

    } 
      product.image = null; // remove reference from DB
      await product.save();

    res.status(200).json({
      message: "تم حذف الصورة لهذا المنتج بنجاح",
      product
    });

  } catch (err) {
    return res.status(500).json({ message: "حدث خطأ أثناء حذف الصورة: " + err.message });
  }
};


