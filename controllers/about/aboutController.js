// const About =require(`${__dirname}/../../models/about`);


// create about
exports.createAbout = async (req, res) => {
  try {
    const About = req.app.locals.models.About;
    const {storeName , about ,walletNumber ,heroText}=req.body;

    if( !storeName || !about  || !walletNumber || !heroText){
      return      res.status(400).json({
      message: "يجب ملئ علي الاقل الحقول المهمه",
    
    });
    } 
    const existabout = await About.findOne();
    if(existabout){
     return      res.status(400).json({
      message: "لا يمكن اضافه البيانات مره اخره اذهب للتعديل ",
    
    });
    }

    
    const abouts = await About.create(req.body);

  

    res.status(201).json({
      message: "تم اضافه المعلومات بنجاح  ",
      data: abouts,
    });
  } catch (error) {
    res.status(500).json({
      message: "خطاء اثناء اضافه المعلومات",
      error: error.message,
    });
  }
};

// get about 
exports.getAbout = async (req, res) => {
  try {
    const About = req.app.locals.models.About;
    const about = await About.find();

    if (!about) {
      return res.status(404).json({
        message: "About not found",
      });
    }

    res.status(200).json({
      data: about,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error fetching about",
      error: error.message,
    });
  }
};

// update about 
exports.updateAbout = async (req, res) => {
  try {
    const About = req.app.locals.models.About;
    const about = await About.findOneAndUpdate(
      {},
      req.body,
      { new: true, runValidators: true }
    );

    if (!about) {
      return res.status(404).json({
        message: "لا توجد معلومات ",
      });
    }

    res.status(200).json({
      message: "تم التحديث بنجاح",
      data: about,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error updating about",
      error: error.message,
    });
  }
};

// delete about
exports.deleteAbout = async (req, res) => {
  try {
    const About = req.app.locals.models.About;
    const about = await About.findOneAndDelete();

    if (!about) {
      return res.status(404).json({
        message: "المعلومات غبر موجوده",
      });
    }

    res.status(200).json({
      message: "تم حذف المعلومات بنجاح",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error deleting about",
      error: error.message,
    });
  }
};

// get WalletNumbers
exports.getWalletNumbers = async (req, res) => {
  try {
    const About = req.app.locals.models.About;
    const about = await About.findOne().select("walletNumber");

    if (!about) {
      return res.status(404).json({ message: "المعلومات غير موجوده" });
    }

    res.json({
      walletNumbers: about.walletNumber || []
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// addWalletNumber
exports.addWalletNumber = async (req, res) => {
  try {
    const About = req.app.locals.models.About;
    const { number } = req.body;

    if (!number) {
      return res.status(400).json({ message: "رقم المحفظه مطلوب " });
    }

    const about = await About.findOneAndUpdate(
      {},
      {
        $addToSet: { walletNumber: number } 
      },
      { new: true, runValidators: true }
    );

    res.json({
      message: "تم اضافه رقم المحفظه بنجاح",
      walletNumbers: about.walletNumber
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// delete
exports.deleteWalletNumber = async (req, res) => {
  try {
    const About = req.app.locals.models.About;
    const { number } = req.body;

    const about = await About.findOneAndUpdate(
      {},
      {
        $pull: { walletNumber: number }
      },
      { new: true }
    );

    res.json({
      message: "حذف رقم المحفظه بنجاح",
      walletNumbers: about.walletNumber
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// update
exports.updateWalletNumber = async (req, res) => {
  try {
    const About = req.app.locals.models.About;
    const { oldNumber, newNumber } = req.body;

    const about = await About.findOne();

    if (!about) {
      return res.status(404).json({ message: "المعلومات غير موجوده" });
    }

    const index = about.walletNumber.findIndex(n => n === oldNumber);

    if (index === -1) {
      return res.status(404).json({ message: "رقم المحفظه غير موجود" });
    }

    about.walletNumber[index] = newNumber;

    await about.save();

    res.json({
      message: "تم التحديث بنجاح",
      walletNumbers: about.walletNumber
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};