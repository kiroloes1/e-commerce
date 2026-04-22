const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    title: String,
    message: String,

    type: {
      type: String,
      enum: ["order", "product", "system"],
      default: "system",
    },


  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);