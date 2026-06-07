const mongoose = require("mongoose");

const aboutSchema = new mongoose.Schema(
  {

    storeName: {
      type: String,
      required: true,
      trim: true,
    },

    links:{
      googleDrive:{
        type:String
      },
      googlePlay:{
          type:String
      }
    },

    allowedDistance:{
      type:Number,
      default:70
    },

    logo: {
      url: String,
      public_id: String,
    },

    about: {
      type: String,
      required: true,
    },

    heroText:{
      type: String,
      required: true,
    },


    socialMedia: {
      facebook: String,
      instagram: String,
      whatsapp: String,
    },

    brands:[{
      id:{type:Number},
      name:{type:String},
      desc:{type:String},
    }]
,

    phones: [
      {
        type: String,
      },
    ],
shippingAddress: {
  type: [String],
  default: ["القاهرة", "الجيزة", "القليوبية", "السادس من اكتوبر"]
},


    address: {
      type: String,
    },


    email: {
      type: String,
    },

  
    workingHours: {
      type: String,
    },
  walletNumber:[{
      type: String,
       unique: true,
      match: [/^(010|011|012|015)[0-9]{8}$/, 'Invalid Egyptian phone number']
  }],
  },



  {
    timestamps: true,
  }
);

const about = mongoose.model("About", aboutSchema);
module.exports = about;

