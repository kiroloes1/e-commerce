const UserModel = require(`${__dirname}/../../models/user`);
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createNotification } = require(`${__dirname}/../../controllers/notification/notification`);

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

    const user = await UserModel.findById(customerId, "-password");

  
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


// get all users
exports.getUsers = async (req, res) => {
  try {
    const users = await UserModel.find({role:"customer"}, {userName:1 ,email:1 ,phoneNumber:1 ,role:1 ,active:1});

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
