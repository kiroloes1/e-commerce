const UserModel = require(`${__dirname}/../../models/user`);


// update user
exports.updateUser = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { userName, email, address, phoneNumber } = req.body;

    const update = {};

    if (userName) update.userName = userName;
    if (email) update.email = email;
    if (address) update.address = address;

    const query = { $set: update };

   
    if (phoneNumber) {
      query.$push = { phoneNumber };
    }

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
    const users = await UserModel.find({}, "-password");

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

// update profile
exports.updateProfile=async(req,res)=>{
  try{
            const { userId } = req.req;
        if(!userId){
            return res.status(403).json({message:"من فضلك سجل الدخول اولا !"})
        }
    const { userName, email, address, phoneNumber } = req.body;

    const update = {};

    if (userName) update.userName = userName;
    if (email) update.email = email;
    if (address) update.address = address;

    const query = { $set: update };

   
    if (phoneNumber) {
      query.$push = { phoneNumber };
    }

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
