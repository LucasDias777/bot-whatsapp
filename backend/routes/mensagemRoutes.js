const router = require("express").Router();
const {
  adicionarMensagem,
  listarMensagens,
  removerMensagem
} = require("../controllers/mensagemController");

router.post("/", adicionarMensagem);
router.get("/", listarMensagens);
router.delete("/:id", removerMensagem);

module.exports = router;
