const express = require("express");
const app = express();
const http = require("http");
const path = require("path");
const cors = require("cors");
const server = http.createServer(app);
const { Server } = require("socket.io");
const ACTIONS = require("./src/utils/Actions");
const bodyParser = require("body-parser");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  },
});
app.use(express.static("build"));
app.use((req, res, next) => {
  res.send(path.join(__dirname, "build", "index.html"));
});

const userSocketMap = {}; // to keep track of which user belong to which socket id
const roomLanguages = {};
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

    // socket.in(userData.roomId).emit(ACTIONS.REQUEST_INPUT);
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, codeInput, input }) => {
    socket.in(roomId).emit(ACTIONS.CODE_CHANGE, {
      codeInput,
      input,
    });
  });
  socket.on(ACTIONS.INPUT_CHANGE, ({ roomId, input }) => {
    socket.in(roomId).emit(ACTIONS.INPUT_CHANGE, { input });
  });
  socket.on(ACTIONS.SYNC_INPUT, ({ socketId, input }) => {
    io.to(socketId).emit(ACTIONS.INPUT_CHANGE, { input });
  });
  socket.on(ACTIONS.OUTPUT_CHANGE, ({ roomId, output, error }) => {
    socket.in(roomId).emit(ACTIONS.OUTPUT_CHANGE, { stdOut: output, error });
  });
  socket.on(ACTIONS.SYNC_OUTPUT, ({ socketId, output, error }) => {
    io.to(socketId).emit(ACTIONS.OUTPUT_CHANGE, { stdOut: output, error });
  });
  socket.on(ACTIONS.SYNC_CODE, ({ socketId, codeInput }) => {
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { codeInput });
  });
  socket.on(ACTIONS.SELECT_CHANGE, ({ roomId, lang, defaultLang }) => {
    // console.log(lang,theme);
    roomLanguages[roomId] = lang;

    socket.in(roomId).emit(ACTIONS.SELECTED, { lang });
  });
  socket.on(ACTIONS.SYNC_SELECT, ({ socketId, lang, roomId, defaultLang }) => {
    // console.log(lang);
    if (lang === null) {
      lang = defaultLang;
    } else {
      lang = roomLanguages[roomId];
    }
    io.to(socketId).emit(ACTIONS.SELECTED, { lang });
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
