require("dotenv").config();
const PORT = 3000;
const express = require("express");
const cors = require("cors");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const authRoutes = require("./routes/authRoutes");
const roomRoutes = require("./routes/roomRoutes");
const matchRoutes = require("./routes/matchRoutes");
const sequelize = require("./config/postgres");

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: "GET, POST, PUT, DELETE",
    allowedHeaders: "Content-Type, Authorization",
  })
);

// Kiểm tra kết nối PostgreSQL
sequelize
  .authenticate()
  .then(() => console.log("PostgreSQL connected"))
  .catch((err) => console.error("PostgreSQL connection error:", err));

// Swagger
const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Game API",
      version: "1.0.0",
      description: "API for managing users and friends",
    },
    servers: [{ url: `http://localhost:${PORT}` }],
  },
  apis: ["./routes/*.js"],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));

app.use("/api/users", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/matches", matchRoutes);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
