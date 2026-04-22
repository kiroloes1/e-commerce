const mongoose = require("mongoose");

module.exports = (conn) => {

  const cartSchema = new mongoose.Schema({

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
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
        },

        unit_type: {
          type: String,
          required: true
        }
      }
    ]

  }, { timestamps: true });

  return conn.model("Cart", cartSchema);
};