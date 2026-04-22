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
  const notifications = await Notification.find({
    user: req.user.id,
  }).sort({ createdAt: -1 });

  res.json(notifications);
};


exports.deleteOldNotifications=async()=> {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 1);

  const result = await Notification.deleteMany({
    createdAt: { $lt: threeDaysAgo }
  });

  console.log("Deleted:", result.deletedCount);
}