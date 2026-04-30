const express = require("express");
const router = express.Router();
const { getQR, addConnection, startConnection, deleteConnection, disconnect } = require("../controllers/qrController");

router.get("/", getQR);
router.post("/connections", addConnection);
router.post("/:id/start", startConnection);
router.post("/:id/disconnect", disconnect);
router.delete("/:id", deleteConnection);
router.post("/disconnect", disconnect);

module.exports = router;
