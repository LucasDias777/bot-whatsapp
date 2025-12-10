const router = require("express").Router();
const { criarGrupo, listarGrupos, deletarGrupo, listarContatosDoGrupo, adicionarContatoAoGrupo, removerContatoDoGrupo, editarGrupo } = require("../controllers/grupoController");

router.post("/", criarGrupo);
router.get("/", listarGrupos);
router.put("/:id", editarGrupo);
router.delete("/:id", deletarGrupo);

router.get("/:id/contatos", listarContatosDoGrupo);
router.post("/:id/adicionar", adicionarContatoAoGrupo);
router.delete("/:id/remover/:contatoId", removerContatoDoGrupo);

module.exports = router;