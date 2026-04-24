const cron = require("node-cron");
const Notification = require(`${__dirname}/../models/notification`);



cron.schedule("0 0 * * *", async () => {
  try {
    console.log("Running daily notification cleanup...");

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 3); // امسح أقدم من 3 أيام

    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoff },
    });

    console.log("Deleted notifications:", result.deletedCount);

  } catch (err) {
    console.log("Cleanup error:", err.message);
  }
}, {
  timezone: "Africa/Cairo"
});
