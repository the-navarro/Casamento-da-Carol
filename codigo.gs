// Permite que o GitHub acesse os dados (API)
function doGet(e) {
  const acao = e && e.parameter ? e.parameter.action : null;
  
  if (acao === "getPresentes") {
    const dados = getPresentes();
    return ContentService.createTextOutput(JSON.stringify(dados))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Casamento Carol & Marlon')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Recebe as ações de presentes, recados e gestão do GitHub
function doPost(e) {
  try {
    const params = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets()[0];

    // 1. Escolher presente (Convidado)
    if (params.action === "escolher") {
      escolherPresente(params.linha, params.nome);
      return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Salvar recado (Convidado)
    if (params.action === "recado") {
      salvarRecado(params.texto, params.nome);
      return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Adicionar novo item (Noiva/Noivo/Adm)
    if (params.action === "adicionar") {
      const d = params.dados;
      sheet.appendRow([
        d.id, d.itemCodigo, d.nome, d.link, d.categoria, 
        d.imagem, d.vMin, d.vMax, d.tipoValor, d.status || 'Disponível', 
        d.check || 'FALSE', d.escolhidoPor || '', d.statusProduto || 'Ativo'
      ]);
      return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 4. Atualizar/Editar item existente (Noiva/Noivo/Adm)
    if (params.action === "atualizar") {
      const linha = parseInt(params.linha);
      const d = params.dados;
      sheet.getRange(linha, 1, 1, 13).setValues([[
        d.id, d.itemCodigo, d.nome, d.link, d.categoria, 
        d.imagem, d.vMin, d.vMax, d.tipoValor, d.status, 
        d.check, d.escolhidoPor, d.statusProduto
      ]]);
      return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 5. Excluir item (Noiva/Noivo/Adm)
    if (params.action === "excluir") {
      const linha = parseInt(params.linha);
      sheet.deleteRow(linha);
      return ContentService.createTextOutput(JSON.stringify({"status": "success"}))
        .setMimeType(ContentService.MimeType.JSON);
    }

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({"status": "error", "message": err.toString()}))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// --- FUNÇÕES DE SUPORTE ---

function formatarMoeda(valor) {
  if (valor === "" || valor === null || isNaN(valor)) return "R$ 0,00";
  return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getPresentes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0]; 
  const dados = sheet.getDataRange().getValues();
  dados.shift(); // Remove o cabeçalho
  
  return dados.map((linha, index) => ({
    id: linha[0],             // ID (Coluna A)
    itemCodigo: linha[1],     // Item (Coluna B)
    nome: linha[2],           // Nome (Coluna C)
    link: linha[3],           // Link (Coluna D)
    categoria: linha[4],      // Categoria (Coluna E)
    imagemOriginal: linha[5], // Imagem crua (Coluna F)
    imagem: converterLinkDrive(linha[5]), 
    vMinRaw: linha[6],        // Valor Mínimo sem formatação (Coluna G)
    vMin: formatarMoeda(linha[6]),
    vMaxRaw: linha[7],        // Valor Máximo sem formatação (Coluna H)
    vMax: formatarMoeda(linha[7]),
    tipoValor: linha[8],      // Tipo de Valor (Coluna I)
    status: linha[9],         // Status (Coluna J)
    check: linha[10],         // Check (Coluna K)
    escolhidoPor: linha[11],  // Escolhido por: (Coluna L)
    statusProduto: linha[12], // Status do Produto (Coluna M)
    index: index + 2
  })).filter(p => p.nome !== "");
}

function converterLinkDrive(link) {
  if (!link || typeof link !== 'string') return "";
  const idMatch = link.match(/[-\w]{25,}/);
  return idMatch ? "https://lh3.googleusercontent.com/d/" + idMatch[0] : link;
}

function escolherPresente(linha, nomeUsuario) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0];
  sheet.getRange(linha, 10).setValue('Escolhido'); // Coluna J
  sheet.getRange(linha, 11).setValue('TRUE');       // Coluna K
  sheet.getRange(linha, 12).setValue(nomeUsuario);  // Coluna L
}

function salvarRecado(recado, nomeUsuario) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheetRecados = ss.getSheetByName("Página2") || ss.insertSheet("Página2");
  if (sheetRecados.getLastRow() === 0) sheetRecados.appendRow(["Data", "Recado", "Nome"]);
  sheetRecados.appendRow([new Date(), recado, nomeUsuario]);
}
