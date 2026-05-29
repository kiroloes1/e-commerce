const UserModel = require(`${__dirname}/../../models/user`);
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createNotification } = require(`${__dirname}/../../controllers/notification/notification`);
const cartModel =require(`${__dirname}/../../models/cart`)
const orderModel =require(`${__dirname}/../../models/order`)
const reviewModel =require(`${__dirname}/../../models/review`)
const notificationModel=require(`${__dirname}/../../models/notification`)
const mongoose = require("mongoose");


// update user
exports.updateUser = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { userName, email, address, phoneNumber } = req.body;

    const update = {};

    if (userName) update.userName = userName;
    if (email) update.email = email;
    if (address) update.address = address;
    if (phoneNumber) update.phoneNumber = phoneNumber;

    
    const query = { $set: update };

   

    const user = await UserModel.findByIdAndUpdate(
      customerId,
      query,
      { new: true, runValidators: true }
    );


    if (!user) {
      return res.status(404).json({ message: "هذا المستخدم غير موجود!" });
    }

    res.status(200).json({
      message: "تم تعديل المستخدم بنجاح",
      user
    });

  } catch (err) {
    res.status(500).json({
      message: "حدث خطأ أثناء التعديل: " + err.message
    });
  }
};


// delete user
exports.deleteUser = async (req, res) => {
  try {
    const { customerId } = req.params;

    const user = await UserModel.findByIdAndDelete(customerId);

    
    if (!user) {
      return res.status(404).json({ message: "هذا المستخدم غير موجود!" });
    }

    await cartModel.deleteOne({ user: customerId });

    res.status(200).json({
      message: "تم حذف المستخدم بنجاح",
      user
    });

  } catch (err) {
    res.status(500).json({
      message: "حدث خطأ أثناء الحذف: " + err.message
    });
  }
};

// get user by id

exports.getUser = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const user = await UserModel.findById(customerId, "-password");

    if (!user) {
      return res.status(404).json({ message: "هذا المستخدم غير موجود!" });
    }


    // Reviews
    const reviews = await reviewModel.find({ userId: customerId });


    // Orders
    const orders = await orderModel.find(
      { user: customerId },
      {
        orderNumber: 1,
        items: 1,
        finalPrice: 1,
        shippingPrice: 1,
        payment: 1,
        adminNote: 1,
        rejectionReason: 1,
        status: 1,

      }
    );


    // Orders Stats
    const orderStats = await orderModel.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(customerId) } },
      {
        $group: {
          _id: "$user",
          totalPrice: { $sum: "$finalPrice" },
          totalOrders: { $sum: 1 },
        },
      },
    ]);


    // Cart
    const cart = await cartModel.findOne({ user: customerId })
    .populate("items.product","productName");


    // Cart Total
    const cartStats = await cartModel.aggregate([
      { $match: { user: new mongoose.Types.ObjectId(customerId) } },
      { $unwind: "$items" },
      {
        $group: {
          _id: "$user",
          totalItems: { $sum: "$items.quantity" },
        },
      },
    ]);


    // Notifications
    const notifications = await notificationModel.find({ user: customerId });
    // Response

    res.status(200).json({
      message: "تم جلب المستخدم بنجاح",
      user,
      reviews,
      orders,
      orderStats: orderStats[0] || { totalPrice: 0, totalOrders: 0 },
      cart,
      cartStats: cartStats[0] || { totalItems: 0 },
      notifications,
    });

  } catch (err) {
    res.status(500).json({
      message: "حدث خطأ أثناء جلب المستخدم",
      error: err.message,
    });
  }
};


// get all users
exports.getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || "";

    const skip = (page - 1) * limit;

    // بناء استعلام الفلترة والبحث
    let query = { role: "customer" };
    
    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } }
      ];
    }

    // جلب المستخدمين المفلترين لهذه الصفحة فقط
    const users = await UserModel.find(
      query,
      {
        userName: 1,
        email: 1,
        phoneNumber: 1,
        role: 1,
        active: 1
      }
    )
    .skip(skip)
    .limit(limit)
    .lean();

    // حساب الإجمالي بناءً على استعلام البحث
    const totalUsers = await UserModel.countDocuments(query);

    // حساب إحصائيات عامة سريعة لكل العملاء (اختياري وبدون تحميل البيانات كاملة)
    const totalAll = await UserModel.countDocuments({ role: "customer" });
    const totalActive = await UserModel.countDocuments({ role: "customer", active: true });
    const totalBlocked = await UserModel.countDocuments({ role: "customer", active: false });

    res.status(200).json({
      message: "تم جلب المستخدمين بنجاح",
      users,
      currentPage: page,
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers,
      stats: {
        total: totalAll,
        active: totalActive,
        blocked: totalBlocked
      }
    });

  } catch (err) {
    res.status(500).json({
      message: "حدث خطأ أثناء جلب المستخدمين",
      error: err.message
    });
  }
};

// get all admin
exports.getAllAdmin = async (req, res) => {
  try {
    const users = await UserModel.find({role:"admin"}, {userName:1 ,email:1 ,phoneNumber:1 ,role:1 ,active:1});

    res.status(200).json({
      message: "تم جلب جميع المستخدمين بنجاح",
      users,
      counts: users.length
    });

  } catch (err) {
    res.status(500).json({
      message: "حدث خطأ أثناء جلب المستخدمين: " + err.message
    });
  }
};


//  crete admin
exports.createAdmin = async (req, res) => {
  try {
    const { username, email, password, role, notes  ,phoneNumber} = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "كل الحقول مطلوبة" });
    }

    const existing = await UserModel.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "الإيميل مستخدم بالفعل" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await UserModel.create({
      userName:username,
      phoneNumber,
      email,
      password: hashedPassword,
      role,
      notes
    });

    res.status(201).json({
      message: "تم إنشاء الأدمن بنجاح",
      admin
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// change role
exports.changeRole = async (req, res) => {
  try {
   

     
    if (!req.body.role){
      return res.status(400).json("من فضلك اختر دور الادمين")
    }


    const admin = await UserModel.findByIdAndUpdate(
      req.params.id,
      {role: req.body.role},
      { new: true, runValidators: true }
    );

    if (!admin) {
      return res.status(404).json({ message: "الأدمن غير موجود" });
    }

    res.status(200).json({
      message: "تم التحديث بنجاح",
      admin
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};



exports.deactivateUserById = async (req, res) => {
  const { customerId } = req.params;

  // check valid ObjectId
 
  try {
    const user = await UserModel.findById(customerId);

    if (!user) {
      return res.status(404).json({ message: "هذا المستخدم غير موجود!" });
    }

    // toggle active
    user.active = !user.active;
    await user.save();

    // notification (مش لازم يوقف العملية لو فشل)
    try {
      await createNotification(
        user._id.toString(),
        user.active 
          ? "تم فك الحظر من قبل الادمن"
          : "تم حظرك من قبل الادمن",
        user.active
          ? "نرجو منك عدم الإساءة في استخدام المتجر وشكراً"
          : "تواصل مع المسؤولين لإلغاء الحظر"
      );
    } catch (notifyErr) {
      console.error("Notification error:", notifyErr.message);
    }

    res.status(200).json({
      message: user.active 
        ? "تم تفعيل المستخدم بنجاح"
        : "تم تعطيل المستخدم بنجاح",
      user,
    });

  } catch (err) {
    res.status(500).json({
      message: "حدث خطأ أثناء تعديل حالة المستخدم",
      error: err.message,
    });
  }
};

// get profile
exports.getProfile = async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await UserModel.findById(userId, "-password");

  
    if (!user) {
      return res.status(404).json({ message: "هذا المستخدم غير موجود!" });
    }

    res.status(200).json({
      message: "تم جلب المستخدم بنجاح",
      user
    });

  } catch (err) {
    res.status(500).json({
      message: "حدث خطأ أثناء جلب المستخدم: " + err.message
    });
  }
};


// update profile
exports.updateProfile=async(req,res)=>{
  try{
            const { userId } = req.user;
        if(!userId){
            return res.status(403).json({message:"من فضلك سجل الدخول اولا !"})
        }
    const { userName, email, address, phoneNumber } = req.body;

    const update = {};

    if (userName) update.userName = userName;
    if (email) update.email = email;
    if (address) update.address = address;
    if (phoneNumber) update.phoneNumber = phoneNumber;

    const query = { $set: update };



    const user = await UserModel.findByIdAndUpdate(
      userId,
      query,
      { new: true, runValidators: true }
    );


    if (!user) {
      return res.status(404).json({ message: "هذا المستخدم غير موجود!" });
    }

    res.status(200).json({
      message: "تم تعديل المستخدم بنجاح",
      user
    });

  }catch(err){
       res.status(500).json({
      message: "حدث خطأ أثناء تحديث المستخدم: " + err.message
    });
  }
}
