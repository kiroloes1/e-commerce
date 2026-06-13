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


exports.createFromExcel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const file = req.file.buffer;
    const workbook = XLSX.read(file, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const productData = XLSX.utils.sheet_to_json(worksheet);

    let added = 0;
    let skipped = 0;
    let errors = [];

    const pushProducts = [];
    const seenCodes = new Set(); // للتكرار داخل Excel

    // ✅ 1. هات كل الأكواد مرة واحدة
    const allCodes = productData.map(p => p.code);
    const existingProducts = await productModel.find({
      code: { $in: allCodes }
    });
    const existingCodes = new Set(existingProducts.map(p => p.code));

    // ✅ 2. loop خفيف جدًا بدون queries
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
        imageUrl
      } = product;

      // check missing
      const requiredFields = {
        code: "كود المنتج",
        productName: "اسم المنتج",
        unit_type: "نوع الوحدة",
        unitsPerPackage: "عدد الوحدات في العبوة",
        availableQuantity: "الكمية المتاحة",
        packageSellingPrice: "سعر بيع العبوة",
        pieceSellingPrice: "سعر بيع القطعة",
        purchasePrice: "سعر الشراء"
      };

      const missingFields = [];

      Object.keys(requiredFields).forEach((field) => {
        if (
          product[field] === undefined ||
          product[field] === null ||
          product[field] === "" ||
          (typeof product[field] === "number" && isNaN(product[field]))
        ) {
          missingFields.push(requiredFields[field]);
        }
      });

      if (missingFields.length > 0) {
        skipped++;
        errors.push({
          product: code || productName || "Unknown",
          reason: `ناقص: ${missingFields.join("، ")}`
        });
        continue;
      }

      // ✅ duplicate داخل Excel
      if (seenCodes.has(code)) {
        skipped++;
        errors.push({ product: code, reason: "مكرر داخل ملف Excel" });
        continue;
      }
      seenCodes.add(code);

      // ✅ duplicate في DB
      if (existingCodes.has(code)) {
        skipped++;
        errors.push({ product: code, reason: "موجود مسبقًا" });
        continue;
      }

      pushProducts.push({
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
        image: {
          url: imageUrl,
          publicId: ""
        },
          totalUnits: Number(availableQuantity) * Number(unitsPerPackage),
  status: (availableQuantity > 0 ? "active" : "out-of-stock")
      });

    }

    // ✅ 3. insert على دفعات (مهم جدًا لـ Vercel)
    const chunkSize = 100;

    for (let i = 0; i < pushProducts.length; i += chunkSize) {
      const chunk = pushProducts.slice(i, i + chunkSize);

      try {
        const result = await productModel.insertMany(chunk, { ordered: false });
        added += result.length;
      } catch (err) {
        if (err.code === 11000) {
          added += err.result?.nInserted || 0;
          skipped += chunk.length - (err.result?.nInserted || 0);
        } else {
          throw err;
        }
      }
    }

    return res.status(200).json({
      message: "تم رفع المنتجات بنجاح",
      added,
      skipped,
      errors,
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "حدث خطأ اثناء رفع المنتجات",
      error: err.message
    });
  }
};


//   ############    get product #############


//  ########  get product to admin   ###################

// GET all products admin
exports.getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search, category, status } = req.query;
    let matchQuery = {};

    // 1. فلترة البحث (الاسم أو الكود أو الوصف)
    if (search) {
      matchQuery.$or = [
        { productName: { $regex: search, $options: "i" } },
        { code: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    // 2. فلترة التصنيف
    if (category && category !== "الكل") {
      matchQuery.category = category;
    }

    // 3. فلترة الحالة (متوفر / نافذ)
    if (status && status !== "الكل") {
      if (status === "متوفر") matchQuery.availableQuantity = { $gt: 0 };
      if (status === "نافذ") matchQuery.availableQuantity = { $lte: 0 };
    }

    const productsData = await productModel.aggregate([
      // الفلترة أولاً لتقليل البيانات المخزنة بالـ Memory
      { $match: matchQuery },
      
      // ربط التقييمات
      {
        $lookup: {
          from: "reviews",
          localField: "_id",
          foreignField: "productId",
          as: "reviews"
        }
      },
      // حساب متوسط التقييم
      {
        $addFields: {
          averageRating: { $avg: "$reviews.rating" }
        }
      },
      // الترتيب الافتراضي (مثلاً الأحدث أولاً)
      { $sort: { createdAt: -1 } },
      
      // الـ Facet لعمل Pagination وجلب الـ Total معاً
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [{ $skip: skip }, { $limit: limit }]
        }
      }
    ]);

    const products = productsData[0].data || [];
    const totalCount = productsData[0].metadata[0]?.total || 0;

    return res.status(200).json({
      message: "تم جلب المنتجات بنجاح",
      data: products,
      total: totalCount,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit)
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

     const product = await productModel.aggregate([
      {
          $match: {
          _id: new mongoose.Types.ObjectId(id)
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
          averageRating: { $avg: "$reviews.rating" }
        }
      }
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


exports.getAllProductsClientsLimit = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const userId = req.query.userId;


    if (!userId) {
      const products = await productModel.aggregate([
        { $match: { totalUnits: { $gt: 0 } } },
        { $sample: { size: limit } }, // random
        ...basePipeline
      ]);

      return res.status(200).json({
        message: "تم جلب المنتجات بنجاح",
        data: products,
        length: products.length
      });
    }


    const userOrders = await OrderModel.find(
      { user: userId },
      { "items.product": 1, "items.category": 1 }
    );

    let categories = [];
    let purchasedProducts = [];

    userOrders.forEach(order => {
      order.items.forEach(item => {
        if (item.category) categories.push(item.category);
        if (item.product) purchasedProducts.push(item.product.toString());
      });
    });

    const uniqueCategories = [...new Set(categories)];
    const purchasedSet = new Set(purchasedProducts);

    // 🟡 لو مفيش history → fallback
    if (uniqueCategories.length === 0) {
      const products = await productModel.aggregate([
        { $match: { totalUnits: { $gt: 0 } } },
        { $sample: { size: limit } },
        ...basePipeline
      ]);

      return res.status(200).json({
        message: "No recommendations, fallback",
        data: products,
        length: products.length
      });
    }

    // 🟢 recommendation حقيقي
    const recommended = await productModel.aggregate([
      {
        $match: {
          category: { $in: uniqueCategories },
          totalUnits: { $gt: 0 },
          _id: { $nin: [...purchasedSet] } // استبعاد اللي اشتراه
        }
      },
      { $sample: { size: limit } }, // random
      ...basePipeline
    ]);

    // 🟡 fallback لو مفيش نتيجة
    if (recommended.length === 0) {
      const products = await productModel.aggregate([
        { $match: { totalUnits: { $gt: 0 } } },
        { $sample: { size: limit } },
        ...basePipeline
      ]);

      return res.status(200).json({
        message: "Fallback products",
        data: products,
        length: products.length
      });
    }

    return res.status(200).json({
      message: "تم جلب المنتجات بنجاح",
      data: recommended,
      length: recommended.length
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      message: "Server Error",
      error: err.message
    });
  }
};

exports.getAllProductsClients2 = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 16; // افتراضي 16 بناءً على الفرونت
    const skip = (page - 1) * limit;

    const { search, category, unit_type } = req.query;

    // 1. بناء مرحلة الفلترة الديناميكية
    let matchStage = { status: "active" }; // جلب المنتجات النشطة فقط للعملاء

    // فلترة حسب الصنف
    if (category && category !== "الكل") {
      matchStage.category = category;
    }

    // فلترة حسب نوع الوحدة (قطعة / كرتونة)
    if (unit_type && unit_type !== "الكل") {
      matchStage.unit_type = unit_type;
    }

    // فلترة حسب نص البحث (باستخدام النص أو الـ Regex المرن)
    if (search && search.trim() !== "") {
      matchStage.$or = [
        { productName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } }
      ];
    }

    // 2. تنفيذ الـ Aggregation Pipeline
    const result = await productModel.aggregate([
      { $match: matchStage },
      // ...basePipeline, // إذا كان لديك مراحل ثابتة مثل ترتيب أو جلب حقول معينة فك التعليق عنها هنا
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: { createdAt: -1 } }, // ترتيب الأحدث أولاً
            { $skip: skip },
            { $limit: limit }
          ]
        }
      }
    ]);

    const totalProducts = result[0].metadata[0]?.total || 0;
    const products = result[0].data;
    const totalPages = Math.ceil(totalProducts / limit);

    return res.status(200).json({
      message: "تم جلب المنتجات بنجاح",
      pagination: {
        totalProducts,
        totalPages,
        currentPage: page,
        limit
      },
      data: products
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

exports.exportProducts = async (req, res) => {
  try {
    const products = await productModel.find()
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      total: products.length,
      data: products,
    });
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

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


// DELETE products
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


exports.deleteAllProducts = async (req, res) => {
  try {

    // =========================
    // 1. GET ALL PRODUCTS
    // =========================
    const products = await productModel.find();

    // =========================
    // 2. DELETE ALL IMAGES FROM CLOUDINARY
    // =========================
    const publicIds = [];

    products.forEach(product => {
      // لو صورة واحدة
      if (product.image?.publicId) {
        publicIds.push(product.image.publicId);
      }

      // لو multiple images
      if (product.images && product.images.length > 0) {
        product.images.forEach(img => {
          if (img.publicId) {
            publicIds.push(img.publicId);
          }
        });
      }
    });

    // حذف كل الصور مرة واحدة (أفضل أداء)
    if (publicIds.length > 0) {
      await cloudinary.api.delete_resources(publicIds);
    }

    // =========================
    // 3. DELETE ALL PRODUCTS
    // =========================
    await productModel.deleteMany();

    res.status(200).json({
      message: "تم حذف جميع المنتجات والصور بنجاح",
      deletedImages: publicIds.length
    });

  } catch (err) {
    res.status(500).json({
      message: "خطأ أثناء حذف جميع المنتجات: " + err.message
    });
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


exports.sitemap = async (req, res) => {
  try {
    const products = await productModel.find(
      { status: "active" },
      {
        _id: 1,
        productName: 1,
        updatedAt: 1
      }
    );

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    products.forEach((product) => {
      const name = encodeURIComponent(product.productName);

      xml += `
<url>
  <loc>https://www.aboeldahabfoods.com/تفاصيل المنتج/${product._id}?الاسم=${name}</loc>
  <lastmod>${product.updatedAt.toISOString().split("T")[0]}</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>`;
    });

    xml += `
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);

  } catch (err) {
    res.status(500).json({
      message: err.message
    });
  }
};
