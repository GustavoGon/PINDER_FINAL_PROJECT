const multer = require("multer");
const path = require("path");

// storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (req.baseUrl.includes("users")) {
      cb(null, "uploads/users/");
    } else {
      cb(null, "uploads/pets/");
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

module.exports = upload;
