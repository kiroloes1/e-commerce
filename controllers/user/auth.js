const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// const User = require(`${__dirname}/../../models/user`);
const { Resend } = require('resend');
const  { SendEmail } =require(`${__dirname}/../../services/nodemilar`);



// login 
exports.login = async (req, res) => {
  try {
    const User = req.app.locals.models.User;
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

// signUp 
exports.signUp = async (req, res) => {
  try {
    const User = req.app.locals.models.User;
    console.log(User)
    const {userName, email, password , address ,phoneNumber } = req.body;
    if (!userName || !email || !password) {
      return res.status(400).json({ message: "الرجاء توفير جميع الحقول المطلوبة" });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "البريد الإلكتروني مستخدم بالفعل" });
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
    const User = req.app.locals.models.User;
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
    const User = req.app.locals.models.User;
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
    const User = req.app.locals.models.User;
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