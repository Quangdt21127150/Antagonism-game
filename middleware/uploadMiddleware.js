const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  folder: "Uploads",
  allowedFormats: ["jpg", "png", "jpeg"],
  transformation: [{ width: 500, height: 500, crop: "limit" }],
});

// Khởi tạo middleware upload
const upload = multer({ storage: storage });

module.exports = upload;
