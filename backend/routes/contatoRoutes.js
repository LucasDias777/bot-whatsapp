const router = require("express").Router();
const { adicionarContato, listarContatos, removerContato, editarContato } = require("../controllers/contatoController");

router.post("/", adicionarContato);
router.get("/", listarContatos);
router.put("/:id", editarContato);
router.delete("/:id", removerContato);

module.exports = router;