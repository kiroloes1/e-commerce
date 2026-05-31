//  const CartModel = req.app.locals.models.Cart;
const ReviewModel=require(`${__dirname}/../../models/review`);
const OrderModel=require(`${__dirname}/../../models/order`);

// get cart by user must be login first
exports.createReview = async (req, res) => {
    try {

        const { userId } = req.user;
        const { productId, rating, comment } = req.body;

        const order = await OrderModel.findOne({
            user: userId,
            "items.product": productId,
            status: "delivered"
        });

        if (!order) {
            return res.status(400).json({
                message: "لا يمكنك اضافه مراجعه لهذا المنتج لانك لم تشتريه"
            });
        }

        const review = new ReviewModel({
            userId,
            productId,
            rating,
            comment
        });

        await review.save();

        // هنا نعمل populate صح
        await review.populate('userId', 'userName');

        return res.status(201).json({
            message: "تم اضافه المراجعه بنجاح",
            data: review
        });

    } catch (err) {
        return res.status(500).json({
            message: "Server error",
            error: err.message
        });
    }
};

// get reviews for a product
exports.getReviewsByProduct = async (req, res) => {
    try {
        const { productId } = req.params;

        const reviews = await ReviewModel.find({ productId })
            .populate("userId", "userName")
            .sort({ rating: -1, createdAt: -1 })
            .limit(50);

        return res.status(200).json({
            data: reviews
        });

    } catch (err) {
        return res.status(500).json({
            message: "Server error",
            error: err.message
        });
    }
};

// get reviews by user
exports.getReviewsByUser = async (req, res) => {
    try {

        const userId = req.user.id; 

        const reviews = await ReviewModel.find({ userId })
            .populate("productId", "productName description")
            .sort({ createdAt: -1 })
            .limit(50);

        return res.status(200).json({
            data: reviews
        });

    } catch (err) {
        return res.status(500).json({
            message: "Server error",
            error: err.message
        });
    }
};

// delete review
exports.deleteReview = async (req, res) => {
  try {
    
    const { reviewId } = req.params;
    const { userId } = req.user;
    const review = await ReviewModel.findOneAndDelete({ _id: reviewId, userId });
        if (!review) {
            return res.status(404).json({
                message: "المراجعه غير موجوده او ليس لديك صلاحيات الحذف"
            });
        }
        return res.status(200).json({
            message: "تم حذف المراجعه بنجاح"
        });
    } catch (err) {
        return res.status(500).json({
            message: "Server error",
            error: err.message
        });
    }
};

// update review
exports.updateReview = async (req, res) => {
    try {
        
        const { reviewId } = req.params;
        const { userId } = req.user;
        const { rating, comment } = req.body;
        const review = await ReviewModel.findOneAndUpdate(
            { _id: reviewId, userId },
            { rating, comment },
            { new: true, runValidators: true }
        ).populate('userId', 'userName');

        if (!review) {
            return res.status(404).json({
                message: "المراجعه غير موجوده او ليس لديك صلاحيات التعديل"
            });
        }
        return res.status(200).json({
            message: "تم تحديث المراجعه بنجاح",
            data: review
        });
    } catch (err) {
        return res.status(500).json({
            message: "Server error",
            error: err.message
        });
    }
};


exports.getReviews = async (req, res) => {
  try {
    // Pagination
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const result = await ReviewModel.aggregate([
      // ترتيب من الأحدث للأقدم
      {
        $sort: {
          createdAt: -1,
        },
      },

      // تقسيم البيانات
      {
        $facet: {
          metadata: [
            {
              $count: "total",
            },
          ],

          data: [
            {
              $skip: skip,
            },
            {
              $limit: limit,
            },

            // Product Populate
            {
              $lookup: {
                from: "products",
                localField: "productId",
                foreignField: "_id",
                as: "productId",
              },
            },
            {
              $unwind: {
                path: "$productId",
                preserveNullAndEmptyArrays: true,
              },
            },

            // User Populate
            {
              $lookup: {
                from: "users",
                localField: "userId",
                foreignField: "_id",
                as: "userId",
              },
            },
            {
              $unwind: {
                path: "$userId",
                preserveNullAndEmptyArrays: true,
              },
            },
          ],
        },
      },
    ]).allowDiskUse(true);

    const reviews = result[0]?.data || [];
    const totalCount = result[0]?.metadata?.[0]?.total || 0;

    return res.status(200).json({
      success: true,
      message: "Reviews fetched successfully",
      data: reviews,
      pagination: {
        total: totalCount,
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        limit,
      },
    });
  } catch (error) {
    console.error("Get Reviews Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};

// best reviews 
exports.getBestReviews = async (req, res) => {
    try {
        const reviews = await ReviewModel.find({rating:{$gte:3}}).limit(10).populate('productId', 'productName description' ).populate('userId', 'userName');   
        return res.status(200).json({
            data: reviews
        });
    } catch (err) {
        return res.status(500).json({
            message: "Server error",
            error: err.message
        });
}};

