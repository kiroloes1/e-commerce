const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },   // Unique product ID
    productName: { type: String, required: true },          // Product name
    description: { type: String },                          // Product description

    category: { type: String },                             // Category (from Excel)

    unit_type: { 
        type: String,
        required: true,
        enum:["قطعة","كرتونه"]   
    }, 

    unitsPerPackage: { 
        type: Number, 
        required: true 
    }, 

    
    availableQuantity: { 
        type: Number, 
        required: true 
    },

      totalUnits: { 
        type: Number 
        
    }, // auto calc


    // price
    packageSellingPrice: { type: Number, required: true },
    pieceSellingPrice: { type: Number, required: true },
    purchasePrice: { type: Number, required: true },

    image:{
        url:{type:String , default :""},
        publicId:{type:String ,default :""}
    },
    

    status: { 
        type: String, 
        enum: ["active", "inactive", "out-of-stock"], 
        default: "active" 
    },
    _skipInventoryHook:{
        type:Boolean,
        default:false,
    }

}, { timestamps: true });

productSchema.index({ productName: "text", description: "text",category :"text"});
productSchema.pre('save', function(next) {

   if (!this._skipInventoryHook) {
        this.totalUnits =( this.availableQuantity * this.unitsPerPackage);

   }

    if (this.availableQuantity > 0 || this.totalUnits>0) {
        this.status = "active";
    } else {
        this.status = "out-of-stock";
    }

    
});

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
