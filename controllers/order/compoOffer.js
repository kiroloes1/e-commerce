const ComboOffer = require(`${__dirname}/../../models/compoOffer`);
const productModel = require(`${__dirname}/../../models/product`);

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

    if (!title || !items || items.length === 0) {
      return res.status(400).json({
        message: "بيانات العرض غير مكتملة"
      });
    }

    const combo = await ComboOffer.create({
      title,
      description,
      items: typeof items === "string" ? JSON.parse(items) : items,
      startDate,
      endDate,
      totalLimit,
      discountType,
      discountValue,
      image,
      maxPerUser
    });

    return res.status(201).json({
      message: "تم إنشاء العرض بنجاح",
      combo
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message
    });
  }
};



exports.getComboOffers = async (req, res) => {
  try {
    const combos = await ComboOffer.find()
      .populate("items.product")
      .sort({ createdAt: -1 });

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

    const combo = await ComboOffer.findById(comboId);

    if (!combo) {
      return res.status(404).json({
        message: "العرض غير موجود"
      });
    }

    const userUsage = combo.customersUsed.find(
      c => c.user.toString() === userId.toString()
    );

    const usedCount = userUsage?.count || 0;

    const remaining = Math.max(0, combo.maxPerUser - usedCount);

    const canTake = remaining > 0;

    return res.status(200).json({
      message: "تم جلب بيانات العرض",
      data: {
        comboId,
        usedCount,
        remaining,
        canTake
      }
    });
  } catch (err) {
    return res.status(500).json({
      message: err.message
    });
  }
};
