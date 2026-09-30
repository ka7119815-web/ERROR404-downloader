const express = require("express");
const path = require("path");
const { spawn } = require("child_process");
const fs = require("fs");

const app = express();
const PORT = 3000;

const publicDir = path.join(__dirname, "public");
const downloadDir = path.join(__dirname, "downloads");

fs.mkdirSync(downloadDir, { recursive: true });

app.use(express.json());
app.use(express.static(publicDir));

app.get("/api/status", (req, res) => {
  res.json({
    success: true,
    app: "ERROR404",
    message: "Server is working"
  });
});

app.post(["/api/download", "/api/download/"], (req, res) => {

  const { url, platform, format } = req.body;

  if (!url || !/^https?:\/\//i.test(url)) {
    return res.status(400).json({
      success: false,
      message: "جيب ياض لينك طيب الأول!"
    });
  }

  const isMusic = platform === "music";

  let args;

  if (isMusic) {

    const audioFormat = format === "m4a" ? "m4a" : "mp3";

    args = [
      "--no-playlist",
      "-x",
      "--audio-format",
      audioFormat,
      "--audio-quality",
      "0",
      "-o",
      path.join(downloadDir, "%(title).80s.%(ext)s"),
      url
    ];

  } else {

    args = [
      "--no-playlist",
      "-f",
      "bv*+ba/b",
      "--merge-output-format",
      "mp4",
      "-o",
      path.join(downloadDir, "%(title).80s.%(ext)s"),
      url
    ];

  }

  console.log("Starting yt-dlp:", url);

  const downloader = spawn("yt-dlp", args);

  let errorText = "";

  downloader.stderr.on("data", (data) => {
    errorText += data.toString();
    console.log(data.toString());
  });

  downloader.stdout.on("data", (data) => {
    console.log(data.toString());
  });

  downloader.on("error", (error) => {

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: "تعذر تشغيل yt-dlp",
        details: error.message
      });
    }

  });

  downloader.on("close", (code) => {

    if (res.headersSent) return;

    if (code === 0) {

      res.json({
        success: true,
        message: isMusic
          ? "تم تنزيل الأغنية بنجاح"
          : "تم تنزيل الفيديو بنجاح"
      });

    } else {

      res.status(500).json({
        success: false,
        message: isMusic
          ? "تعذر تنزيل الأغنية"
          : "تعذر تنزيل الفيديو",
        details: errorText.slice(-1500)
      });

    }

  });

});

app.listen(PORT, "127.0.0.1", () => {
  console.log(`ERROR404 running on http://127.0.0.1:${PORT}`);
});
