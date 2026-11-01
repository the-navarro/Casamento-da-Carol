// URL da API do Google Apps Script
const URL_API = "https://script.google.com/macros/s/AKfycbyaORFvDT1v-l9hfld8qWR6FuRBJzHasJvUKMSl0b4Dish-gbkvyjuVXtMVPXNDxtlB/exec";

let usuarioAtivo = "";
let listaGlobal = [];
let categoriaAtiva = "Todos";
let itemSelecionado = null;

// Dispara o carregamento dos dados em segundo plano assim que a página abre
window.addEventListener('DOMContentLoaded', () => {
  preCarregarDados();
});

function preCarregarDados() {
  fetch(`${URL_API}?action=getPresentes`)
    .then(res => res.json())
    .then(itens => {
      listaGlobal = itens;
    })
    .catch(err => console.error("Erro no pré-carregamento:", err));
}

function entrar() {
  // Pega o valor digitado ou define "Convidado" como padrão se estiver vazio
  const inputEl = document.getElementById('nomeUser');
  const nomeDigitado = inputEl ? inputEl.value.trim() : "";
  
  usuarioAtivo = nomeDigitado !== "" ? nomeDigitado : "Convidado";

  // Transiciona as telas imediatamente
  const loginEl = document.getElementById('login');
  const loadingEl = document.getElementById('loadingScreen');
  
  if (loginEl) loginEl.classList.add('hidden');
  if (loadingEl) loadingEl.classList.remove('hidden');

  // Garante os 2 segundos de carregamento visual
  setTimeout(() => {
    if (loadingEl) loadingEl.classList.add('hidden');
    
    document.getElementById('lista')?.classList.remove('hidden');
    document.getElementById('priceBar')?.classList.remove('hidden');
    document.getElementById('mainFooter')?.classList.remove('hidden');
    document.getElementById('btnRecadoHeader')?.classList.remove('hidden');

    aplicarFiltros();
  }, 2000);
}

// Caso queira forçar uma atualização manual se precisar
function carregar() {
  preCarregarDados();
}

// Abre e fecha o modal de recados
function abrirModalRecado() { document.getElementById('modalRecado').classList.remove('hidden'); }
function fecharModalRecado() { 
  document.getElementById('modalRecado').classList.add('hidden'); 
  document.getElementById('txtRecado').value = ""; 
}

// Envia o recado para a planilha via POST
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

// Lógica de filtros de categoria
function filtrar(categoria, elemento) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  elemento.classList.add('active');
  categoriaAtiva = categoria;
  aplicarFiltros();
}

// Aplica filtros de preço e ordem
function aplicarFiltros() {
  let filtrados = [...listaGlobal];
  
  if(categoriaAtiva !== "Todos") {
    filtrados = filtrados.filter(i => i.categoria === categoriaAtiva);
  }
  
  const range = document.getElementById('rangePrice').value;
  if(range !== "all") {
    filtrados = filtrados.filter(i => {
      const v = parseFloat(i.vMin.replace(/[R$\s.]/g, '').replace(',', '.'));
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
    const sA = a.status === 'Escolhido' ? 1 : 0;
    const sB = b.status === 'Escolhido' ? 1 : 0;
    if (sA !== sB) return sA - sB;
    
    const pA = parseFloat(a.vMin.replace(/[R$\s.]/g, '').replace(',', '.'));
    const pB = parseFloat(b.vMin.replace(/[R$\s.]/g, '').replace(',', '.'));
    if(order === "asc") return pA - pB;
    if(order === "desc") return pB - pA;
    return 0;
  });
  
  renderizarCards(filtrados);
}

// Gera o HTML dos cards de presentes
function renderizarCards(itens) {
  const grid = document.getElementById('grid');
  grid.innerHTML = itens.length ? "" : "<p style='grid-column:span 2; text-align:center; padding-top: 50px;'>Nenhum item encontrado.</p>";
  
  itens.forEach(item => {
    const isE = item.status === 'Escolhido';
    grid.innerHTML += `
      <div class="card ${isE ? 'esgotado' : ''}">
        ${isE ? '<div class="esgotado-badge">Escolhido</div>' : ''}
        <div class="card-img-wrapper">
          <img src="${item.imagem}" class="card-img" onerror="this.src='https://via.placeholder.com/300?text=Imagem'">
        </div>
        <div class="card-content">
          <div>
            <div class="card-title">${item.nome}</div>
            <div class="price-tag">${item.vMin}</div>
          </div>
          <div>
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

// Funções de confirmação de escolha
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
    preCarregarDados(); // Atualiza os dados em background
  });
}

function fecharSucesso() { document.getElementById('customSuccess').classList.add('hidden'); }
