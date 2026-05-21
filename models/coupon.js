const mongoose = require("mongoose");

const CouponSchema = new mongoose.Schema({

    code:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        uppercase:true
    },

    discount:{
        type:Number,
        required:true,
        min:0,
        max:100
    },

    expiresAt:{
        type:Date,
        required:true
    },

    usageLimit:{
        type:Number,
        default:1,
        min:1
    },

    usedCount:{
        type:Number,
        default:0,
        min:0
    },

    userUsage  :[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
    }],

},{
    timestamps:true,
    toJSON:{virtuals:true},
    toObject:{virtuals:true}
});

CouponSchema.virtual("isValid").get(function(){

    return (
        this.usedCount < this.usageLimit &&
        this.expiresAt > new Date()
    );

});

module.exports =
mongoose.model("Coupon", CouponSchema);
