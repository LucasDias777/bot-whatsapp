let qrCodeAtual = "";
let conectado = false;

function getQR(req, res) {
  res.json({ qr: qrCodeAtual, conectado });
}

function setQR(v) {
  qrCodeAtual = v;
}

function setConectado(v) {
  conectado = v;
}

module.exports = { getQR, setQR, setConectado };
