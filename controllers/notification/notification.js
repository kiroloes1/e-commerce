const Notification = require(`${__dirname}/../../models/notification`);
const { getIO } = require(`${__dirname}/../../sockets/socket`);

exports.createNotification = async (userId, title, message, type = "system") => {
  const notification = await Notification.create({
    user: userId,
    title,
    message,
    type,
  });

  const io = getIO();

  io.to(userId).emit("notification", {
    title,
    message,
    type,
    notificationId: notification._id,
  });

  return notification;
};

exports.getUserNotifications = async (req, res) => {
  try {
    const userId = req.user.userId;

    if (!userId) {
      return res.status(401).json({
        message: "Unauthorized: userId missing",
      });
    }

    const notifications = await Notification.find({
      user: userId,
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(notifications);
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      message: "Server error while fetching notifications",
    });
  }
};


exports.deleteOldNotifications=async()=> {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 1);

  const result = await Notification.deleteMany({
    createdAt: { $lt: threeDaysAgo }
  });

  console.log("Deleted:", result.deletedCount);
}
