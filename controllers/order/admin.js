const Order=require(`${__dirname}/../../models/order`);
const { getIO } = require(`${__dirname}/../../sockets/socket`);
const { createNotification } = require(`${__dirname}/../../controllers/notification/notification`);
 const cartModel=require(`${__dirname}/../../models/cart`);
 const cloudinary = require(`${__dirname}/../../config/cloudinaryConfig`);
 const mongoose = require("mongoose");
//view all orders
// view all orders
exports.viewAllOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const search = req.query.search || "";
        const status = req.query.status || "all";

        const skip = (page - 1) * limit;

        // 1. بناء استعلام الفلترة الأساسي
        let query = {};

        // الفلترة حسب الحالة (Tabs)
        if (status !== "all") {
            query.status = status;
        }

        // الفلترة حسب كلمة البحث
        if (search) {
            query.$or = [
                { customerName: { $regex: search, $options: "i" } },
                { orderNumber: { $regex: search, $options: "i" } },
                { phone: { $regex: search, $options: "i" } }
            ];
        }

        // 2. جلب الطلبات المفلترة والمقسمة لصفحات
        const orders = await Order.find(query, {
            orderNumber: 1,
            user: 1,
            finalPrice: 1,
            customerName: 1,
            phone: 1,
            address: 1,
            status: 1,
            payment: 1,
            createdAt: 1
        })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("user", "userName phoneNumber");

        // 3. حساب إجمالي الطلبات المتوافقة مع الفلترة الحالية لضبط الـ Pagination
        const totalFilteredOrders = await Order.countDocuments(query);

        // 4. جلب إحصائيات سريعة للعدادات العلوية وعدادات الـ Tabs دون تحميل البيانات كاملة
        const totalAll = await Order.countDocuments({});
        const totalDelivered = await Order.countDocuments({ status: "delivered" });
        const totalActive = await Order.countDocuments({ status: { $in: ["pending", "confirmed", "shipped"] } });
        
        // حساب العداد الخاص بكل تبويب (Tab) ليظهر بالـ Frontend
        const tabCounts = {
            all: totalAll,
            pending: await Order.countDocuments({ status: "pending" }),
            confirmed: await Order.countDocuments({ status: "confirmed" }),
            shipped: await Order.countDocuments({ status: "shipped" }),
            delivered: totalDelivered,
            cancelled: await Order.countDocuments({ status: "cancelled" })
        };

        res.status(200).json({
            results: orders.length,
            orders,
            currentPage: page,
            totalPages: Math.ceil(totalFilteredOrders / limit),
            totalOrders: totalFilteredOrders,
            stats: {
                total: totalAll,
                delivered: totalDelivered,
                active: totalActive
            },
            tabCounts
        });

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};

// view order by id
exports.viewOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findById(id)
            .populate("user", "userName email phoneNumber address")
  .populate({
    path: "items.product",
    select: "productName description price image"
  });
        if (!order) {
            return res.status(404).json({
                message: "الطلب غير موجود"
            });
        }

        res.status(200).json({ order });

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};

//update status
exports.updateStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const allowed = ["pending", "confirmed", "shipped", "delivered", "cancelled"];

        if (!allowed.includes(status)) {
            return res.status(400).json({
                message: "Invalid status"
            });
        }

        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        order.status = status;
        let s="قيد التنفيذ";
        if (status === "confirmed"){ order.confirmedAt = new Date(); s="تم تأكيد الطلب";}
        if (status === "shipped") {order.shippedAt = new Date();     s="تم شحن الطلب";}
        if (status === "delivered"){
                if (order.payment?.proofImage?.publicId) {
                        await cloudinary.uploader.destroy(order.payment?.proofImage?.publicId);
                        } 
            order.deliveredAt = new Date();
            s="تم توصيل الطلب";        
            order.payment.status = "paid";
            order.payment.paidAt = new Date();
        }
        if (status === "cancelled") {order.cancelledAt = new Date(); s= "  تم الغاء الطلب من قبل المسئول";}


        order.rejectionReason="";
        await order.save();

     


        await createNotification(
            order.user.toString(),
           s,
           " حالة طلبك رقم " + order.orderNumber + " تم تحديثها إلى " + s,
         )
        

        res.status(200).json({
            message: "Status updated",
            order
        });

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};

// approve payment
exports.approvePayment = async (req, res) => {
    try {
        const { id } = req.params;

        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        if(order.status = "cancelled"){
             order.status = "pending";  
        }
        order.payment.status = "paid";
        order.payment.paidAt = new Date();
        order.rejectionReason="";

        await order.save();
            await createNotification(
            order.user.toString(),
            "تم تأكيد الدفع",
            `تم تأكيد الدفع لطلبك رقم ${order.orderNumber} وأصبح مدفوع بالكامل`
            );
                    

        res.status(200).json({
            message: "Payment approved",
            order
        });

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};



//reject payment
exports.rejectPayment = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }
        


        order.payment.status = "unpaid";
        order.status = "cancelled";

        order.rejectionReason = reason || "No reason provided";

        await order.save();

await createNotification(
  order.user.toString(),
  "تم رفض الدفع",
  `تم رفض الدفع لطلبك رقم ${order.orderNumber}. السبب: ${reason || "لم يتم تحديد سبب"}`
);

        res.status(200).json({
            message: "Payment rejected",
            order
        });

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};

// add notes
exports.addAdminNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { note } = req.body;

        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({
                message: "Order not found"
            });
        }

        order.adminNote = note;

        await order.save();

        res.status(200).json({
            message: "Note added",
            order
        });

    } catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
};

// product may be sell
exports.maybesell =async(req,res)=>{
    try{
        const carts=await cartModel.find({},{"items.product":1 }).populate({
            path:"items.product",
            select:"productName description"
        });

       const products = carts.flatMap(cart =>
            cart.items.map(item => item.product)
            );

            const uniqueProducts = [...new Set(products)];
            

            return res.status(200).json({
                message:"تم جلب المنتجات المحتمل تباع ",
                product:uniqueProducts
            })


    }catch (err) {
        res.status(500).json({
            message: err.message
        });
    }
    }

// bset seller
exports.bestSellerAdmin = async (req, res) => {
  try {
    let bestSellers = await Order.aggregate([
      
      // 1. فك items
      { $unwind: "$items" },

      // 2. نجيب بيانات المنتج
      {
        $lookup: {
          from: "products",
          localField: "items.product",
          foreignField: "_id",
          as: "product"
        }
      },

      // 3. نحولها object
      { $unwind: "$product" },

      // 4. التجميع
      {
        $group: {
          _id: "$items.product",
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: {
            $sum: {
              $multiply: ["$items.quantity", "$items.price"]
            }
          },
          productName: { $first: "$items.productName" },
          description: { $first: "$product.description" } // ✅ صح هنا
        }
      },

      // 5. ترتيب
      { $sort: { totalSold: -1 } },

      // 6. top 5
      { $limit: 5 },

      // 7. الشكل النهائي
      {
        $project: {
          productName: 1,
          description: 1,
          totalSold: 1,
          totalRevenue: 1
        }
      }

    ]);

    res.status(200).json({
      success: true,
      count: bestSellers.length,
      data: bestSellers
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
