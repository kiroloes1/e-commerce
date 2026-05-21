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
exports.getCoupons = async(req,res)=>{

    try{

        const coupons =
        await Coupon.find()
        .populate("user","name email");

        res.status(200).json({

            success:true,
            count:coupons.length,
            coupons

        });

    }

    catch(error){

        res.status(500).json({

            success:false,
            message:error.message

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
exports.applyCoupon =async(req,res)=>{

    try{

        const { code } = req.body;
        const coupon =
        await Coupon.findOne({
            code:
            code.toUpperCase()

        });

        if(!coupon){

            return res.status(404)
            .json({

                success:false,
                message:"Coupon invalid"

            });

        }


        if(!coupon.isValid){

            return res.status(400)
            .json({

                success:false,
                message:
                "Coupon expired or limit reached"

            });

        }


        coupon.usedCount += 1;

        await coupon.save();

        res.status(200).json({

            success:true,

            discount:
            coupon.discount,

            message:
            "Coupon applied"

        });

    }

    catch(error){

        res.status(500).json({

            success:false,
            message:error.message

        });

    }

};