const cron = require("node-cron");
const Notification = require(`${__dirname}/../models/notification`);



cron.schedule("* * * * *", async () => {
  try {
    console.log("Running cleanup...");

    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - 1); // test

    const result = await Notification.deleteMany({
      createdAt: { $lt: cutoff },
    });

    console.log("Deleted:", result.deletedCount);

  } catch (err) {
    console.log("Cleanup error:", err.message);
  }
});
