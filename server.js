import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import multer from "multer";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const API_BASE = (
  process.env.YOUCAM_API_BASE || "https://yce-api-01.makeupar.com"
).replace(/\/+$/, "");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png"];
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(new Error("Please upload a JPG or PNG image."));
  }
});



app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", "'wasm-unsafe-eval'"],
        connectSrc: [
          "'self'",
          "https://storage.googleapis.com"
        ]
      }
    }
  })
);
app.use(express.static("public"));

function apiHeaders() {
  const key = process.env.YOUCAM_API_KEY;
  if (!key) throw new Error("Missing YOUCAM_API_KEY in .env");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json"
  };
}

async function readJson(response) {
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`YouCam returned an unexpected response (HTTP ${response.status}).`);
  }

  if (!response.ok || body.status >= 400 || body.error) {
    throw new Error(
      body.error || body.message || `YouCam request failed (HTTP ${response.status}).`
    );
  }
  return body;
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    apiKeyConfigured: Boolean(process.env.YOUCAM_API_KEY)
  });
});

app.post("/api/analyze", upload.single("photo"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Choose a JPG or PNG photo first." });
    }

    const file = req.file;
    const headers = apiHeaders();

    // 1. Ask YouCam for a secure upload URL.
    const initResponse = await fetch(
      `${API_BASE}/s2s/v2.0/file/skin-analysis`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          files: [{
            content_type: file.mimetype,
            file_name: file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_"),
            file_size: file.size
          }]
        })
      }
    );

    const init = await readJson(initResponse);
    const uploadedFile = init?.data?.files?.[0];
    const fileId = uploadedFile?.file_id;
    const putRequest = uploadedFile?.requests?.find(
      item => item.method?.toUpperCase() === "PUT"
    );

    if (!fileId || !putRequest?.url) {
      throw new Error("YouCam did not return the expected upload details.");
    }

    // 2. Upload the image bytes to YouCam's signed URL.
    const putHeaders = { ...(putRequest.headers || {}) };
    delete putHeaders.Host;
    delete putHeaders.host;

    const putResponse = await fetch(putRequest.url, {
      method: "PUT",
      headers: putHeaders,
      body: file.buffer
    });

    if (!putResponse.ok) {
      throw new Error(`Image upload failed (HTTP ${putResponse.status}).`);
    }

    // 3. Start the skin analysis task.
    const taskResponse = await fetch(
      `${API_BASE}/s2s/v2.0/task/skin-analysis`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({
          src_file_id: fileId,
          dst_actions: ["wrinkle", "pore", "texture", "acne"],
          format: "json"
        })
      }
    );

    const taskBody = await readJson(taskResponse);
    const taskId = taskBody?.data?.task_id;

    if (!taskId) {
      throw new Error("YouCam did not return an analysis task ID.");
    }

    // 4. Check task status until complete, failed, or timed out.
    const deadline = Date.now() + 90000;
    let result = null;

    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 3000));

      const statusResponse = await fetch(
        `${API_BASE}/s2s/v2.0/task/skin-analysis/${encodeURIComponent(taskId)}`,
        { headers }
      );

      result = await readJson(statusResponse);
      const status = result?.data?.task_status;

      if (status === "success") {
        console.log("[SkinWise AI] Analysis completed successfully.");

        return res.json({
          ok: true,
          taskId,
          result: result.data
        });
      }

      if (status === "error" || status === "failed") {
  const details = {
    status,
    error: result?.error || result?.data?.error || null,
    error_code: result?.error_code || result?.data?.error_code || null,
    message: result?.message || result?.data?.message || null
  };

  console.error("YouCam task failure:", JSON.stringify(details));

  throw new Error(
    details.error ||
    details.message ||
    details.error_code ||
    "YouCam analysis failed. Check the Termux server output."
  );
}
    }

    return res.status(202).json({
      ok: false,
      pending: true,
      taskId,
      message: "Analysis is still processing. Please try again shortly."
    });
  } catch (error) {
    const originalMessage = String(
      error?.message || error || "Unknown error"
    );

    const missingKey = originalMessage.includes(
      "Missing YOUCAM_API_KEY"
    );

    const apiKey = process.env.YOUCAM_API_KEY;
    const safeMessage = apiKey
      ? originalMessage.split(apiKey).join("[REDACTED]")
      : originalMessage;

    console.error("[SkinWise AI] Analysis request failed:", {
      message: missingKey
        ? "API key is not configured."
        : safeMessage,
      errorName: error?.name || "Error"
    });

    if (!missingKey && error?.stack) {
      console.error("[SkinWise AI] Error stack:", error.stack);
    }

    const status = missingKey ? 500 : 502;
    const message = missingKey
      ? "The analysis service is not configured. Please contact the site administrator."
      : "Skin analysis could not be completed. Please check your connection and try again.";

    return res.status(status).json({ error: message });
  }
});

app.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      error: "The image must be smaller than 10 MB."
    });
  }

  if (err instanceof multer.MulterError) {
    return res.status(400).json({
      error: "The image could not be uploaded. Please try another JPG or PNG."
    });
  }

  if (err?.message === "Please upload a JPG or PNG image.") {
    return res.status(400).json({
      error: "Please upload a JPG or PNG image."
    });
  }

  console.error(
    "[SkinWise AI] Request rejected:",
    err?.name || "Error"
  );

  return res.status(400).json({
    error: "The request could not be processed. Please check the image and try again."
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`SkinWise AI running on http://127.0.0.1:${PORT}`);
});
