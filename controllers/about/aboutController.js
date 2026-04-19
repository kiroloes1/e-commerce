const About =require(`${__dirname}/../../models/about`);


// create about
exports.createAbout = async (req, res) => {
  try {
      const existabout = await About.findOne();
    if(existabout){
           return res.status(404).json({
        message: "About  found",
      });
    }
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
