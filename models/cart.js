const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
    items: [
        {
            product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true }, 
            quantity: { type: Number, default: 1 } ,
            unit_type: { 
        type: String,
        required: true   
    },
    isOffer: { type: Boolean, default: false }, // الحقل الجديد
  offerPrice: { type: Number, default: null },
  maxPerUser: { type: Number, default: null }
        }
    ]
}, { timestamps: true }); 

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;

