const express = require("express");
const router = express.Router();
const { getQR, connect, disconnect } = require("../controllers/qrController");

router.get("/", getQR);
router.post("/connect", connect);
router.post("/disconnect", disconnect);

module.exports = router;