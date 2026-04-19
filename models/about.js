import mongoose from "mongoose";

const aboutSchema = new mongoose.Schema(
  {

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


    socialMedia: {
      facebook: String,
      instagram: String,
      whatsapp: String,
    },


    phones: [
      {
        type: String,
      },
    ],


    address: {
      type: String,
    },


    email: {
      type: String,
    },

  
    workingHours: {
      type: String,
    },

  },
  {
    timestamps: true,
  }
);

export default mongoose.model("About", aboutSchema);