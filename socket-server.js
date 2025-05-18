require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const express = require("express");
const cors = require("cors");
const socketRoutes = require("./routes/socketRoutes");
const sequelize = require("./config/postgres");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(express.json());
app.use(cors({ origin: "*" }));

sequelize
  .authenticate()
  .then(() => console.log("PostgreSQL connected"))
  .catch((err) => console.error("PostgreSQL connection error:", err));

socketRoutes(io);

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Socket server on port ${PORT}`));
