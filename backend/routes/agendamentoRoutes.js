const router = require("express").Router();
const { adicionarAgendamento, listarAgendamentos, removerAgendamento } = require("../controllers/agendamentoController");

router.post("/", adicionarAgendamento);
router.get("/", listarAgendamentos);
router.delete("/:id", removerAgendamento);

module.exports = router;