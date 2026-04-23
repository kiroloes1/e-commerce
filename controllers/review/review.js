//  const CartModel = req.app.locals.models.Cart;
const ReviewModel=require(`${__dirname}/../../models/review`);
const OrderModel=require(`${__dirname}/../../models/order`);

// get cart by user must be login first
exports.createReview = async (req, res) => {
       try{
        
        const {userId}=req.user;
        const {productId,rating,comment}=req.body;
        const review = new ReviewModel({
            userId,
            productId,
            rating, 
            comment
        });

        const order = await OrderModel.findOne({ user: userId, "items.product": productId ,status: "delivered" });
        
        if (!order) {
            return res.status(400).json({
                message: "لا يمكنك اضافه مراجعه لهذا المنتج لانك لم تشتريه"
            });
        }


        await review.save();
        return res.status(201).json({
            message: "تم اضافه المراجعه بنجاح",
            data: review
        });


       }catch(err){
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
        const reviews = await ReviewModel.find({ productId }).populate('userId', 'userName');
        return res.status(200).json({
            data: reviews
        }).sort({rating: -1, createdAt: -1 });
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
        
        const { userId } = req.user;
        const reviews = await ReviewModel.find({ userId }).populate('productId', 'productName');
        return res.status(200).json({
            data: reviews
        }).sort({ createdAt: -1 });
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
                ).populate('productId', 'productName').populate('userId', 'userName');


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




// best reviews 
exports.getBestReviews = async (req, res) => {
    try {
        const reviews = await ReviewModel.find({rating:{$gte:3}}).limit(10).populate('productId', 'productName' ).populate('userId', 'userName');   
        return res.status(200).json({
            data: reviews
        });
    } catch (err) {
        return res.status(500).json({
            message: "Server error",
            error: err.message
        });
    }};

