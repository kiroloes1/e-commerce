let io;

function init(server) {
  const socketIO = require("socket.io");

  io = socketIO(server, {
    cors: {
      origin: "*"
    }
  });

io.on("connection", (socket) => {

  socket.on("join", (userId) => {
    socket.join(userId);

    console.log("User joined room:", userId);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });

});
}

// to know user and send notification from any controller 
function getIO() {
  if (!io) throw new Error("Socket not initialized");
  return io;
}

module.exports = { init, getIO };