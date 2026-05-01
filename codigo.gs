function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Casamento Carol & Marlon')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function formatarMoeda(valor) {
  if (isNaN(valor) || valor === "") return "R$ 0,00";
  return parseFloat(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getPresentes() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheets()[0]; 
    const dados = sheet.getDataRange().getValues();
    dados.shift(); 
    
    return dados.map((linha, index) => {
      return {
        nome: linha[2], 
        link: linha[3], 
        categoria: linha[4], 
        imagem: converterLinkDrive(linha[5]), 
        vMin: formatarMoeda(linha[6]),
        vMax: formatarMoeda(linha[7]),
        tipoValor: linha[8], 
        status: linha[9], // O status 'Escolhido' agora é lido e enviado para o HTML
        index: index + 2
      };
    }).filter(p => p.nome !== ""); // Filtra apenas se a linha estiver vazia
  } catch(e) {
    return "Erro: " + e.toString();
  }
}

function converterLinkDrive(link) {
  if (!link || typeof link !== 'string') return "";
  const idMatch = link.match(/[-\w]{25,}/);
  if (idMatch) return "https://lh3.googleusercontent.com/d/" + idMatch[0];
  return link;
}

function escolherPresente(linha, nomeUsuario) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0];
  sheet.getRange(linha, 10).setValue('Escolhido');
  sheet.getRange(linha, 11).setValue('TRUE');       
  sheet.getRange(linha, 12).setValue(nomeUsuario); 
  return true;
}
function salvarRecado(recado, nomeUsuario) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheetRecados = ss.getSheetByName("Página2");
    
    // Se a aba não existir, ele cria automaticamente
    if (!sheetRecados) {
      sheetRecados = ss.insertSheet("Página2");
      sheetRecados.appendRow(["Data e Horário", "Recado", "Nome"]);
    }
    
    const dataHora = new Date();
    sheetRecados.appendRow([dataHora, recado, nomeUsuario]);
    return true;
  } catch(e) {
    throw new Error("Erro ao salvar recado: " + e.message);
  }
}
