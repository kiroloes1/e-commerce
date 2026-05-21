const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require(`${__dirname}/../../models/user`);
const { Resend } = require('resend');
const  { SendEmail } =require(`${__dirname}/../../services/nodemilar`);

exports.facebookAuth = async (req, res) => {
  try {
    const { accessToken } = req.body;

   
    const fbRes = await axios.get(
      `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`
    );

    const { id, name, email, picture } = fbRes.data;


    let user = await User.findOne({
      $or: [{ email }, { facebookId: id }],
    });

    if (!user) {
      user = await User.create({
        name,
        email,
        facebookId: id,
        image: picture?.data?.url,
        provider: "facebook",
      });
    }
        if(!user.active){
        return res.status(401).json({ message: " هذا الحساب تم حذفه من قبل الأدمن تواصل مع المسئولين" });
    }


    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Auth success",
      token,
      user,
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Facebook auth failed" });
  }
};

// login 
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "الرجاء إدخال البريد الإلكتروني وكلمة المرور" });
    }

    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "البريد الإلكتروني أو كلمة المرور غير صحيحة" });
    }

    if(!user.active){
        return res.status(401).json({ message: " هذا الحساب تم حظره من قبل الأدمن تواصل مع المسئولين" });
    }

    
    
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.ACCESS_JWT_SECRET,
      { expiresIn: "1d" }
    );

    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      message: `تم تسجيل دخول ${user.name} بنجاح`,
      accessToken,
      userName: user.userName,
    });

  } catch (err) {
    console.error("خطأ في تسجيل الدخول:", err);
    res.status(500).json({ message: "خطأ داخلي في الخادم", error: err.message });
  }
};

exports.phoneLogin = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({
        message: "الرجاء إدخال رقم الهاتف وكلمة المرور",
      });
    }

    const user = await User.findOne({ phoneNumber:phone }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "رقم الهاتف أو كلمة المرور غير صحيحة",
      });
    }
    if(!user.active){
        return res.status(401).json({ message: " هذا الحساب تم حظره من قبل الأدمن تواصل مع المسئولين" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        message: "رقم الهاتف أو كلمة المرور غير صحيحة",
      });
    }

    const accessToken = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.ACCESS_JWT_SECRET,
      { expiresIn: "1d" }
    );

    user.lastLogin = new Date();
    await user.save();

    return res.status(200).json({
      message: `تم تسجيل دخول ${user.name} بنجاح`,
      accessToken,
      userName: user.userName,
    });

  } catch (err) {
    console.error("خطأ في تسجيل الدخول:", err);
    return res.status(500).json({
      message: "خطأ داخلي في الخادم",
      error: err.message,
    });
  }
};

// signUp 
exports.signUp = async (req, res) => {
  try {
    const {userName, email, password , address ,phoneNumber } = req.body;
    if (!userName || !email || !password) {
      return res.status(400).json({ message: "الرجاء توفير جميع الحقول المطلوبة" });
    }
  const existingUser = await User.findOne(
 
    { email }
  
  
);
    if (existingUser) {
      return res.status(400).json({ message: "البريد الإلكتروني  مستخدم بالفعل" });
    }
  const existingUser2 = await User.findOne(
 
    { phoneNumber }
  
  
);

    if (existingUser2) {
      return res.status(400).json({ message: "   رقم الهاتف مستخدم بالفعل" });
    }


    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      userName,
        email,
        password: hashedPassword,
        address,
        phoneNumber
    });


    await newUser.save();
    res.status(201).json({ message: "تم إنشاء الحساب بنجاح" });

  } catch (err) {
    console.error("خطأ في تسجيل الدخول:", err);
    res.status(500).json({ message: "خطأ داخلي في الخادم", error: err.message });
  }
};

// change password
exports.updatePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.userId;

  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "الرجاء توفير جميع الحقول المطلوبة" });
    }

    const user = await User.findById(userId).select('+password');
    if (!user) {
      return res.status(404).json({ message: "المستخدم غير موجود" });
    }

    const verifyPassword = await bcrypt.compare(currentPassword, user.password);
    if (!verifyPassword) {
      return res.status(401).json({ message: "كلمة المرور الحالية غير صحيحة" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.passwordChangedAt = Date.now();
    await user.save();

    res.status(200).json({ message: "تم تحديث كلمة المرور بنجاح" });

  } catch (err) {
    res.status(500).json({ message: 'خطأ داخلي في الخادم', error: err.message });
  }
};

// forget password

exports.forgetPassword = async (req, res) => {
  const { email } = req.body;

  try {
    if (!email) {
      return res.status(400).json({ message: "الرجاء إدخال بريدك الإلكتروني" });
    }

    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(404).json({ message: "إذا كان البريد الإلكتروني موجوداً، تم إرسال رابط إعادة التعيين" });
    }

    const resetCode = Math.floor(100000 + Math.random() * 900000);
    const resetExpires = Date.now() + 5 * 60 * 1000;
    const hashedResetCode = await bcrypt.hash(resetCode.toString(), 10);

    if (user.passwordResetAttempts >= 5) {
      user.pandding = Date.now() + 60 * 60 * 1000;
      user.passwordResetAttempts = 0;
      await user.save();
      return res.status(429).json({ message: "محاولات كثيرة. حاول لاحقاً." });
    }

    if (user.pandding && Date.now() < user.pandding) {
      return res.status(429).json({ message: "محاولات كثيرة. حاول لاحقاً." });
    }

    user.passwordResetCode = hashedResetCode;
    user.passwordResetExpires = resetExpires;
    user.passwordResetAttempts += 1;
    await user.save();

    // هنا الإرسال
    await SendEmail({
        to: user.email,
        subject: "رمز إعادة تعيين كلمة المرور",
        html: `<p>رمز إعادة التعيين الخاص بك هو: <strong>${resetCode}</strong></p>`
    });

    res.status(200).json({ message: "تم إرسال الكود بنجاح" });

  } catch (err) {
    res.status(500).json({ message: 'خطأ داخلي', error: err.message });
  }
};

// new password reset
exports.resetPassword = async (req, res) => {
  const { email, resetCode, newPassword } = req.body;

  try {
    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({ message: "الرجاء توفير جميع الحقول المطلوبة" });
    }

    const user = await User.findOne({ email: email });
    if (!user) {
      return res.status(400).json({ message: "البريد الإلكتروني أو رمز إعادة التعيين غير صالح" });
    }

    if (Date.now() > user.passwordResetExpires) {
      return res.status(400).json({ message: "انتهت صلاحية رمز إعادة التعيين" });
    }

    const isCodeValid = await bcrypt.compare(resetCode.toString(), user.passwordResetCode);
    if (!isCodeValid) {
      return res.status(400).json({ message: "البريد الإلكتروني أو رمز إعادة التعيين غير صالح" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.passwordResetCode = null;
    user.passwordResetExpires = null;
    user.passwordResetAttempts = 0;
    user.passwordChangedAt = Date.now();
    await user.save();

    res.status(200).json({ message: "تم إعادة تعيين كلمة المرور بنجاح" });

  } catch (err) {
    res.status(500).json({ message: 'خطأ داخلي في الخادم', error: err.message });
  }
};

// delete user
exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.user;

    const user = await UserModel.findByIdAndDelete(userId);

    
    if (!user) {
      return res.status(404).json({ message: "هذا الحساب غير موجود!" });
    }

    await cartModel.deleteOne({ user: customerId });

    res.status(200).json({
      message: "تم حذف الحساب بنجاح",
      user
    });

  } catch (err) {
    res.status(500).json({
      message: "حدث خطأ أثناء الحذف: " + err.message
    });
  }
};