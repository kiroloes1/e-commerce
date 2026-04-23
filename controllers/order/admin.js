const Order=require(`${__dirname}/../../models/order`);
const { getIO } = require(`${__dirname}/../../sockets/socket`);
const { createNotification } = require(`${__dirname}/../../controllers/notification/notification`);

//view all orders
exports.viewAllOrders = async (req, res) => {
    try {
        const orders = await Order.find()
            .sort({ createdAt: -1 })
            .populate("user", "userName email phoneNumber address");

        res.status(200).json({
            results: orders.length,
            orders
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
            .populate("user", "userName email phoneNumber address");

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
        if (status === "delivered"){ order.deliveredAt = new Date(); s="تم توصيل الطلب";}
        if (status === "cancelled") {order.cancelledAt = new Date(); s= "  تم الغاء الطلب من قبل المسئول";}


        await order.save();

     
        //    const io = getIO(); 
        //      io.to(order.user.toString()).emit("order_status", {
        //     title: s,
        //     message: "حالة طلبك رقم " + order._id + " تم تحديثها إلى " + s,
        //     orderId: order._id
        // });

        await createNotification(
            order.user.toString(),
           s,
           "حالة طلبك رقم " + order.orderNumber + " تم تحديثها إلى " + s,
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

        order.payment.status = "paid";
        order.payment.paidAt = new Date();

        await order.save();

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

        order.payment.status = "rejected";
        order.rejectionReason = reason || "No reason provided";

        await order.save();

                await createNotification(
            order.user.toString(),
              "تم رفض الدفع",
            //   message
            "تم رفص الطلب الخاص بك والسبب" +rejectionReason
        )

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