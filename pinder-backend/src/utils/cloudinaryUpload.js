const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

function uploadToCloudinary(fileBuffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
      },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      },
    );

    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
}

module.exports = uploadToCloudinary;
