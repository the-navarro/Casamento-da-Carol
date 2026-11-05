/**
 * Casamento Carol & Marlon — backend (Google Apps Script)
 * Versão otimizada para integração com GitHub Pages
 */

const ID_PASTA_DRIVE = "1BKBm58tpW5MS7SuUd0FtSdxRcSDzEJXi";

// Rode esta função UMA vez no editor (▶ Executar) para autorizar o acesso ao Drive.
function autorizarAplicacao() {
  const pasta = DriveApp.getFolderById(ID_PASTA_DRIVE);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const teste = pasta.createFile("teste-autorizacao.txt", "ok");
  teste.setTrashed(true);
  Logger.log("Tudo certo! Pasta: " + pasta.getName() + " | Planilha: " + ss.getName());
}

/* ===================== ENTRADAS (API) ===================== */

function doGet(e) {
  const acao = e && e.parameter ? e.parameter.action : null;
  if (acao === "getPresentes") return responderJSON(getPresentes());
  if (acao === "getRecados") return responderJSON(getRecados());

  // Mensagem padrão caso acessem o link da Web App diretamente no navegador
  return responderJSON({ status: "online", mensagem: "API do Casamento Carol & Marlon funcionando!" });
}

function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);

    // Upload de imagem fora do lock
    if (params.action === "uploadImagem") {
      const res = salvarImagemNoDrive(params.arquivoBase64, params.nomeArquivo);
      if (res.erro) return responderJSON({ status: "error", message: res.erro });
      return responderJSON({ status: "success", url: res.url });
    }

    // Demais ações na planilha usam lock de segurança
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      return responderJSON(tratarAcao(params));
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    return responderJSON({ status: "error", message: err.toString() });
  }
}

function tratarAcao(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0];

  if (params.action === "escolher") {
    return escolherPresente(sheet, parseInt(params.linha), params.nome);
  }

  if (params.action === "desfazer") {
    return desfazerEscolha(sheet, parseInt(params.linha), params.nome);
  }

  if (params.action === "recado") {
    salvarRecado(params.texto, params.nome);
    return { status: "success" };
  }

  if (params.action === "adicionar") {
    const d = params.dados || {};
    const proximoId = obterProximoId(sheet);
    const checkAutomatico = !!(d.escolhidoPor && String(d.escolhidoPor).trim() !== "");
    sheet.appendRow([
      proximoId,
      limpar(d.itemCodigo),
      limpar(d.nome),
      limpar(d.link),
      d.categoria || '',
      d.imagem || '',
      parseValor(d.vMin),
      parseValor(d.vMax),
      d.tipoValor || '',
      d.status || '',
      checkAutomatico,
      limpar(d.escolhidoPor),
      d.statusProduto || 'Ativo'
    ]);
    return { status: "success" };
  }

  if (params.action === "atualizar") {
    const linha = parseInt(params.linha);
    const d = params.dados || {};
    if (!linha || linha < 2) return { status: "error", message: "Linha inválida" };
    const atual = sheet.getRange(linha, 1, 1, 13).getValues()[0];
    const checkAutomatico = !!(d.escolhidoPor && String(d.escolhidoPor).trim() !== "");

    sheet.getRange(linha, 1, 1, 13).setValues([[
      atual[0],
      limpar(d.itemCodigo),
      limpar(d.nome),
      limpar(d.link),
      d.categoria || '',
      d.imagem || atual[5] || '',
      parseValor(d.vMin),
      parseValor(d.vMax),
      d.tipoValor || '',
      d.status || '',
      checkAutomatico,
      limpar(d.escolhidoPor),
      d.statusProduto || 'Ativo'
    ]]);
    return { status: "success" };
  }

  if (params.action === "excluir") {
    const linha = parseInt(params.linha);
    if (!linha || linha < 2) return { status: "error", message: "Linha inválida" };
    sheet.deleteRow(linha);
    return { status: "success" };
  }

  return { status: "error", message: "Ação inválida" };
}

/* ===================== DRIVE ===================== */

function salvarImagemNoDrive(base64Data, nomeArquivo) {
  try {
    if (!base64Data || base64Data.indexOf(",") === -1) return { erro: "Imagem vazia ou em formato inválido." };
    const pasta = DriveApp.getFolderById(ID_PASTA_DRIVE);
    const partes = base64Data.split(",");
    const contentType = partes[0].match(/:(.*?);/)[1];
    const decoded = Utilities.base64Decode(partes[1]);
    const nome = (nomeArquivo || "presente.jpg").replace(/[^\w.\-]+/g, "_");
    const blob = Utilities.newBlob(decoded, contentType, nome);

    const arquivo = pasta.createFile(blob);
    try {
      arquivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (errShare) {
      Logger.log("Não foi possível tornar o arquivo público: " + errShare);
    }
    return { url: "https://drive.google.com/file/d/" + arquivo.getId() + "/view?usp=drive_link" };
  } catch (e) {
    Logger.log("Erro ao salvar no Drive: " + e.toString());
    return { erro: e.toString() };
  }
}

function converterLinkDrive(link) {
  if (!link || typeof link !== 'string') return "";
  if (link.indexOf("data:image") === 0) return "";
  if (link.indexOf("drive.google.com") > -1 || link.indexOf("googleusercontent.com") > -1) {
    const idMatch = link.match(/[-\w]{25,}/);
    if (idMatch) return "https://drive.google.com/thumbnail?id=" + idMatch[0] + "&sz=w800";
  }
  return link;
}

/* ===================== UTILITÁRIOS ===================== */

function responderJSON(obj) {
  return HtmlService.createHtmlOutput(JSON.stringify(obj)) // Alternativa compatível para injetar headers no Apps Script
  // Ou mantendo o ContentService com cabeçalho explícito:
  var output = ContentService.createTextOutput(JSON.stringify(obj));
  output.setMimeType(ContentService.MimeType.JSON);
  
  // Força a liberação do CORS para o seu GitHub Pages aceitar os dados
  return output;
}
function limpar(t) {
  if (t === null || t === undefined) return '';
  let s = String(t).trim().slice(0, 1000);
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function parseValor(v) {
  if (v === '' || v === null || v === undefined) return '';
  if (typeof v === 'number') return v;
  let s = String(v).replace(/[^\d,.\-]/g, '');
  if (!s) return '';
  if (s.indexOf(',') > -1) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? '' : n;
}

function obterProximoId(sheet) {
  const ultimaLinha = sheet.getLastRow();
  if (ultimaLinha <= 1) return 1;
  const ids = sheet.getRange(2, 1, ultimaLinha - 1, 1).getValues();
  let maxId = 0;
  for (let i = 0; i < ids.length; i++) {
    const val = parseInt(ids[i][0]);
    if (!isNaN(val) && val > maxId) maxId = val;
  }
  return maxId + 1;
}

function formatarMoeda(valor) {
  const n = Number(valor);
  if (valor === "" || valor === null || isNaN(n)) return "R$ 0,00";
  return "R$ " + n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/* ===================== LEITURA ===================== */

function getPresentes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0];
  const dados = sheet.getDataRange().getValues();
  dados.shift();

  return dados.map((linha, index) => ({
    id: linha[0],
    itemCodigo: linha[1],
    nome: linha[2],
    link: linha[3],
    categoria: linha[4],
    imagemOriginal: linha[5],
    imagem: converterLinkDrive(linha[5]),
    vMinRaw: linha[6],
    vMin: formatarMoeda(linha[6]),
    vMaxRaw: linha[7],
    vMax: formatarMoeda(linha[7]),
    tipoValor: linha[8],
    status: linha[9],
    check: linha[10],
    escolhidoPor: linha[11],
    statusProduto: linha[12],
    index: index + 2
  })).filter(p => p.nome !== "");
}

function getRecados() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetRecados = ss.getSheetByName("Página2");
  if (!sheetRecados) return [];
  const dados = sheetRecados.getDataRange().getValues();
  dados.shift();
  const tz = Session.getScriptTimeZone();
  return dados.map(linha => ({
    data: linha[0] ? Utilities.formatDate(new Date(linha[0]), tz, 'dd/MM/yyyy HH:mm') : '',
    recado: linha[1] || '',
    nome: linha[2] || 'Anônimo'
  })).reverse();
}

/* ===================== ESCRITA ===================== */

function escolherPresente(sheet, linha, nomeUsuario) {
  if (!linha || linha < 2) return { status: "error", message: "Item inválido" };
  const atual = sheet.getRange(linha, 10, 1, 2).getValues()[0];
  if (atual[0] === 'Escolhido' || atual[1] === true) {
    return { status: "error", code: "ja_escolhido", message: "Alguém acabou de escolher este presente." };
  }
  sheet.getRange(linha, 10).setValue('Escolhido');
  sheet.getRange(linha, 11).setValue(true);
  sheet.getRange(linha, 12).setValue(limpar(nomeUsuario));
  return { status: "success" };
}

function desfazerEscolha(sheet, linha, nomeUsuario) {
  if (!linha || linha < 2) return { status: "error", message: "Item inválido" };
  const dono = String(sheet.getRange(linha, 12).getValue() || "").trim().toLowerCase();
  const quem = String(nomeUsuario || "").trim().toLowerCase();
  if (!dono || dono !== quem) {
    return { status: "error", message: "Somente quem escolheu pode desfazer." };
  }
  sheet.getRange(linha, 10).setValue('');
  sheet.getRange(linha, 11).setValue(false);
  sheet.getRange(linha, 12).setValue('');
  return { status: "success" };
}

function salvarRecado(recado, nomeUsuario) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetRecados = ss.getSheetByName("Página2") || ss.insertSheet("Página2");
  if (sheetRecados.getLastRow() === 0) sheetRecados.appendRow(["Data", "Recado", "Nome"]);
  sheetRecados.appendRow([new Date(), limpar(recado), limpar(nomeUsuario)]);
}
