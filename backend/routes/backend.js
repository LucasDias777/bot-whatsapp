const express = require("express");
const router = express.Router();

router.get("/ready", (req, res) => {
  res.json({
    backendReady: global.backendReady,
    status: global.backendReady ? "ready" : "booting",
  });
});

module.exports = router;