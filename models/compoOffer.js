const mongoose = require("mongoose");

const ComboOfferSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true
    },

    description: {
      type: String,
      default: ""
    },

    image: {
      url: { type: String, default: "" },
      publicId: { type: String, default: "" }
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        quantity: {
          type: Number,
          default: 1
        }
      }
    ],

    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true
    },

    discountValue: {
      type: Number,
      required: true
    },

    maxPerUser: {
      type: Number,
      default: 1
    },

    totalLimit: {
      type: Number,
      default: 1000
    },

    soldCount: {
      type: Number,
      default: 0
    },

    startDate: {
      type: Date,
      required: true
    },

    endDate: {
      type: Date,
      required: true
    },

    active: {
      type: Boolean,
      default: true
    },

    customersUsed: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User"
        },
        count: {
          type: Number,
          default: 0
        }
      }
    ]
  },
  {
    timestamps: true
  }
);