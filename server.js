// ==== server.js ====

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const session = require("express-session");
const passport = require("./config/passport");
const authRoutes = require("./routes/authRoutes");
const roomRoutes = require("./routes/roomRoutes");
const matchRoutes = require("./routes/matchRoutes");
const packageRoutes = require("./routes/packageRoutes");
const paymentRoutes = require("./routes/paymentRoutes"); //Route cũ
const paymentsRoutes = require("./routes/paymentsRoutes"); //Route mới
const codeRoutes = require("./routes/codeRoutes");
const matchmakingRoutes = require("./routes/matchmakingRoutes");
const leaderboardRoutes = require("./routes/leaderboardRoutes");
const itemRoutes = require("./routes/itemRoutes");
const voucherRoutes = require("./routes/voucherRoutes");

// Admin routes
const adminAuthRoutes = require("./routes/admin/authRoutes");
const adminUserRoutes = require("./routes/admin/userRoutes");
const adminTransactionRoutes = require("./routes/admin/transactionRoutes");
const adminCodeRoutes = require("./routes/admin/codeRoutes");
const adminReportRoutes = require("./routes/admin/reportRoutes");

const sequelize = require("./config/postgres");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");
const gameService = require("./services/gameServices");
const socketAuthMiddleware = require("./middleware/socketMiddleware");

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from public directory
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: "GET, POST, PUT, DELETE",
    allowedHeaders: "Content-Type, Authorization",
  })
);

// Passport middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
  })
);

app.use(passport.initialize());

// Swagger configuration
const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Game API",
      version: "1.0.0",
      description: "API for managing users and friends",
    },
    servers: [
      { url: process.env.BASE_URL || "https://antagonism-game.vercel.app" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./routes/*.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use(
  "/api-docs",
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocs, {
    customJs: [
      "https://unpkg.com/swagger-ui-dist@4/swagger-ui-bundle.js",
      "https://unpkg.com/swagger-ui-dist@4/swagger-ui-standalone-preset.js",
    ],
    customCssUrl: "https://unpkg.com/swagger-ui-dist@4/swagger-ui.css",
  })
);

// Routes
app.use("/api/users", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/payment", paymentRoutes); //Route cũ
app.use("/api/payments", paymentsRoutes); //Route mới
app.use("/api/codes", codeRoutes);
app.use("/api/matchmaking", matchmakingRoutes);
app.use("/api", leaderboardRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/vouchers", voucherRoutes);

// Admin routes
app.use("/api/admin/auth", adminAuthRoutes);
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/transactions", adminTransactionRoutes);
app.use("/api/admin/codes", adminCodeRoutes);
app.use("/api/admin/reports", adminReportRoutes);

app.get("/", (req, res) => res.send("Welcome to Antagonism Game Server"));
app.use((req, res) => res.status(404).json({ message: "Route not found" }));

// HTTP + Socket.IO
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
io.use(socketAuthMiddleware);

io.on("connection", (socket) => {
  console.log(`✅ Socket connected: ${socket.id}, userId: ${socket.userId}`);
});

gameService.attachHandlers(io);

//Quan hệ giữa các bảng
require("./config/assosiation");

// DB connection & server start
sequelize
  .authenticate()
  .then(() => {
    console.log("✅ Database connected");
    server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
    sequelize.sync({ alter: true }).then(() => {
      console.log("✅ DB synced with alter!");
    });
  })
  .catch((err) => {
    console.error("❌ DB connection error:", err);
    process.exit(1);
  });

module.exports = app;
