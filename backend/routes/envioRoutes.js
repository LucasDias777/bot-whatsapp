const router = require("express").Router();
const { enviarAgora } = require("../controllers/envioController");

router.post("/", enviarAgora);

module.exports = router;