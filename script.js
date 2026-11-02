const URL_API = "https://script.google.com/macros/s/AKfycbyaORFvDT1v-l9hfld8qWR6FuRBJzHasJvUKMSl0b4Dish-gbkvyjuVXtMVPXNDxtlB/exec";

let usuarioAtivo = "";
let tipoPermissao = "convidado";
let listaGlobal = [];
let categoriaAtiva = "Todos";
let itemSelecionado = null;

window.addEventListener('DOMContentLoaded', () => {
  carregarDadosServidor();
});

function carregarDadosServidor(callback) {
  fetch(`${URL_API}?action=getPresentes`)
    .then(res => res.json())
    .then(itens => {
      if (Array.isArray(itens)) {
        listaGlobal = itens;
        if (callback) callback();
      } else {
        listaGlobal = [];
        if (callback) callback();
      }
    })
    .catch(err => {
      console.error("Erro ao carregar dados:", err);
      listaGlobal = [];
      if (callback) callback();
    });
}

function verificarTipoAcesso() {
  const tipo = document.getElementById('tipoAcesso').value;
  const grupoSenha = document.getElementById('grupoSenha');
  if (tipo !== 'convidado') {
    grupoSenha.classList.remove('hidden');
  } else {
    grupoSenha.classList.add('hidden');
    document.getElementById('senhaAcesso').value = '';
  }
}

function tentarEntrar() {
  const inputEl = document.getElementById('nomeUser');
  const nomeDigitado = inputEl ? inputEl.value.trim() : "";
  tipoPermissao = document.getElementById('tipoAcesso').value;
  const senhaDigitada = document.getElementById('senhaAcesso').value;

  if (tipoPermissao !== 'convidado') {
    if (senhaDigitada !== '123456') {
      alert("Senha incorreta para acesso restrito. A senha é 123456.");
      return;
    }
  }
  
  usuarioAtivo = nomeDigitado !== "" ? nomeDigitado : (tipoPermissao === 'convidado' ? "Convidado" : tipoPermissao.toUpperCase());

  const loginEl = document.getElementById('login');
  const loadingEl = document.getElementById('loadingScreen');
  
  if (loginEl) { loginEl.classList.add('hidden'); loginEl.style.display = 'none'; }
  if (loadingEl) { loadingEl.classList.remove('hidden'); loadingEl.style.display = 'flex'; }

  carregarDadosServidor(() => {
    setTimeout(() => {
      if (loadingEl) { loadingEl.classList.add('hidden'); loadingEl.style.display = 'none'; }
      
      document.getElementById('lista')?.classList.remove('hidden');
      document.getElementById('priceBar')?.classList.remove('hidden');
      document.getElementById('mainFooter')?.classList.remove('hidden');
      document.getElementById('btnRecadoHeader')?.classList.remove('hidden');

      if (tipoPermissao !== 'convidado') {
        document.getElementById('btnAdicionarHeader')?.classList.remove('hidden');
      }

      aplicarFiltros();
    }, 1500);
  });
}

function converterLinkDriveParaExibicao(link) {
  if (!link || typeof link !== 'string') return "https://via.placeholder.com/150?text=Sem+Foto";
  const idMatch = link.match(/[-\w]{25,}/);
  return idMatch ? "https://lh3.googleusercontent.com/d/" + idMatch[0] : link;
}

function atualizarPreviewAoDigitar(link) {
  const urlFinal = converterLinkDriveParaExibicao(link);
  document.getElementById('previewImg').src = urlFinal;
}

function toggleValorMaximo() {
  const tipoValor = document.getElementById('formTipoValor').value;
  const grupoVMax = document.getElementById('grupoValorMax');
  if (tipoValor === 'Faixa de Preço') {
    grupoVMax.classList.remove('hidden');
  } else {
    grupoVMax.classList.add('hidden');
    document.getElementById('formVMax').value = '';
    document.getElementById('avisoValorMax').classList.add('hidden');
  }
}

function validarValoresPreco() {
  const vMinStr = document.getElementById('formVMin').value.replace(',', '.');
  const vMaxStr = document.getElementById('formVMax').value.replace(',', '.');
  const aviso = document.getElementById('avisoValorMax');

  const vMin = parseFloat(vMinStr);
  const vMax = parseFloat(vMaxStr);

  if (!isNaN(vMin) && !isNaN(vMax) && vMax < vMin) {
    aviso.classList.remove('hidden');
  } else {
    aviso.classList.add('hidden');
  }
}

function abrirTelaEdicao(idx = null) {
  if (idx === null) {
    // Adicionar novo item
    document.getElementById('editorTitulo').innerText = "Adicionar Novo Item";
    document.getElementById('formIndex').value = "";
    document.getElementById('formId').value = "(Automático)";
    document.getElementById('formItem').value = "";
    document.getElementById('formNome').value = "";
    document.getElementById('formLink').value = "";
    document.getElementById('formCategoria').value = "Cozinha";
    document.getElementById('formImagem').value = "";
    document.getElementById('previewImg').src = "https://via.placeholder.com/150?text=Sem+Foto";
    document.getElementById('formVMin').value = "";
    document.getElementById('formTipoValor').value = "Único";
    document.getElementById('formVMax').value = "";
    document.getElementById('formStatus').value = "";
    document.getElementById('formCheck').value = "false";
    document.getElementById('formEscolhidoPor').value = "";
    document.getElementById('formStatusProduto').value = "Ativo";
  } else {
    // Editar item existente
    const item = listaGlobal.find(i => i.index === idx);
    if (!item) return;

    document.getElementById('editorTitulo').innerText = "Editar Item Completo";
    document.getElementById('formIndex').value = item.index;
    document.getElementById('formId').value = item.id || "";
    document.getElementById('formItem').value = item.itemCodigo || "";
    document.getElementById('formNome').value = item.nome || "";
    document.getElementById('formLink').value = item.link || "";
    document.getElementById('formCategoria').value = item.categoria || "Cozinha";
    document.getElementById('formImagem').value = item.imagemOriginal || "";
    document.getElementById('previewImg').src = item.imagem || "https://via.placeholder.com/150?text=Sem+Foto";
    document.getElementById('formVMin').value = item.vMinRaw || "";
    document.getElementById('formTipoValor').value = item.tipoValor || "Único";
    document.getElementById('formVMax').value = item.vMaxRaw || "";
    document.getElementById('formStatus').value = item.status || "";
    document.getElementById('formCheck').value = String(item.check).toLowerCase() === 'true' ? "true" : "false";
    document.getElementById('formEscolhidoPor').value = item.escolhidoPor || "";
    document.getElementById('formStatusProduto').value = item.statusProduto || "Ativo";
  }

  toggleValorMaximo();
  validarValoresPreco();
  document.getElementById('telaEdicaoCompleta').classList.remove('hidden');
}

function fecharTelaEdicao() {
  document.getElementById('telaEdicaoCompleta').classList.add('hidden');
}

function salvarItemCompleto() {
  const index = document.getElementById('formIndex').value;
  const dadosItem = {
    itemCodigo: document.getElementById('formItem').value,
    nome: document.getElementById('formNome').value,
    link: document.getElementById('formLink').value,
    categoria: document.getElementById('formCategoria').value,
    imagem: document.getElementById('formImagem').value,
    vMin: document.getElementById('formVMin').value,
    tipoValor: document.getElementById('formTipoValor').value,
    vMax: document.getElementById('formVMax').value,
    status: document.getElementById('formStatus').value,
    check: document.getElementById('formCheck').value === 'true',
    escolhidoPor: document.getElementById('formEscolhidoPor').value,
    statusProduto: document.getElementById('formStatusProduto').value
  };

  const acao = index ? 'atualizar' : 'adicionar';

  fetch(URL_API, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify({ action: acao, linha: index, dados: dadosItem })
  }).then(() => {
    fecharTelaEdicao();
    document.getElementById('successMsg').innerText = "Item salvo com sucesso!";
    document.getElementById('customSuccess').classList.remove('hidden');
    carregarDadosServidor(aplicarFiltros);
  });
}

function excluirItem(idx) {
  if (!confirm("Tem certeza que deseja excluir este item?")) return;

  fetch(URL_API, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify({ action: 'excluir', linha: idx })
  }).then(() => {
    document.getElementById('successMsg').innerText = "Item excluído com sucesso!";
    document.getElementById('customSuccess').classList.remove('hidden');
    carregarDadosServidor(aplicarFiltros);
  });
}

function abrirModalRecado() { document.getElementById('modalRecado').classList.remove('hidden'); }
function fecharModalRecado() { document.getElementById('modalRecado').classList.add('hidden'); document.getElementById('txtRecado').value = ""; }

function enviarRecado() {
  const texto = document.getElementById('txtRecado').value;
  if(!texto) return;
  
  fetch(URL_API, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify({ action: 'recado', texto: texto, nome: usuarioAtivo })
  }).then(() => {
    fecharModalRecado();
    document.getElementById('successMsg').innerText = "Seu recado foi enviado com sucesso!";
    document.getElementById('customSuccess').classList.remove('hidden');
  });
}

function filtrar(categoria, elemento) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  elemento.classList.add('active');
  categoriaAtiva = categoria;
  aplicarFiltros();
}

function aplicarFiltros() {
  let filtrados = [...listaGlobal];
  
  if (tipoPermissao === 'convidado') {
    filtrados = filtrados.filter(i => i.statusProduto !== 'Inválido' && i.statusProduto !== 'Retirado');
  }

  if(categoriaAtiva !== "Todos") {
    filtrados = filtrados.filter(i => i.categoria === categoriaAtiva);
  }
  
  const range = document.getElementById('rangePrice').value;
  if(range !== "all") {
    filtrados = filtrados.filter(i => {
      const v = parseFloat(String(i.vMinRaw).replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
      if(range === "10-20") return v >= 10 && v <= 20;
      if(range === "20-30") return v > 20 && v <= 30;
      if(range === "30-40") return v > 30 && v <= 40;
      if(range === "40-50") return v > 40 && v <= 50;
      if(range === "50-100") return v > 50 && v <= 100;
      return true;
    });
  }
  
  const order = document.getElementById('sortOrder').value;
  filtrados.sort((a, b) => {
    const sA = (a.status === 'Escolhido' || a.check === true) ? 1 : 0;
    const sB = (b.status === 'Escolhido' || b.check === true) ? 1 : 0;
    if (sA !== sB) return sA - sB;
    
    const pA = parseFloat(String(a.vMinRaw).replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
    const pB = parseFloat(String(b.vMinRaw).replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
    if(order === "asc") return pA - pB;
    if(order === "desc") return pB - pA;
    return 0;
  });
  
  renderizarCards(filtrados);
}

function renderizarCards(itens) {
  const grid = document.getElementById('grid');
  grid.innerHTML = itens.length ? "" : "<p style='grid-column:span 2; text-align:center; padding-top: 50px; color: #64748b;'>Nenhum item encontrado.</p>";
  
  const ehAdmin = tipoPermissao !== 'convidado';

  itens.forEach(item => {
    const isE = item.status === 'Escolhido' || item.check === true || item.statusProduto === 'Esgotado';
    const foraDeLinha = item.statusProduto === 'Inválido' || item.statusProduto === 'Retirado';

    grid.innerHTML += `
      <div class="card ${isE ? 'esgotado' : ''}">
        ${isE ? '<div class="esgotado-badge">Escolhido</div>' : ''}
        ${foraDeLinha ? `<div class="status-badge-admin">${item.statusProduto}</div>` : ''}
        <div class="card-img-wrapper">
          <img src="${item.imagem}" class="card-img" onerror="this.src='https://via.placeholder.com/300?text=Imagem'">
        </div>
        <div class="card-content">
          <div>
            <div class="card-title">${item.nome}</div>
            <div class="price-tag">${item.vMin}</div>
          </div>
          <div>
            ${ehAdmin ? `
              <div class="card-actions-admin">
                <button class="btn-edit-item" onclick="abrirTelaEdicao(${item.index})"><i class="fas fa-edit"></i> Editar</button>
                <button class="btn-delete-item" onclick="excluirItem(${item.index})"><i class="fas fa-trash"></i> Excluir</button>
              </div>
            ` : ''}
            <a href="${item.link}" target="_blank" class="btn-shopee" ${isE ? 'style="pointer-events: none; opacity: 0.5;"' : ''}>
              <i class="fas fa-shopping-bag"></i> Ver na Shopee
            </a>
            <button class="btn-presente" ${isE ? 'disabled' : ''} onclick="abrirConfirmacao(${item.index}, '${item.nome.replace(/'/g, "\\'")}')">
              ${isE ? 'Indisponível' : 'Escolher'}
            </button>
          </div>
        </div>
      </div>`;
  });
}

function abrirConfirmacao(idx, nome) {
  itemSelecionado = { idx, nome };
  document.getElementById('confirmText').innerHTML = `Você deseja confirmar que dará o presente:<br><b>${nome}</b>?`;
  document.getElementById('customConfirm').classList.remove('hidden');
}

function fecharModal() { document.getElementById('customConfirm').classList.add('hidden'); }

function confirmarAcao() {
  if(!itemSelecionado) return;
  
  fetch(URL_API, {
    method: 'POST',
    mode: 'no-cors',
    body: JSON.stringify({ action: 'escolher', linha: itemSelecionado.idx, nome: usuarioAtivo })
  }).then(() => {
    fecharModal();
    document.getElementById('successMsg').innerText = "Sua escolha foi registrada com sucesso.";
    document.getElementById('customSuccess').classList.remove('hidden');
    carregarDadosServidor(aplicarFiltros);
  });
}

function fecharSucesso() { document.getElementById('customSuccess').classList.add('hidden'); }
