const router = require("express").Router();
const {
  criarGrupo,
  listarGrupos,
  deletarGrupo,
  listarContatosDoGrupo,
  adicionarContatoAoGrupo,
  removerContatoDoGrupo
} = require("../controllers/grupoController");

router.post("/", criarGrupo);
router.get("/", listarGrupos);
router.delete("/:id", deletarGrupo);

router.get("/:id/contatos", listarContatosDoGrupo);
router.post("/:id/adicionar", adicionarContatoAoGrupo);
router.delete("/:id/remover/:contatoId", removerContatoDoGrupo);

module.exports = router;
