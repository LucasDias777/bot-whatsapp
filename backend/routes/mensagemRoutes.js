const router = require("express").Router();
const { adicionarMensagem, listarMensagens, removerMensagem, editarMensagem } = require("../controllers/mensagemController");

router.post("/", adicionarMensagem);
router.get("/", listarMensagens);
router.delete("/:id", removerMensagem);
router.put("/:id", editarMensagem);

module.exports = router;