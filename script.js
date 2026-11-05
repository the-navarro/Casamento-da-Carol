const URL_API = "https://script.google.com/macros/s/AKfycbyKwAWJUc0UKS_-7LOkkna9GJXy0V75hy1tnkrjx43pNMkbZ17u2RlFqbE7_6RU_1zz/exec";
    const SENHA_ADM = "123456";
    const PLACEHOLDER = "data:image/svg+xml;utf8," + encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><rect width='300' height='300' fill='#ECE8E1'/>" +
      "<g fill='none' stroke='#B9B1A4' stroke-width='6' stroke-linecap='round' stroke-linejoin='round'>" +
      "<rect x='95' y='125' width='110' height='85' rx='6'/><path d='M150 125v85M95 160h110M150 125c-25-30-55-15-35 0M150 125c25-30 55-15 35 0'/></g></svg>");

    let usuarioAtivo = "";
    let tipoPermissao = "convidado";
    let listaGlobal = [];
    let categoriaAtiva = "Todos";
    let acaoPendente = null;
    let enviando = false;

    /* ---------- utilidades ---------- */
    const $ = id => document.getElementById(id);
    function esc(s) {
      return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    }
    function paraNumero(v) {
      if (typeof v === "number") return v;
      let s = String(v == null ? "" : v).replace(/[^\d,.\-]/g, "");
      if (!s) return 0;
      if (s.indexOf(",") > -1) s = s.replace(/\./g, "").replace(",", ".");
      return parseFloat(s) || 0;
    }
    function ehAdmin() { return tipoPermissao !== "convidado"; }
    function estaEscolhido(i) { return i.status === "Escolhido" || i.check === true; }
    function toast(msg, tipo = "ok") {
      const el = document.createElement("div");
      el.className = "toast " + tipo;
      el.innerHTML = `<i class="fas ${tipo === "ok" ? "fa-check-circle" : "fa-exclamation-circle"}"></i><span>${esc(msg)}</span>`;
      $("toasts").appendChild(el);
      setTimeout(() => { el.style.transition = "opacity .4s"; el.style.opacity = "0"; setTimeout(() => el.remove(), 400); }, 3200);
    }
    function mostrar(id) { $(id).classList.remove("hidden"); }
    function esconder(id) { $(id).classList.add("hidden"); }

    async function api(corpo) {
      // Envia os dados de forma inteligente via GET utilizando o parâmetro payload
      const urlComParametro = `${URL_API}?payload=` + encodeURIComponent(JSON.stringify(corpo));
      const res = await fetch(urlComParametro, { method: "GET" });
      return res.json();
    }
    /* ---------- dados ---------- */
    function carregarDadosServidor(callback) {
      return fetch(`${URL_API}?action=getPresentes`)
        .then(r => r.json())
        .then(itens => { listaGlobal = Array.isArray(itens) ? itens : []; })
        .catch(err => { console.error("Erro ao carregar dados:", err); listaGlobal = []; toast("Não foi possível carregar os presentes.", "err"); })
        .then(() => { if (callback) callback(); });
    }
    /* ---------- fechar modais (X, fundo, Esc) ---------- */
    const FECHADORES = {
      telaEdicaoCompleta: () => esconder("telaEdicaoCompleta"),
      modalRecado: () => esconder("modalRecado"),
      modalVerRecados: () => esconder("modalVerRecados"),
      customConfirm: () => fecharModal(),
      customSuccess: () => esconder("customSuccess"),
      modalZoomFoto: () => esconder("modalZoomFoto")
    };
    function fecharOverlay(el) {
      const o = el.closest(".overlay");
      if (o && FECHADORES[o.id]) FECHADORES[o.id]();
    }

    /* ---------- login ---------- */
    window.addEventListener("DOMContentLoaded", () => {
      carregarDadosServidor();
      const salvo = (() => { try { return localStorage.getItem("cm_nome"); } catch (e) { return ""; } })();
      if (salvo) $("nomeUser").value = salvo;
      $("nomeUser").addEventListener("keydown", e => { if (e.key === "Enter") tentarEntrar(); });
      $("senhaAcesso").addEventListener("keydown", e => { if (e.key === "Enter") tentarEntrar(); });
      document.querySelectorAll(".nav-item[data-cat]").forEach(b => b.addEventListener("click", () => filtrar(b.dataset.cat)));
      $("grid").addEventListener("click", aoClicarNoGrid);

      const atualizarMini = () => {
        const limite = Math.max(60, $("topbar").offsetHeight - 70);
        $("miniBar").classList.toggle("show", window.scrollY > limite);
      };
      window.addEventListener("scroll", atualizarMini, { passive: true });

      document.querySelectorAll(".overlay").forEach(o => {
        let comecouNoFundo = false;
        o.addEventListener("pointerdown", e => { comecouNoFundo = (e.target === o); });
        o.addEventListener("click", e => { if (e.target === o && comecouNoFundo && FECHADORES[o.id]) FECHADORES[o.id](); });
      });
      document.addEventListener("keydown", e => {
        if (e.key !== "Escape") return;
        const abertos = [...document.querySelectorAll(".overlay:not(.hidden)")];
        const o = abertos[abertos.length - 1];
        if (o && FECHADORES[o.id]) FECHADORES[o.id]();
      });
    });

    let modoAdmin = false;
    function alternarAreaAdmin() {
      modoAdmin = !modoAdmin;
      $("grupoSenha").classList.toggle("hidden", !modoAdmin);
      if (!modoAdmin) $("senhaAcesso").value = "";
      $("btnToggleAdmin").textContent = modoAdmin ? "Voltar ao acesso de convidado" : "Sou os noivos / administração";
      $("btnEntrar").textContent = modoAdmin ? "Entrar como administração" : "Ver presentes";
      if (modoAdmin) $("senhaAcesso").focus();
    }

    function tentarEntrar() {
      const nome = $("nomeUser").value.trim();
      tipoPermissao = modoAdmin ? "adm" : "convidado";
      if (modoAdmin && $("senhaAcesso").value !== SENHA_ADM) {
        toast("Senha incorreta.", "err");
        return;
      }
      if (!nome) { toast("Conta pra gente o seu nome 💛", "err"); $("nomeUser").focus(); return; }
      usuarioAtivo = nome;
      try { localStorage.setItem("cm_nome", nome); } catch (e) {}

      esconder("login"); mostrar("loadingScreen");
      carregarDadosServidor(() => {
        setTimeout(() => {
          esconder("loadingScreen");
          ["topbar", "miniBar", "lista", "mainFooter"].forEach(mostrar);
          $("saudacao").textContent = "Olá, " + usuarioAtivo.split(" ")[0];
          if (ehAdmin()) {
            mostrar("btnAdicionarHeader"); $("filtroStatusProduto").classList.remove("hidden");
            $("iconeBotaoRecado").className = "fas fa-envelope-open-text"; $("textoBotaoRecado").textContent = "Recados";
          }
          aplicarFiltros();
        }, 900);
      });
    }

    /* ---------- filtros ---------- */
    function filtrar(cat) {
      categoriaAtiva = cat;
      document.querySelectorAll(".nav-item").forEach(el => el.classList.toggle("active", el.dataset.cat === cat));
      aplicarFiltros();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function aplicarFiltros() {
      let f = [...listaGlobal];

      if (!ehAdmin()) {
        f = f.filter(i => {
          const st = (i.statusProduto || "").trim().toLowerCase();
          return !["inválido", "invalido", "retirado", "esgotado"].includes(st);
        });
      } else {
        const sp = $("filtroStatusProduto").value;
        if (sp !== "all") f = f.filter(i => (i.statusProduto || "Ativo") === sp);
      }

      if (categoriaAtiva !== "Todos") f = f.filter(i => i.categoria === categoriaAtiva);

      const q = $("busca").value.trim().toLowerCase();
      if (q) f = f.filter(i => (i.nome || "").toLowerCase().includes(q) || (i.itemCodigo || "").toLowerCase().includes(q));

      const disp = $("filtroDisp").value;
      if (disp === "livres") f = f.filter(i => !estaEscolhido(i));
      if (disp === "escolhidos") f = f.filter(estaEscolhido);

      const range = $("rangePrice").value;
      if (range !== "all") {
        const [min, max] = range.split("-").map(Number);
        f = f.filter(i => { const v = paraNumero(i.vMinRaw); return v >= min && v <= max; });
      }

      const ordem = $("sortOrder").value;
      f.sort((a, b) => {
        const sA = estaEscolhido(a) ? 1 : 0, sB = estaEscolhido(b) ? 1 : 0;
        if (sA !== sB) return sA - sB;
        const pA = paraNumero(a.vMinRaw), pB = paraNumero(b.vMinRaw);
        if (ordem === "asc") return pA - pB;
        if (ordem === "desc") return pB - pA;
        return 0;
      });

      $("contador").textContent = f.length === 1 ? "1 presente" : f.length + " presentes";
      renderizarCards(f);
    }

    function urlImagemPublica(item) {
      const orig = String(item.imagemOriginal || "");
      if (/drive\.google\.com|googleusercontent\.com/.test(orig)) {
        const m = orig.match(/[-\w]{25,}/);
        if (m) return "https://lh3.googleusercontent.com/d/" + m[0] + "=s1200";
      }
      return item.imagem || "";
    }

    /* ---------- cards ---------- */
    function renderizarCards(itens) {
      const grid = $("grid");
      if (!itens.length) {
        grid.innerHTML = `<div class="empty"><i class="fas fa-gift"></i>Nenhum presente encontrado.</div>`;
        return;
      }
      const admin = ehAdmin();
      const meuNome = usuarioAtivo.trim().toLowerCase();

      grid.innerHTML = itens.map((item, n) => {
        const tomado = estaEscolhido(item);
        const meu = tomado && !admin && String(item.escolhidoPor || "").trim().toLowerCase() === meuNome;
        const foraDeLinha = ["Inválido", "Retirado", "Esgotado"].includes(item.statusProduto);
        const faixa = item.tipoValor === "Faixa de Preço" && paraNumero(item.vMaxRaw) > 0;
        const img = item.imagem || PLACEHOLDER;
        const safeLink = /^https?:\/\//i.test(item.link || "") ? item.link : "";
        const urlPub = admin ? urlImagemPublica(item) : "";
        const ferramentas = urlPub ? `<div class="img-tools">
              <a href="${esc(urlPub)}" target="_blank" rel="noopener" title="Abrir imagem" aria-label="Abrir imagem"><i class="fas fa-download"></i></a>
            </div>` : "";

        return `
        <article class="card ${tomado ? "taken" : ""}" style="animation-delay:${Math.min(n, 10) * 40}ms">
          <div class="img-wrap" data-zoom="${esc(img)}">
            <img src="${esc(img)}" alt="${esc(item.nome)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${PLACEHOLDER}'">
            ${ferramentas}
            ${meu ? `<span class="badge mine"><i class="fas fa-heart"></i> Sua escolha</span>` : tomado ? `<span class="badge taken"><i class="fas fa-check"></i> Escolhido</span>` : ""}
            ${admin && foraDeLinha ? `<span class="badge admin">${esc(item.statusProduto)}</span>` : ""}
          </div>
          <div class="card-body">
            <h3 class="card-title">${esc(item.nome)}</h3>
            <div class="price">${faixa ? `<small>a partir de</small>` : ""}${esc(item.vMin)}${faixa ? `<small>até ${esc(item.vMax)}</small>` : ""}</div>
            ${admin && tomado ? `<div class="admin-info"><i class="fas fa-user"></i> <b>${esc(item.escolhidoPor || "—")}</b></div>` : ""}
            <div class="card-actions">
              ${admin ? `<div class="btn-row">
                  <button class="btn btn-soft" data-act="editar" data-idx="${item.index}"><i class="fas fa-pen"></i> Editar</button>
                  <button class="btn btn-danger" data-act="excluir" data-idx="${item.index}"><i class="fas fa-trash"></i></button>
                </div>` : ""}
              ${safeLink ? `<a href="${esc(safeLink)}" target="_blank" rel="noopener" class="btn btn-ghost ${tomado ? "disabled-link" : ""}"><i class="fas fa-shopping-bag"></i> Ver produto</a>` : ""}
              ${meu
                ? `<button class="btn btn-light" style="background:#FBE9E8;color:var(--danger);border:0" data-act="desfazer" data-idx="${item.index}" data-nome="${esc(item.nome)}"><i class="fas fa-undo"></i> Desfazer</button>`
                : `<button class="btn btn-solid" ${tomado ? "disabled" : ""} data-act="escolher" data-idx="${item.index}" data-nome="${esc(item.nome)}">${tomado ? "Indisponível" : `<i class="fas fa-gift"></i> Vou presentear`}</button>`}
            </div>
          </div>
        </article>`;
      }).join("");
    }

    function aoClicarNoGrid(e) {
      if (e.target.closest(".img-tools")) return;
      const zoom = e.target.closest("[data-zoom]");
      const btn = e.target.closest("[data-act]");
      if (btn) {
        const idx = parseInt(btn.dataset.idx);
        if (btn.dataset.act === "editar") return abrirTelaEdicao(idx);
        if (btn.dataset.act === "excluir") return excluirItem(idx);
        if (btn.dataset.act === "escolher") return abrirConfirmacao("escolher", idx, btn.dataset.nome);
        if (btn.dataset.act === "desfazer") return abrirConfirmacao("desfazer", idx, btn.dataset.nome);
      } else if (zoom) {
        $("imgZoomAmpliada").src = zoom.dataset.zoom; mostrar("modalZoomFoto");
      }
    }

    function abrirConfirmacao(tipo, idx, nome) {
      acaoPendente = { tipo, idx, nome };
      const cfg = {
        escolher: ["Confirmar escolha?", `Você deseja confirmar que dará o presente:<br><b>${esc(nome)}</b>?`, "Sim, vou presentear"],
        desfazer: ["Desfazer escolha?", `O presente <b>${esc(nome)}</b> voltará a ficar disponível para outros convidados.`, "Sim, desfazer"],
        excluir: ["Excluir item?", `Tem certeza que deseja excluir <b>${esc(nome)}</b>? Essa ação não pode ser desfeita.`, "Sim, excluir"]
      }[tipo];
      $("confirmTitulo").textContent = cfg[0]; $("confirmText").innerHTML = cfg[1]; $("btnConfirmar").textContent = cfg[2];
      mostrar("customConfirm");
    }
    function fecharModal() { esconder("customConfirm"); acaoPendente = null; }

    async function confirmarAcao() {
      if (!acaoPendente || enviando) return;
      const { tipo, idx } = acaoPendente;
      enviando = true; $("btnConfirmar").textContent = "Aguarde…";
      try {
        let r;
        if (tipo === "escolher") r = await api({ action: "escolher", linha: idx, nome: usuarioAtivo });
        if (tipo === "desfazer") r = await api({ action: "desfazer", linha: idx, nome: usuarioAtivo });
        if (tipo === "excluir") r = await api({ action: "excluir", linha: idx });
        fecharModal();
        if (r && r.status === "success") {
          if (tipo === "escolher") { $("successMsg").textContent = "Sua escolha foi registrada com sucesso. Os noivos agradecem! 💛"; mostrar("customSuccess"); }
          else toast(tipo === "desfazer" ? "Escolha desfeita." : "Item excluído.");
        } else toast((r && r.message) || "Não foi possível concluir.", "err");
      } catch (err) { fecharModal(); toast("Erro de conexão. Tente novamente.", "err"); }
      enviando = false;
      carregarDadosServidor(aplicarFiltros);
    }
    function excluirItem(idx) {
      const item = listaGlobal.find(i => i.index === idx);
      abrirConfirmacao("excluir", idx, item ? item.nome : "este item");
    }
    function fecharSucesso() { esconder("customSuccess"); }

    function ampliarFoto() { $("imgZoomAmpliada").src = $("previewImg").src; mostrar("modalZoomFoto"); }
    function fecharZoomFoto() { esconder("modalZoomFoto"); }

    function alternarCampoEdicao(cb) { $(cb.value).classList.toggle("hidden", !cb.checked); }
    function toggleValorMaximo() {
      const faixa = $("formTipoValor").value === "Faixa de Preço";
      $("grupoValorMax").classList.toggle("hidden", !faixa);
      if (!faixa) { $("formVMax").value = ""; esconder("avisoValorMax"); }
    }
    function validarValoresPreco() {
      const vMin = paraNumero($("formVMin").value), vMax = paraNumero($("formVMax").value);
      $("avisoValorMax").classList.toggle("hidden", !(vMax > 0 && vMax < vMin));
    }

    function abrirTelaEdicao(idx = null) {
      const novo = idx === null;
      $("uploadStatus").textContent = ""; $("uploadStatus").className = "upload-status";
      $("seletorEdicaoContainer").classList.toggle("hidden", novo);

      if (novo) {
        $("editorTitulo").textContent = "Novo item"; $("editorSub").textContent = "Preencha os dados do presente.";
        ["formIndex", "formItem", "formNome", "formLink", "formImagemUrl", "formVMin", "formVMax", "formEscolhidoPor"].forEach(id => $(id).value = "");
        $("formCategoria").value = categoriaAtiva !== "Todos" ? categoriaAtiva : "Cozinha";
        $("previewImg").src = PLACEHOLDER;
        $("formTipoValor").value = "Único"; $("formStatus").value = ""; $("formStatusProduto").value = "Ativo";
        document.querySelectorAll(".campo-editavel").forEach(el => el.classList.remove("hidden"));
      } else {
        const item = listaGlobal.find(i => i.index === idx);
        if (!item) return;
        $("editorTitulo").textContent = "Editar item"; $("editorSub").textContent = "Marque acima o que deseja alterar.";
        $("formIndex").value = item.index;
        $("formItem").value = item.itemCodigo || ""; $("formNome").value = item.nome || ""; $("formLink").value = item.link || "";
        $("formCategoria").value = item.categoria || "Cozinha";
        $("previewImg").src = item.imagem || PLACEHOLDER;
        $("formImagemUrl").value = item.imagemOriginal || "";
        $("formVMin").value = item.vMinRaw !== "" && item.vMinRaw != null ? String(item.vMinRaw).replace(".", ",") : "";
        $("formTipoValor").value = item.tipoValor || "Único";
        $("formVMax").value = item.vMaxRaw !== "" && item.vMaxRaw != null ? String(item.vMaxRaw).replace(".", ",") : "";
        $("formStatus").value = item.status || ""; $("formEscolhidoPor").value = item.escolhidoPor || "";
        $("formStatusProduto").value = item.statusProduto || "Ativo";
        document.querySelectorAll(".selector-box input, #seletorEdicaoContainer input").forEach(ch => { ch.checked = false; alternarCampoEdicao(ch); });
      }
      toggleValorMaximo();
      mostrar("telaEdicaoCompleta");
    }
    function fecharTelaEdicao() { esconder("telaEdicaoCompleta"); }

    async function salvarItemCompleto() {
      if (enviando) return;
      if (!$("formNome").value.trim()) { toast("Informe o nome resumido do item.", "err"); return; }
      const index = $("formIndex").value;
      const dados = {
        itemCodigo: $("formItem").value, nome: $("formNome").value, link: $("formLink").value,
        categoria: $("formCategoria").value, imagem: $("formImagemUrl").value,
        vMin: $("formVMin").value, tipoValor: $("formTipoValor").value, vMax: $("formVMax").value,
        status: $("formStatus").value, escolhidoPor: $("formEscolhidoPor").value, statusProduto: $("formStatusProduto").value
      };
      enviando = true; $("btnSalvarItem").textContent = "Salvando…";
      try {
        const r = await api({ action: index ? "atualizar" : "adicionar", linha: index, dados });
        if (r.status === "success") { fecharTelaEdicao(); toast("Item salvo com sucesso!"); }
        else toast(r.message || "Erro ao salvar.", "err");
      } catch (e) { toast("Erro de conexão ao salvar.", "err"); }
      enviando = false; $("btnSalvarItem").textContent = "Salvar alterações";
      carregarDadosServidor(aplicarFiltros);
    }

    function comprimirImagem(file, maxLado = 1000, qualidade = 0.82) {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
          let { width: w, height: h } = img;
          const escala = Math.min(1, maxLado / Math.max(w, h));
          w = Math.round(w * escala); h = Math.round(h * escala);
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL("image/jpeg", qualidade));
        };
        img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível ler a imagem.")); };
        img.src = url;
      });
    }

    async function processarUploadArquivo(input) {
      if (!input.files || !input.files[0]) return;
      const file = input.files[0];
      const status = $("uploadStatus");
      const anterior = $("previewImg").src;
      status.className = "upload-status"; status.textContent = "Otimizando e enviando imagem…";
      $("btnUpload").disabled = true;
      try {
        const base64 = await comprimirImagem(file);
        $("previewImg").src = base64;
        const nome = file.name.replace(/\.[^.]+$/, "") + ".jpg";
        const r = await api({ action: "uploadImagem", arquivoBase64: base64, nomeArquivo: nome });
        if (r.status === "success" && r.url) {
          $("formImagemUrl").value = r.url;
          status.className = "upload-status ok"; status.textContent = "Imagem enviada! Toque em “Salvar alterações”.";
        } else throw new Error(r.message || "Erro desconhecido");
      } catch (err) {
        console.error(err);
        $("previewImg").src = anterior;
        status.className = "upload-status err"; status.textContent = "Falha no envio: " + (err.message || "tente novamente.");
      }
      $("btnUpload").disabled = false;
      input.value = "";
    }

    function clicarBotaoRecados() { ehAdmin() ? abrirModalVerRecados() : mostrar("modalRecado"); }
    function fecharModalRecado() { esconder("modalRecado"); $("txtRecado").value = ""; }

    async function enviarRecado() {
      const texto = $("txtRecado").value.trim();
      if (!texto || enviando) return;
      enviando = true; $("btnEnviarRecado").textContent = "Enviando…";
      try {
        const r = await api({ action: "recado", texto, nome: usuarioAtivo });
        if (r.status === "success") {
          fecharModalRecado();
          $("successMsg").textContent = "Seu recado foi enviado com sucesso! 💌"; mostrar("customSuccess");
        } else toast(r.message || "Erro ao enviar.", "err");
      } catch (e) { toast("Erro de conexão ao enviar.", "err"); }
      enviando = false; $("btnEnviarRecado").textContent = "Enviar recado";
    }

    function abrirModalVerRecados() {
      const box = $("listaRecadosAdmin");
      box.innerHTML = `<p class="sub">Carregando recados…</p>`; $("recadosSub").textContent = "";
      mostrar("modalVerRecados");
      fetch(`${URL_API}?action=getRecados`).then(r => r.json()).then(rec => {
        if (Array.isArray(rec) && rec.length) {
          $("recadosSub").textContent = rec.length + (rec.length === 1 ? " mensagem" : " mensagens");
          box.innerHTML = rec.map(r => `
            <div class="recado">
              <div class="recado-head"><span><i class="fas fa-user"></i> ${esc(r.nome)}</span><span>${esc(r.data)}</span></div>
              <div class="recado-body">${esc(r.recado)}</div>
            </div>`).join("");
        } else box.innerHTML = `<p class="sub">Nenhum recado ainda.</p>`;
      }).catch(() => { box.innerHTML = `<p class="sub" style="color:#FCA5A5">Erro ao carregar recados.</p>`; });
    }
    function fecharModalVerRecados() { esconder("modalVerRecados"); }
