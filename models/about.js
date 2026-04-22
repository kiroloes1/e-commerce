const mongoose = require("mongoose");

module.exports = (conn) => {

  const aboutSchema = new mongoose.Schema({

    storeName: {
      type: String,
      required: true,
      trim: true,
    },

    logo: {
      url: String,
      public_id: String,
    },

    about: {
      type: String,
      required: true,
    },

    heroText: {
      type: String,
      required: true,
    },

    socialMedia: {
      facebook: String,
      instagram: String,
      whatsapp: String,
    },

    brands: [
      {
        id: Number,
        name: String,
        desc: String,
      }
    ],

    phones: [String],

    address: String,

    email: String,

    workingHours: String,

    walletNumber: [{
      type: String,
      match: [/^(010|011|012|015)[0-9]{8}$/, 'Invalid Egyptian phone number']
    }]

  }, { timestamps: true });

  return conn.model("About", aboutSchema);
};