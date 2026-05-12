const cloudinary = require("../config/cloudinary");
const { Readable } = require("stream");

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

    const bufferStream = new Readable({
      read() {
        this.push(fileBuffer);
        this.push(null);
      },
    });

    bufferStream.pipe(stream);
  });
}

module.exports = uploadToCloudinary;
