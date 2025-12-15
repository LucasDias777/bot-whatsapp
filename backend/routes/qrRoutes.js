const express = require("express");
const router = express.Router();
const { getQR, disconnect } = require("../controllers/qrController");

router.get("/", getQR);
router.post("/disconnect", disconnect);

module.exports = router;