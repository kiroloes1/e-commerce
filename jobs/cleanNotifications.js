const cron = require("node-cron");
const Notification = require(`${__dirname}/../models/notification`);

cron.schedule("0 0 * * *", async () => {
  try {
    console.log("Running notification cleanup job...");

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const result = await Notification.deleteMany({
      createdAt: { $lt: threeDaysAgo },
    });

    console.log("Deleted notifications:", result.deletedCount);

  } catch (err) {
    console.log("Cleanup error:", err.message);
  }
});