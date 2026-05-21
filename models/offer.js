const mongoose = require("mongoose");

const OfferSchema = new mongoose.Schema({

    title:{
        type:String,
        required:true
    },

    image:{
        url:{
            type:String,
            default:""
        },

        publicId:{
            type:String,
            default:""
        }
    },

    products:[{

        product:{
            type:mongoose.Schema.Types.ObjectId,
            ref:"Product",
            required:true
        },

        offerPrice:{
            type:Number,
            required:true
        },

        maxPerUser:{
            type:Number,
            default:1
        }

    }],

    maxCustomers:{
        type:Number,
        default:null
    },

    customersUsed:[{

        type:mongoose.Schema.Types.ObjectId,
        ref:"User"

    }],

    totalLimit:{
        type:Number,
        default:2000
    },

    soldCount:{
        type:Number,
        default:0
    },

    startDate:{
        type:Date,
        required:true
    },

    endDate:{
        type:Date,
        required:true
    },

    active:{
        type:Boolean,
        default:true
    }

},{
    timestamps:true
});


OfferSchema.virtual("isAvailable")
.get(function(){

    const now=new Date();

    const timeValid=

    now>=this.startDate &&

    now<=this.endDate;

    const limitValid=

    this.soldCount<
    this.totalLimit;

    const customerValid=

    !this.maxCustomers ||

    this.customersUsed.length
    <
    this.maxCustomers;

    return(

        this.active &&

        timeValid &&

        limitValid &&

        customerValid

    );

});


module.exports=
mongoose.model(
"Offer",
OfferSchema
);