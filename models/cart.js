const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
    items: [
        {

            product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null }, 
            quantity: { type: Number, default: 1 },
            

            unit_type: { type: String, default: null },

            isOffer: { type: Boolean, default: false }, 
            offerPrice: { type: Number, default: null },
            maxPerUser: { type: Number, default: null },


            isCombo: { type: Boolean, default: false },
            comboId: { type: mongoose.Schema.Types.ObjectId, ref:"ComboOffer" , default: null },
            title: { type: String, default: null },

            comboProducts: [
                {
                    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
                    productName: { type: String },
                    quantity: { type: Number }
                }
            ]
        }
    ]
}, { timestamps: true }); 

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
