const Offer = require("../../models/offer");
const uploadToCloud=require(`${__dirname}/../../services/cloudinary`)
const cloudinary = require(`${__dirname}/../../config/cloudinaryConfig`);
const productModel = require(`${__dirname}/../../models/product`);
const UserModel = require(`${__dirname}/../../models/user`);
const { getIO } = require(`${__dirname}/../../sockets/socket`);
const { createNotification } = require(`${__dirname}/../../controllers/notification/notification`);


// GET  product  to admin
exports.getProducts = async (req, res) => {
  try {
  

     const product = await productModel.find({status:"active"},{_id:1,productName:1,description:1})
    


    return res.status(200).json({
      message: "تم جلب المنتج بنجاح",
      data: product
    });

  } catch (err) {
    return res.status(500).json({
      message: err.message
    });
  }
};

// get product by search
exports.searchProducts = async (req, res) => {
  try {

    const { query } = req.query;

    const products = await productModel.find(
      {
        status: "active",

        $or: [
          {
            productName: {
              $regex: query,
              $options: "i"
            }
          },

          {
            description: {
              $regex: query,
              $options: "i"
            }
          },

          {
            category: {
              $regex: query,
              $options: "i"
            }
          }
        ]
      },
      {
        _id: 1,
        productName: 1,
        description: 1,
        category: 1,
        unit_type:1,
        purchasePrice:1,
        pieceSellingPrice:1,
        packageSellingPrice:1,
        availableQuantity:1,
        totalUnits:1
        
      }
    );

    return res.status(200).json({
      message: "تم جلب المنتجات بنجاح",
      data: products,
    });

  } catch (err) {

    return res.status(500).json({
      message: err.message
    });

  }
};
// Create Offer
exports.createOffer = async (req, res) => {
  try {
    const { title, startDate, endDate, totalLimit, imageUrl } = req.body;

    const products =
      typeof req.body.products === "string"
        ? JSON.parse(req.body.products)
        : req.body.products;

    if (!title || !products || products.length === 0) {
      return res.status(400).json({
        message: "بيانات المجلة غير مكتملة"
      });
    }

    // =========================
    // 1. منع تكرار داخل نفس العرض
    // =========================
    const unique = new Set(products.map(p => p.product.toString()));

    if (unique.size !== products.length) {
      return res.status(400).json({
        message: "لا يمكن تكرار نفس المنتج داخل العرض"
      });
    }

    // =========================
    // 2. البحث عن تعارضات
    // =========================
    const productIds = products.map(p => p.product);

    const offers = await Offer.find({
      "products.product": { $in: productIds }
    }).populate("products.product");

    const conflicts = [];

    offers.forEach(offer => {
      offer.products.forEach(p => {
        const exists = productIds.some(
          id => id.toString() === p.product._id.toString()
        );

        if (exists) {
          conflicts.push({
            productName: p.product.productName,
            offerTitle: offer.title
          });
        }
      });
    });

    // =========================
    // 3. لو فيه تعارض → رجّع التفاصيل
    // =========================
    if (conflicts.length > 0) {
      return res.status(400).json({
        message: "بعض المنتجات موجودة بالفعل في عروض أخرى",
        conflicts
      });
    }

    // =========================
    // 4. إنشاء العرض
    // =========================
    const offer = await Offer.create({
      title,
      products,
      startDate,
      endDate,
      totalLimit,
      image: {
        url: imageUrl || ""
      }
    });

    // =========================
    // 5. Notification
    // =========================
    await createNotification(
      null,
      `تم انشاء مجلة جديدة: ${offer.title}`,
      `تم انشاء مجلة جديدة تحتوي على ${offer.products.length} منتجات. سارع بالاطلاع عليها!`
    );

    return res.status(201).json({
      message: "تم انشاء المجلة بنجاح",
      offer
    });

  } catch (err) {
    return res.status(500).json({
      message: err.message
    });
  }
};

// Get All Offers
exports.getOffers = async (req, res) => {
  try {
    const userId = req.user.userId;
    const now = new Date();

    // تنظيف العروض المنتهية أو اللي خلصت
    await Offer.deleteMany({
      $or: [
        { endDate: { $lt: now } },
        { $expr: { $gte: ["$soldCount", "$totalLimit"] } }
      ]
    });

    // هات المستخدم
    const user = await UserModel.findById(userId);

    const isAdmin =
      user &&
      (user.role === "admin" || user.role === "superadmin");

    // بناء الفلتر الأساسي
    const offerQuery = {
      endDate: { $gte: now },
      $expr: { $lt: ["$soldCount", "$totalLimit"] }
    };

    // لو مش admin → شوف active فقط
    if (!isAdmin) {
      offerQuery.active = true;
    }

    const offers = await Offer.find(offerQuery)
      .populate({
        path: "products.product",
        match: {
          status: "active",
          availableQuantity: { $gt: 0 }
        }
      })
      .sort({ createdAt: -1 });

    const cleanedOffers = offers
      .map(offer => {
        const offerObj = offer.toObject();
        offerObj.products = offerObj.products.filter(
          p => p.product !== null && p.product !== undefined
        );
        return offerObj;
      })
      .filter(offer => offer.products.length > 0);

    return res.json({
      count: cleanedOffers.length,
      offers: cleanedOffers
    });

  } catch (err) {
    return res.status(500).json({
      message: err.message
    });
  }
};

// Get Single Offer
exports.getOfferById = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id).populate(
      "products.product"
    );

    if (!offer) {
      return res.status(404).json({
        message: "المجلة غير موجودة",
      });
    }

    res.json(offer);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// Update Offer
exports.updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({
        message: "المجلة غير موجودة",
      });
    }



    offer.title = req.body.title || offer.title;

    offer.products = req.body.products
      ? typeof req.body.products === "string"
        ? JSON.parse(req.body.products)
        : req.body.products
      : offer.products;

    offer.startDate = req.body.startDate || offer.startDate;
    offer.endDate = req.body.endDate || offer.endDate;
    offer.totalLimit = req.body.totalLimit || offer.totalLimit;
    offer.image.url = req.body.imageUrl 

    await offer.save();

    res.json({
      message: "تم التعديل",
      offer,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// Delete Offer
exports.deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({
        message: "المجلة غير موجودة",
      });
    }

    await offer.deleteOne();

    res.json({
      message: "تم حذف المجلة",
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// Toggle Offer Status
exports.toggleOfferStatus = async (req, res) => {
  try {
    const offer = await Offer.findById(req.params.id);

    if (!offer) {
      return res.status(404).json({
        message: "المجلة غير موجودة",
      });
    }

    offer.active = !offer.active;

    await offer.save();

    res.json({
      message: offer.active
        ? "تم تشغيل المجلة"
        : "تم ايقاف المجلة",
      offer,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

exports.checkOfferUsage = async (req, res) => {

  try {

    const { userId } = req.user;
    const { offerId, productId } = req.params;

    const offer =
      await Offer.findById(offerId)
      .populate("products.product");

    if (!offer) {

      return res.status(404).json({
        message:"العرض غير موجود"
      });

    }

    const offerProduct =
      offer.products.find(

        p =>

        p.product &&
        p.product._id.toString() ===
        productId

      );

    if (!offerProduct){

      return res.status(404).json({

        message:
        "المنتج غير موجود داخل العرض"

      });

    }

    // تحديد المخزون حسب نوع الوحدة
    const productStock =
      offerProduct.unit_type === "قطعة"
        ? offerProduct.product.totalUnits
        : offerProduct.product.availableQuantity;

    // لو المخزون خلص
    if (productStock <= 0) {

      return res.status(200).json({

        message:
        "للأسف خلص المنتج من العرض",

        data:{

          offerId,

          productId,

          maxPerUser:
          offerProduct.maxPerUser,

          usedCount:0,

          remaining:0,

          canTake:false

        }

      });

    }

    // العميل نفسه
    const customerUsage =
      offer.customersUsed.find(

        c =>

        c.id.toString() ===
        userId.toString()

      );

    // المنتج داخل استخدام العميل
    const productUsage =
      customerUsage?.order?.find(

        p =>

        p.product.toString() ===
        productId.toString()

      );

    const usedCount =
      productUsage?.count || 0;

    const maxPerUser =
      offerProduct.maxPerUser;

    // المتبقي للمستخدم
    const userRemaining =
      Math.max(
        0,
        maxPerUser - usedCount
      );

    // المتبقي الحقيقي في المخزون
    const remaining =
      Math.min(
        userRemaining,
        productStock
      );

    const canTake =
      remaining > 0;

    return res.status(200).json({

      message:
      "تم جلب بيانات العرض",

      data:{

        offerId,

        productId,

        maxPerUser,

        usedCount,

        remaining,

        canTake

      }

    });

  }

  catch(err){

    return res.status(500).json({

      message:err.message

    });

  }

};
