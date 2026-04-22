
const mongoose = require("mongoose");



const ReviewSchema=new mongoose.Schema({

    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"},
    productId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product"},
    rating:{
        type:Number,
        min:1,
        max:5
    },
    comment:{
        type:String,
        required:true,
        trim:true,
        minlength:3,
        maxlength:100
    }

},{timestamps:true});

  const reviewModel= mongoose.model("Review", ReviewSchema);
module.exports=reviewModel;