const router = require("express").Router();
const { adicionarAgendamento, listarAgendamentos, removerAgendamento, editarAgendamento } = require("../controllers/agendamentoController");

router.post("/", adicionarAgendamento);
router.get("/", listarAgendamentos);
router.delete("/:id", removerAgendamento);
router.put("/:id", editarAgendamento);

module.exports = router;