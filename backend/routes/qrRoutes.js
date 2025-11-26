const express = require("express");
const router = express.Router();
const { getQR } = require("../controllers/qrController");

router.get("/", getQR);

module.exports = router;
