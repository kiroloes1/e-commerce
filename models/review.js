
const mongoose = require("mongoose");


module.exports = (conn) => {
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
    }

},{timestamps:true});

  return conn.model("Review", ReviewSchema);
};