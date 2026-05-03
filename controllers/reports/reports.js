const Order = require(`${__dirname}/../../models/order`);
const  User=require(`${__dirname}/../../models/user`)
const mongoose = require("mongoose");
exports.getSalesReport = async (req, res) => {
  try {
    const { from, to, status, userId } = req.query;

    const matchFilter = {};

    // default: exclude cancelled
matchFilter.status = { $nin: ["cancelled", "rejected"] };
    // date filter
    if (from || to) {
      matchFilter.createdAt = {};
      if (from) matchFilter.createdAt.$gte = new Date(from);
      if (to) matchFilter.createdAt.$lte = new Date(to);
    }

    // status filter
    if (status && status !== "all") {
      matchFilter.status = status;
    }

    // user filter
    if (userId) {
      matchFilter.user = new mongoose.Types.ObjectId(userId);
    }

    // ---------------- SUMMARY ----------------
    const report = await Order.aggregate([
      { $match: matchFilter },
      { $unwind: "$items" },

      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productData"
        }
      },
      { $unwind: "$productData" },

      {
        $addFields: {
          costPerUnit: {
            $divide: [
              "$productData.purchasePrice",
              "$productData.unitsPerPackage"
            ]
          }
        }
      },

      {
        $addFields: {
          profit: {
            $cond: [
              { $eq: ["$items.unit_type", "قطعة"] },
              {
                $multiply: [
                  { $subtract: ["$items.price", "$costPerUnit"] },
                  "$items.quantity"
                ]
              },
              {
                $multiply: [
                  { $subtract: ["$items.price", "$productData.purchasePrice"] },
                  "$items.quantity"
                ]
              }
            ]
          }
        }
      },

      {
        $group: {
          _id: null,
          totalOrders: { $addToSet: "$_id" },
          totalSales: { $sum: "$items.subtotal" },
          totalProfit: { $sum: "$profit" },
          totalItems: { $sum: "$items.quantity" }
        }
      },

      {
        $project: {
          totalOrders: { $size: "$totalOrders" },
          totalSales: 1,
          totalProfit: 1,
          totalItems: 1
        }
      }
    ]);

    // ---------------- UNIT STATS ----------------
    const unitStats = await Order.aggregate([
      { $match: matchFilter },   // 👈 مهم جدًا
      { $unwind: "$items" },

      {
        $group: {
          _id: "$items.unit_type",
          total: { $sum: "$items.quantity" }
        }
      }
    ]);

    // ---------------- PRODUCT PROFIT ----------------
    const productProfit = await Order.aggregate([
      { $match: matchFilter },   // 👈 مهم جدًا
      { $unwind: "$items" },

      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "productData"
        }
      },
      { $unwind: "$productData" },

      {
        $addFields: {
          costPerUnit: {
            $divide: [
              "$productData.purchasePrice",
              "$productData.unitsPerPackage"
            ]
          }
        }
      },

      {
        $addFields: {
          profit: {
            $cond: [
              { $eq: ["$items.unit_type", "قطعة"] },
              {
                $multiply: [
                  { $subtract: ["$items.price", "$costPerUnit"] },
                  "$items.quantity"
                ]
              },
              {
                $multiply: [
                  { $subtract: ["$items.price", "$productData.purchasePrice"] },
                  "$items.quantity"
                ]
              }
            ]
          }
        }
      },

      {
        $group: {
          _id: "$items.product",
          productName: { $first: "$items.productName" },
           description: { $first: "$productData.description" },
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: "$items.subtotal" },
          totalProfit: { $sum: "$profit" }
        }
      },

      { $sort: { totalProfit: -1 } }
    ]);

    res.status(200).json({
      success: true,
      summary: report[0] || {
        totalOrders: 0,
        totalSales: 0,
        totalProfit: 0,
        totalItems: 0
      },
      unitStats: unitStats.reduce((acc, item) => {
        acc[item._id] = item.total;
        return acc;
      }, {}),
      products: productProfit
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
exports.getUserName=async(req,res)=>{
    try{
        const users=await User.find({role:"customer"},{userName:1 ,_id:1});

        res.status(200).json({
            message:"تم جلب جيمع اسماء المستخدمين بنجاح",
            users
        })

    } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
