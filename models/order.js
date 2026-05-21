const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
    product: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Product", 
        required: true 
    },

    productName: { 
        type: String, 
        required: true 
    },

    unit_type: { 
        type: String, 
        required: true 
    },

    quantity: { 
        type: Number, 
        required: true 
    },

    price: { 
        type: Number, 
        required: true 
    },

    subtotal: { 
        type: Number, 
    },
    isOfferItem:{
        type:Boolean,
        default:false
    },
    offerTitle:{
        type:String,
        default:""
    },
    

}, { _id: false }); // to reduce size

const orderSchema = new mongoose.Schema({

    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User", 
        required: true 
    },

    orderNumber: {
        type: String,
        required: true,
        unique: true
    },

    items: [orderItemSchema],

    // pricing
    totalPrice: { 
        type: Number, 
        required: true 
    },

    shippingPrice: { 
        type: Number, 
        default: 0 
    },

    finalPrice: { 
        type: Number, 
        required: true 
    },

    discout:{
        type: Number, 
        default: 0 
    },
    // customer snapshot
    customerName: {
        type: String,
        required: true
    },

    phone: {
        type: String,
        required: true
    },

    address: {
        city: { type: String, required: true },
        region: { type: String, required: true },
        street: { type: String, required: true },
        building: String,
        floor: String,
        notes: String
    },

    // order status
    status: {
        type: String,
        enum: ["pending", "confirmed", "shipped", "delivered", "cancelled"],
        default: "pending"
    },

    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,

    // payment
    payment: {
        method: {
            type: String,
            enum: ["cash", "wallet", "whatsapp"],
            default: "cash"
        },
        walletPhone:{
            type:String,
            match: [/^(010|011|012|015)[0-9]{8}$/, 'هذا الرقم غير  موجود في مصر']
        },

        
        

        status: {
            type: String,
            enum: ["unpaid", "pending_verification", "paid", "rejected"],
            default: "unpaid"
        },

        paidAt: Date,

        transactionId: String,

        proofImage: {
            url: String,
            publicId: String
        }
    },

    // admin
    adminNote: {
        type: String,
        default: ""
    },

    rejectionReason: {
        type: String,
        default: ""
    }

}, { timestamps: true });






// AUTO CALCULATIONS
orderSchema.pre("save", function (next) {
    this.finalPrice = this.totalPrice + this.shippingPrice;

});


// AUTO ORDER NUMBER
orderSchema.pre("validate", function (next) {
    if (!this.orderNumber) {
        this.orderNumber = `ORD-${Date.now()}`;
    }
 
});


const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
