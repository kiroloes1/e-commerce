const Order = require(`${__dirname}/../../models/order`);
const  User=require(`${__dirname}/../../models/user`)
const getSalesReport = async (req, res) => {
  try {

    const { from, to, status, userId } = req.query;

    let match = {
      status: { $ne: "cancelled" }
    };

    // فلترة بالتاريخ
    if (from || to) {
      match.createdAt = {};

      if (from) {
        match.createdAt.$gte = new Date(from);
      }

      if (to) {
        match.createdAt.$lte = new Date(to);
      }
    }

    // فلترة بالحالة
    if (status && status !== "all") {
      match.status = status;
    }

    // فلترة بالمستخدم
    if (userId) {
      match.user = userId;
    }

    // استخدم match هنا
    const report = await Order.aggregate([
      { $match: match },

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

    res.json({
      summary: report[0] || {},
      unitStats: {},
      products: []
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
