import multer from "multer";

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    // Quick pre-check; byte-level signature validation is performed on the buffer in the controller
    if (
      file.mimetype === "application/pdf" ||
      file.originalname.toLowerCase().endsWith(".pdf")
    ) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are supported"), false);
    }
  },
});

/**
 * Express middleware handling multipart upload for the "resume" field.
 * Catches Multer size limit errors (HTTP 413) and formatting errors (HTTP 400).
 */
export const handleResumeUpload = (req, res, next) => {
  upload.single("resume")(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({
            success: false,
            message: "File size exceeds the 5 MB limit",
          });
        }
        return res.status(400).json({
          success: false,
          message: `Upload error: ${err.message}`,
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message || "Failed to process uploaded file",
      });
    }
    next();
  });
};
