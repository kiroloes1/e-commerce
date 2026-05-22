const Offer = require("../../models/offer");
const uploadToCloud=require(`${__dirname}/../../services/cloudinary`)
const cloudinary = require(`${__dirname}/../../config/cloudinaryConfig`);
const productModel = require(`${__dirname}/../../models/product`);
// GET  product  to admin
exports.getProducts = async (req, res) => {
  try {
  

     const product = await productModel.find({},{_id:1,name:1,price:1})
    


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
// Create Offer
exports.createOffer = async (req, res) => {
  try {
    const { title, products, startDate, endDate, totalLimit } = req.body;

    if (!title || !products || products.length === 0) {
      return res.status(400).json({ message: "بيانات المجلة غير مكتملة" });
    }

    let image = {};

    if (req.file) {
      const result = await uploadToCloud.uploadToCloud(req.file, "offers");

      image = {
        url: result.secure_url,
        publicId: result.public_id,
      };
    }

    const offer = await Offer.create({
      title,
      products:
        typeof products === "string"
          ? JSON.parse(products)
          : products,
      startDate,
      endDate,
      totalLimit,
      image,
    });

    res.status(201).json({
      message: "تم انشاء المجلة",
      offer,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
};

// Get All Offers
exports.getOffers = async (req, res) => {
  try {
    const offers = await Offer.find()
      .populate("products.product")
      .sort({ createdAt: -1 });

    res.json({
      count: offers.length,
      offers,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
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

    if (req.file) {
      const result = await uploadToCloud.uploadToCloud(req.file, "offers");

      offer.image = {
        url: result.secure_url,
        publicId: result.public_id,
      };
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
