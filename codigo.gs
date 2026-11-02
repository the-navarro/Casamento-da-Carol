function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : null;
  if (action === 'getPresentes') {
    return ContentService.createTextOutput(JSON.stringify(getPresentesData()))
      .setMimeType(ContentService.MimeType.JSON);
  }
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Casamento Carol & Marlon')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets()[0];
    
    if (data.action === 'escolher') {
      const linha = data.linha;
      const nomeUsuario = data.nome;
      sheet.getRange(linha, 10).setValue('Escolhido'); // Coluna J (Status)
      sheet.getRange(linha, 11).setValue(true);        // Coluna K (Check)
      sheet.getRange(linha, 12).setValue(nomeUsuario); // Coluna L (Escolhido por)
      return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
    }
    
    if (data.action === 'recado') {
      let sheetRecados = ss.getSheetByName("Página2");
      if (!sheetRecados) {
        sheetRecados = ss.insertSheet("Página2");
        sheetRecados.appendRow(["Data e Horário", "Recado", "Nome"]);
      }
      sheetRecados.appendRow([new Date(), data.texto, data.nome]);
      return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'adicionar') {
      const d = data.dados;
      sheet.appendRow([
        d.id, d.itemCodigo, d.nome, d.link, d.categoria, 
        d.imagem, d.vMin, d.vMax, d.tipoValor, d.status || 'Disponível', 
        d.check || false, d.escolhidoPor || '', d.statusProduto || 'Ativo'
      ]);
      return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'atualizar') {
      const linha = parseInt(data.linha);
      const d = data.dados;
      sheet.getRange(linha, 1, 1, 13).setValues([[
        d.id, d.itemCodigo, d.nome, d.link, d.categoria, 
        d.imagem, d.vMin, d.vMax, d.tipoValor, d.status, 
        d.check, d.escolhidoPor, d.statusProduto
      ]]);
      return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
    }

    if (data.action === 'excluir') {
      const linha = parseInt(data.linha);
      sheet.deleteRow(linha);
      return ContentService.createTextOutput(JSON.stringify({success: true})).setMimeType(ContentService.MimeType.JSON);
    }

  } catch(err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: err.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function formatarMoeda(valor) {
  if (isNaN(valor) || valor === "" || valor === null) return "R$ 0,00";
  return Number(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getPresentesData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0]; 
  const dados = sheet.getDataRange().getValues();
  dados.shift(); // Remove o cabeçalho
  
  return dados.map((linha, index) => {
    return {
      id: linha[0],             // ID
      itemCodigo: linha[1],     // Item
      nome: linha[2],           // Nome
      link: linha[3],           // Link
      categoria: linha[4],      // Categoria
      imagemOriginal: linha[5], // Imagem
      imagem: converterLinkDrive(linha[5]), 
      vMinRaw: linha[6],        // Valor Mínimo
      vMin: formatarMoeda(linha[6]),
      vMaxRaw: linha[7],        // Valor Máximo
      vMax: formatarMoeda(linha[7]),
      tipoValor: linha[8],      // Tipo de Valor
      status: linha[9],         // Status
      check: linha[10],         // Check
      escolhidoPor: linha[11],  // Escolhido por:
      statusProduto: linha[12], // Status do Produto
      index: index + 2
    };
  }).filter(p => p.nome !== "");
}

function getPresentes() {
  return getPresentesData();
}

function converterLinkDrive(link) {
  if (!link || typeof link !== 'string') return "";
  const idMatch = link.match(/[-\w]{25,}/);
  if (idMatch) return "https://lh3.googleusercontent.com/d/" + idMatch[0];
  return link;
}
