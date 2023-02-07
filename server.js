const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const server = http.createServer(app);
const { Server } = require("socket.io");
const ACTIONS = require("./src/Actions");
const io = new Server(server);

app.use(express.static("build"));
app.use((req, res, next) => {
  res.sendFile(path.join(__dirname, "build", "index.html"));
});

const userSocketMap = {}; // to keep track of which user belong to which socket id
const allClientsInARoom = (roomId) => {
  return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId) => {
      return {
        socketId,
        userName: userSocketMap[socketId],
      };
    }
  );
};

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);

  socket.on(ACTIONS.JOIN, (userData) => {
    userSocketMap[socket.id] = userData.userName;
    socket.join(userData.roomId);
    const clients = allClientsInARoom(userData.roomId);
    // console.log(clients);

    clients.forEach(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        userName: userData.userName,
        socketId: socket.id,
      });
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, codeInput }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, {
      codeInput,
    });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, codeInput }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { codeInput });
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.forEach((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        userName: userSocketMap[socket.id],
      });
    });
    delete userSocketMap[socket.id];
    socket.leave();
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
