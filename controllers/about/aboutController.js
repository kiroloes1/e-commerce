const About =require(`${__dirname}/../../models/about`);


// create about
exports.createAbout = async (req, res) => {
  try {
    const about = await About.create(req.body);

    res.status(201).json({
      message: "About created successfully",
      data: about,
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating about",
      error: error.message,
    });
  }
};

// get about 
exports.getAbout = async (req, res) => {
  try {
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
    const about = await About.findOneAndUpdate(
      {},
      req.body,
      { new: true, runValidators: true }
    );

    if (!about) {
      return res.status(404).json({
        message: "About not found",
      });
    }

    res.status(200).json({
      message: "About updated successfully",
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
    const about = await About.findOneAndDelete();

    if (!about) {
      return res.status(404).json({
        message: "About not found",
      });
    }

    res.status(200).json({
      message: "About deleted successfully",
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
    const about = await About.findOne().select("walletNumber");

    if (!about) {
      return res.status(404).json({ message: "About not found" });
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
    const { number } = req.body;

    if (!number) {
      return res.status(400).json({ message: "Wallet number is required" });
    }

    const about = await About.findOneAndUpdate(
      {},
      {
        $addToSet: { walletNumber: number } 
      },
      { new: true, runValidators: true }
    );

    res.json({
      message: "Wallet number added",
      walletNumbers: about.walletNumber
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// delete
exports.deleteWalletNumber = async (req, res) => {
  try {
    const { number } = req.body;

    const about = await About.findOneAndUpdate(
      {},
      {
        $pull: { walletNumber: number }
      },
      { new: true }
    );

    res.json({
      message: "Wallet number removed",
      walletNumbers: about.walletNumber
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// update
exports.updateWalletNumber = async (req, res) => {
  try {
    const { oldNumber, newNumber } = req.body;

    const about = await About.findOne();

    if (!about) {
      return res.status(404).json({ message: "About not found" });
    }

    const index = about.walletNumber.findIndex(n => n === oldNumber);

    if (index === -1) {
      return res.status(404).json({ message: "Number not found" });
    }

    about.walletNumber[index] = newNumber;

    await about.save();

    res.json({
      message: "Wallet number updated",
      walletNumbers: about.walletNumber
    });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
