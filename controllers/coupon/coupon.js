const Coupon = require(`${__dirname}/../../models/coupon`);

// Create Coupon
exports.createCoupon = async (req, res) => {

    try {

        const {
            code,
            discount,
            expiresAt,
            usageLimit
        } = req.body;

        const coupon = await Coupon.create({

            code,
            discount,
            expiresAt,
            usageLimit,
            user: req.user.id

        });

        res.status(201).json({

            success:true,
            coupon

        });

    }

    catch(error){

        res.status(500).json({

            success:false,
            message:error.message

        });

    }

};



// Get All Coupons
exports.getCoupons = async (req, res) => {
  try {
    let coupons = await Coupon.find().populate("user", "name email");

    // =========================
    // DELETE INVALID COUPONS
    // =========================
    const invalidCoupons = coupons.filter(
      (c) => !c.isValid
    );

    if (invalidCoupons.length > 0) {
      await Coupon.deleteMany({
        _id: { $in: invalidCoupons.map(c => c._id) }
      });
    }

    // =========================
    // FILTER VALID ONLY FOR RESPONSE
    // =========================
    coupons = coupons.filter(c => c.isValid);

    res.status(200).json({
      success: true,
      count: coupons.length,
      coupons,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};


// Get Single Coupon
exports.getCoupon = async(req,res)=>{

    try{

        const coupon =
        await Coupon.findById(req.params.id)
        .populate("user","name email");

        if(!coupon){

            return res.status(404).json({

                success:false,
                message:"Coupon not found"

            });

        }

        res.status(200).json({

            success:true,
            coupon

        });

    }

    catch(error){

        res.status(500).json({

            success:false,
            message:error.message

        });

    }

};


// Update Coupon
exports.updateCoupon =async(req,res)=>{
    try{
        const coupon =
        await Coupon.findByIdAndUpdate(
            req.params.id,
            req.body,

            {
                new:true,
                runValidators:true
            }

        );

        if(!coupon){

            return res.status(404)
            .json({

                success:false,
                message:"Coupon not found"

            });

        }

        res.status(200).json({

            success:true,
            coupon

        });

    }

    catch(error){

        res.status(500).json({

            success:false,
            message:error.message

        });

    }

};


// Delete Coupon
exports.deleteCoupon =async(req,res)=>{

    try{

        const coupon =
        await Coupon.findById(req.params.id);

        if(!coupon){

            return res.status(404)
            .json({

                success:false,
                message:"Coupon not found"

            });

        }

        await coupon.deleteOne();

        res.status(200).json({

            success:true,
            message:"Coupon deleted"

        });

    }

    catch(error){

        res.status(500).json({

            success:false,
            message:error.message

        });

    }

};


// Apply Coupon
exports.applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    const { userId } = req.user;

    const coupon = await Coupon.findOne({
      code: code.toUpperCase(),
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: "كود الكوبون غير صحيح",
      });
    }

    if (!coupon.isValid) {
      return res.status(400).json({
        success: false,
        message: "الكوبون منتهي أو تم استخدامه بالكامل",
      });
    }


    if (coupon.userUsage.includes(userId)) {
      return res.status(400).json({
        success: false,
        message: "لقد استخدمت هذا الكوبون من قبل",
      });
    }

    coupon.usedCount += 1;
    coupon.userUsage.push(userId);

    await coupon.save();

    res.status(200).json({
      success: true,
      discount: coupon.discount,
      message: "تم تطبيق الكوبون بنجاح",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
