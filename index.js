require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const { getDb } = require("./server/db");

const app = express();
const PORT = process.env.PORT || 3000;

const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors(corsOrigin ? { origin: corsOrigin } : undefined));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Initialize DB then start
getDb()
  .then(() => {
    const { router: authRouter } = require("./server/auth");
    const doctorRouter = require("./server/doctor");
    const patientRouter = require("./server/patients");
    const visitRouter = require("./server/visits");

    app.use("/api/auth", authRouter);
    app.use("/api/doctor", doctorRouter);
    app.use("/api/patients", patientRouter);
    app.use("/api/visits", visitRouter);

    // Catch-all: serve index.html for client-side routing
    app.get("/{*path}", (req, res) => {
      res.sendFile(path.join(__dirname, "public", "index.html"));
    });

    app.listen(PORT, () => {
      console.log(`\n🏥 MedScribe running at http://localhost:${PORT}`);
      console.log(
        `   Database: ${path.join(__dirname, "db/medscribe.sqlite")}\n`,
      );
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  });
