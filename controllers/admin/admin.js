const { getIO } = require(`${__dirname}/../../sockets/socket`);
const { createNotification } = require(`${__dirname}/../../controllers/notification/notification`);

exports.sendToAllUsers = (req, res) => {
  const { message, title } = req.body;

  const io = getIO();

//   io.emit("notification", {
//         title: title || "الادمن يرحب بك",
//         message: message || "هذه رسالة من الادمن لجميع المستخدمين",
//         createdAt:new Date(),
//     });


 createNotification(
  null, 
 title || "الادمن يرحب بك",
 message || "هذه رسالة من الادمن لجميع المستخدمين",
)

  res.json({ success: true });
};