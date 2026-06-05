const ComboOffer = require(`${__dirname}/../../models/compoOffer`);
const Product = require(`${__dirname}/../../models/product`);


const { getIO } = require(`${__dirname}/../../sockets/socket`);
const { createNotification } = require(`${__dirname}/../../controllers/notification/notification`);
const UserModel = require(`${__dirname}/../../models/user`);

exports.createComboOffer = async (req, res) => {

  try {

    const {
      title,
      description,
      items,
      startDate,
      endDate,
      totalLimit,
      discountType,
      discountValue,
      maxPerUser,
      image
    } = req.body;

    // validation
    if (!title || !items || items.length === 0) {

      return res.status(400).json({
        message: "بيانات العرض غير مكتملة"
      });

    }

    // parse items لو جاي string
    const parsedItems =
      typeof items === "string"
        ? JSON.parse(items)
        : items;

    // التأكد من المنتجات والمخزون
    for (const item of parsedItems) {

      const product =
        await Product.findById(item.product);

      // المنتج غير موجود
      if (!product) {

        return res.status(404).json({

          message:
          "أحد المنتجات غير موجود"

        });

      }

      // تحديد المخزون حسب نوع الوحدة
      const stock =
        item.unit_type === "قطعة"
          ? product.totalUnits
          : product.availableQuantity;

      // المخزون غير كافي
      if (stock < item.quantity) {

        return res.status(400).json({

          message:
          `الكمية المتوفرة من ${product.productName} هي ${stock} فقط`

        });

      }

    }

    // إنشاء العرض
    const combo =
      await ComboOffer.create({

        title,

        description,

        items: parsedItems,

        startDate,

        endDate,

        totalLimit,

        discountType,

        discountValue,

        image,

        maxPerUser

      });

    // notification
    createNotification(

      null,

      `تم انشاء عرض جديد: ${combo.title}`,

      `تم انشاء عرض جديد يحتوي على ${combo.items.length} منتجات. سارع بالاطلاع عليه!`

    );

    return res.status(201).json({

      message:
      "تم إنشاء العرض بنجاح",

      combo

    });

  }

  catch (err) {

    return res.status(500).json({

      message: err.message

    });

  }

};


exports.getComboOffers = async (req, res) => {
  try {
    const userId = req?.user?.userId;
    const now = new Date();

    const user = await UserModel.findById(userId);

    const isAdmin =
      user && (user.role === "admin" || user.role === "superadmin");

    await ComboOffer.deleteMany({
      $or: [
        { endDate: { $lt: now } },
        { $expr: { $gte: ["$soldCount", "$totalLimit"] } }
      ]
    });

    // 2. Base query
    const query = {
      // startDate: { $lte: now },
      endDate: { $gte: now },
      $expr: {
        $lt: ["$soldCount", "$totalLimit"]
      }
    };

    if (!isAdmin) {
      query.active = true;
    }

    let combos = await ComboOffer.find(query)
      .populate("items.product")
      .sort({ createdAt: -1 });

    // 4. filter invalid stock combos
    combos = combos
      .map(combo => {
        combo.items = combo.items.filter(item => item.product);

        const isValid = combo.items.every(item => {
          const product = item.product;

          const stock =
            item.unit_type === "كرتونة"
              ? product.availableQuantity
              : product.totalUnits;

          return stock >= item.quantity;
        });

        return isValid ? combo : null;
      })
      .filter(Boolean);

    return res.status(200).json({
      count: combos.length,
      combos
    });

  } catch (err) {
    return res.status(500).json({
      message: err.message
    });
  }
};


exports.getComboOfferById = async (req, res) => {
  try {
    const combo = await ComboOffer.findById(req.params.id)
      .populate("items.product");

    if (!combo) {
      return res.status(404).json({
        message: "العرض غير موجود"
      });
    }

    return res.status(200).json(combo);
  } catch (err) {
    return res.status(500).json({
      message: err.message
    });
  }
};

exports.updateComboOffer = async (req, res) => {
  try {
    const combo = await ComboOffer.findById(req.params.id);

    if (!combo) {
      return res.status(404).json({
        message: "العرض غير موجود"
      });
    }

    combo.title = req.body.title || combo.title;
    combo.description = req.body.description || combo.description;

    combo.items = req.body.items
      ? typeof req.body.items === "string"
        ? JSON.parse(req.body.items)
        : req.body.items
      : combo.items;

    combo.startDate = req.body.startDate || combo.startDate;
    combo.endDate = req.body.endDate || combo.endDate;
    combo.totalLimit = req.body.totalLimit || combo.totalLimit;
    combo.discountType = req.body.discountType || combo.discountType;
    combo.discountValue = req.body.discountValue || combo.discountValue;
    combo.maxPerUser = req.body.maxPerUser || combo.maxPerUser;


    if (req.body.image) {
      combo.image = req.body.image;
    }

    await combo.save();

    return res.status(200).json({
      message: "تم التعديل بنجاح",
      combo
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message
    });
  }
};


exports.deleteComboOffer = async (req, res) => {
  try {
    const combo = await ComboOffer.findById(req.params.id);

    if (!combo) {
      return res.status(404).json({
        message: "العرض غير موجود"
      });
    }

    await combo.deleteOne();

    return res.status(200).json({
      message: "تم حذف العرض"
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message
    });
  }
};


exports.toggleComboStatus = async (req, res) => {
  try {
    const combo = await ComboOffer.findById(req.params.id);

    if (!combo) {
      return res.status(404).json({
        message: "العرض غير موجود"
      });
    }

    combo.active = !combo.active;
    await combo.save();

    return res.status(200).json({
      message: combo.active
        ? "تم تشغيل العرض"
        : "تم إيقاف العرض",
      combo
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message
    });
  }
};


exports.checkComboUsage = async (req, res) => {

  try {

    const { userId } = req.user;
    const { comboId } = req.params;

    const combo =
      await ComboOffer.findById(comboId)
      .populate("items.product");

    if (!combo) {

      return res.status(404).json({
        message: "العرض غير موجود"
      });

    }

    // التأكد إن كل المنتجات متوفرة
    for (const item of combo.items) {

      const product = item.product;

      // المنتج اتحذف
      if (!product) {

        return res.status(200).json({

          message:
          "للأسف أحد منتجات العرض غير متوفر",

          data: {
            comboId,
            usedCount: 0,
            remaining: 0,
            canTake: false
          }

        });

      }

      // تحديد المخزون حسب نوع الوحدة
      const stock =
        item.unit_type === "قطعة"
          ? product.totalUnits
          : product.availableQuantity;

      // المخزون غير كافي
      if (stock < item.quantity) {

        return res.status(200).json({

          message:
          `للأسف المتبقي من ${product.productName} داخل العرض هو ${stock}`,

          data: {
            comboId,
            usedCount: 0,
            remaining: 0,
            canTake: false
          }

        });

      }

    }

    // استخدام العميل
    const userUsage =
      combo.customersUsed.find(

        c =>

        c.user.toString() ===
        userId.toString()

      );

    const usedCount =
      userUsage?.count || 0;

    // المتبقي للمستخدم
    const userRemaining =
      Math.max(
        0,
        combo.maxPerUser - usedCount
      );

    // نحسب أقل كمية متاحة للـ combo بالكامل
    let comboStock = Infinity;

    for (const item of combo.items) {

      const product = item.product;

      const stock =
        item.unit_type === "قطعة"
          ? product.totalUnits
          : product.availableQuantity;

      const availableCombos =
        Math.floor(stock / item.quantity);

      comboStock =
        Math.min(
          comboStock,
          availableCombos
        );

    }

    // المتبقي الحقيقي
    const remaining =
      Math.min(
        userRemaining,
        comboStock
      );

    const canTake =
      remaining > 0;

    return res.status(200).json({

      message:
      "تم جلب بيانات العرض",

      data: {

        comboId,

        usedCount,

        remaining,

        canTake

      }

    });

  }

  catch(err){

    return res.status(500).json({

      message: err.message

    });

  }

};
