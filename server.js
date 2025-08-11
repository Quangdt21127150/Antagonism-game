require("dotenv").config();
const express = require("express");
const cors = require("cors");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const authRoutes = require("./routes/authRoutes");
const roomRoutes = require("./routes/roomRoutes");
const userRoutes = require("./routes/userRoutes");
const matchRoutes = require("./routes/matchRoutes");
const itemRoutes = require("./routes/itemRoutes");
const voucherRoutes = require("./routes/voucherRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const sequelize = require("./config/postgres");
const path = require("path");

const app = express();
const PORT = 3000;

// Serve static files from public directory (e.g., for favicon.ico)
app.use(express.static(path.join(__dirname, "public")));

app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: "GET, POST, PUT, DELETE",
    allowedHeaders: "Content-Type, Authorization",
  })
);

// Connect to PostgreSQL
sequelize
  .authenticate()
  .then(() => console.log("PostgreSQL connected"))
  .catch((err) => console.error("PostgreSQL connection error:", err));

// Swagger configuration
const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Game API",
      version: "1.0.0",
      description: "API for managing users, friends, and items",
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

// API routes
app.use("/api/users", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/matches", matchRoutes);
app.use("/api/", userRoutes);
app.use("/api/items", itemRoutes);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/payment", paymentRoutes);

// Default route
app.get("/", (req, res) => {
  res.send("Welcome to Antagonism Game Server");
});

// 404 middleware
app.use((req, res, next) => {
  res.status(404).json({ message: "Route not found" });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
