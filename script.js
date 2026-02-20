// ========================================
// SISTEMA DE AUTENTICAÇÃO
// ========================================
class SistemaAuth {
  constructor() {
    this.usuarios = JSON.parse(localStorage.getItem('lb_usuarios') || '[]');
    const salvo = localStorage.getItem('lb_usuario_atual') || sessionStorage.getItem('lb_usuario_atual');
    this.usuarioAtual = salvo ? JSON.parse(salvo) : null;
  }

  // FIX #16: btoa não suporta acentos — usar encodeURIComponent
  _hash(str) { return btoa(encodeURIComponent(str)); }

  registrar(nome, email, senha, telefone) {
    if (this.usuarios.find(u => u.email.toLowerCase() === email.trim().toLowerCase()))
      throw new Error('Este e-mail já está cadastrado.');
    const usuario = {
      id: Date.now(), nome: nome.trim(),
      email: email.trim().toLowerCase(),
      senha: this._hash(senha), telefone,
      criadoEm: new Date().toLocaleDateString('pt-BR')
    };
    this.usuarios.push(usuario);
    localStorage.setItem('lb_usuarios', JSON.stringify(this.usuarios));
    // FIX #11: não chamar this.login() aqui para evitar erro em cascata
    this.usuarioAtual = usuario;
    localStorage.setItem('lb_usuario_atual', JSON.stringify(usuario));
    return usuario;
  }

  login(email, senha, lembrar = false) {
    const usuario = this.usuarios.find(
      u => u.email.toLowerCase() === email.trim().toLowerCase() && u.senha === this._hash(senha)
    );
    if (!usuario) throw new Error('E-mail ou senha incorretos.');
    this.usuarioAtual = usuario;
    if (lembrar) {
      localStorage.setItem('lb_usuario_atual', JSON.stringify(usuario));
    } else {
      sessionStorage.setItem('lb_usuario_atual', JSON.stringify(usuario));
      localStorage.removeItem('lb_usuario_atual');
    }
    return usuario;
  }

  logout() {
    this.usuarioAtual = null;
    localStorage.removeItem('lb_usuario_atual');
    sessionStorage.removeItem('lb_usuario_atual');
  }

  estaLogado() { return !!this.usuarioAtual; }
  getUsuario() { return this.usuarioAtual; }
}

// ========================================
// CARRINHO DE COMPRAS
// ========================================
class CarrinhoCompras {
  constructor() {
    this.itens = JSON.parse(localStorage.getItem('lb_carrinho_itens') || '[]');
    this.etapaAtual = 1;
    this.dadosCheckout = JSON.parse(localStorage.getItem('lb_carrinho_checkout') || '{"endereco":{},"pagamento":{}}');
    this.cupomAplicado = JSON.parse(localStorage.getItem('lb_carrinho_cupom') || 'null');
    this.taxaEntrega = 5.00;
    this._pixTimer = null; // FIX #15
    this.cuponsValidos = {
      'BEMVINDO10': { desconto: 10, tipo: 'percentual', descricao: '10% de desconto' },
      'FRETEGRATIS': { desconto: 5, tipo: 'frete', descricao: 'Frete grátis' },
      'COMBO5': { desconto: 5, tipo: 'fixo', descricao: 'R$ 5,00 de desconto' }
    };
  }

  _salvarCarrinho() {
    localStorage.setItem('lb_carrinho_itens', JSON.stringify(this.itens));
    localStorage.setItem('lb_carrinho_checkout', JSON.stringify(this.dadosCheckout));
    localStorage.setItem('lb_carrinho_cupom', JSON.stringify(this.cupomAplicado));
  }

  adicionarItem(nome, preco, imagem = '') {
    const existente = this.itens.find(i => i.nome === nome);
    if (existente) { existente.quantidade++; }
    else { this.itens.push({ id: Date.now(), nome, preco: parseFloat(preco), quantidade: 1, imagem }); }
    this._salvarCarrinho();
    this.atualizarContador();
    this.mostrarNotificacao('<i class="fas fa-check-circle"></i> ' + nome + ' adicionado!', 'success');
  }

  removerItem(id) {
    const idx = this.itens.findIndex(i => i.id === id);
    if (idx === -1) return;
    const nome = this.itens[idx].nome;
    this.itens.splice(idx, 1);
    this._salvarCarrinho();
    this.atualizarContador();
    this._atualizarCorpo(); // FIX #8
    this.mostrarNotificacao(nome + ' removido', 'info');
  }

  alterarQuantidade(id, delta) {
    const item = this.itens.find(i => i.id === id);
    if (!item) return;
    item.quantidade += delta;
    if (item.quantidade <= 0) {
      this.itens.splice(this.itens.indexOf(item), 1);
      this.atualizarContador();
    }
    this._salvarCarrinho();
    this._atualizarCorpo(); // FIX #8: não recria modal inteiro
  }

  // FIX #8: atualiza apenas o body do modal sem perder scroll
  _atualizarCorpo() {
    const body = document.querySelector('#modal-checkout .lb-modal-body');
    const steps = document.querySelector('#modal-checkout .lb-steps');
    if (body) body.innerHTML = this.renderizarEtapa();
    if (steps) {
      const labels = ['Carrinho','Entrega','Pagamento','Confirmação'];
      steps.innerHTML = [1,2,3,4].map((n,i) =>
        '<div class="lb-step ' + (this.etapaAtual>=n?'active':'') + ' ' + (this.etapaAtual>n?'done':'') + '">' +
          '<div class="lb-step-circle">' + (this.etapaAtual>n?'<i class="fas fa-check"></i>':n) + '</div>' +
          '<span>' + labels[i] + '</span></div>' +
          (i<3 ? '<div class="lb-step-line ' + (this.etapaAtual>n?'done':'') + '"></div>' : '')
      ).join('');
    }
  }

  calcularSubtotal() { return this.itens.reduce((t,i) => t + i.preco*i.quantidade, 0); }

  calcularDesconto() {
    if (!this.cupomAplicado) return 0;
    const c = this.cupomAplicado;
    if (c.tipo === 'percentual') return this.calcularSubtotal() * (c.desconto/100);
    if (c.tipo === 'frete') return this.taxaEntrega;
    if (c.tipo === 'fixo') return c.desconto;
    return 0;
  }

  calcularFrete() {
    if (this.cupomAplicado?.tipo === 'frete') return 0;
    return this.calcularSubtotal() >= 50 ? 0 : this.taxaEntrega;
  }

  calcularTotal() {
    const sub = this.calcularSubtotal();
    const frete = this.calcularFrete();
    const desc = this.cupomAplicado?.tipo !== 'frete' ? this.calcularDesconto() : 0;
    return Math.max(0, sub - desc + frete);
  }

  aplicarCupom(codigo) {
    const cupom = this.cuponsValidos[codigo.toUpperCase()];
    if (!cupom) throw new Error('Cupom inválido ou expirado.');
    this.cupomAplicado = { ...cupom, codigo: codigo.toUpperCase() };
    this._salvarCarrinho();
    return cupom;
  }

  atualizarContador() {
    const total = this.itens.reduce((t,i) => t + i.quantidade, 0);
    const el = document.getElementById('contador-pedidos');
    if (!el) return;
    el.textContent = total;
    el.style.transform = 'scale(1.3)';
    setTimeout(() => el.style.transform = 'scale(1)', 200);
    // FIX #10: só esconde se NÃO estiver dentro do link de pedidos
    if (!el.closest('#link-pedidos')) {
      el.style.display = total > 0 ? 'inline-flex' : 'none';
    }
  }

  mostrarNotificacao(mensagem, tipo = 'info') {
    const cores = {
      success: 'linear-gradient(135deg,#1a8a3a,#28a745)',
      info:    'linear-gradient(135deg,#0a6c8a,#17a2b8)',
      warning: 'linear-gradient(135deg,#cc8800,#ffc107)',
      error:   'linear-gradient(135deg,#a61a2a,#dc3545)'
    };
    document.querySelectorAll('.lb-notif').forEach(n => n.remove());
    const notif = document.createElement('div');
    notif.className = 'lb-notif';
    notif.innerHTML = mensagem;
    notif.style.cssText = 'position:fixed;top:80px;right:20px;background:'+cores[tipo]+';color:white;padding:13px 20px;border-radius:12px;box-shadow:0 8px 25px rgba(0,0,0,0.25);z-index:99999;animation:lbSlideIn 0.4s cubic-bezier(0.34,1.56,0.64,1);display:flex;align-items:center;gap:10px;font-weight:500;max-width:300px;font-size:14px;pointer-events:none;';
    document.body.appendChild(notif);
    setTimeout(() => {
      notif.style.animation = 'lbSlideOut 0.35s ease forwards';
      setTimeout(() => notif.remove(), 350);
    }, 3000);
  }

  abrirCheckout() {
    if (!this.itens.length) { this.mostrarNotificacao('<i class="fas fa-exclamation-circle"></i> Seu carrinho está vazio!','warning'); return; }
    this.etapaAtual = 1;
    this.renderizarModal();
  }

  renderizarModal() {
    if (this._pixTimer) { clearTimeout(this._pixTimer); this._pixTimer = null; } // FIX #15

    let overlay = document.getElementById('modal-checkout');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'modal-checkout';
      overlay.className = 'lb-modal-overlay';
      overlay.addEventListener('click', e => { if (e.target===overlay) this.fecharModal(); });
      document.body.appendChild(overlay);
    }

    const labels = ['Carrinho','Entrega','Pagamento','Confirmação'];
    overlay.innerHTML =
      '<div class="lb-modal">' +
        '<div class="lb-modal-header">' +
          '<h4><i class="fas fa-shopping-bag"></i> Finalizar Pedido</h4>' +
          '<button class="lb-btn-close" onclick="carrinho.fecharModal()"><i class="fas fa-times"></i></button>' +
        '</div>' +
        '<div class="lb-steps">' +
          [1,2,3,4].map((n,i) =>
            '<div class="lb-step '+(this.etapaAtual>=n?'active':'')+' '+(this.etapaAtual>n?'done':'')+'">' +
              '<div class="lb-step-circle">'+(this.etapaAtual>n?'<i class="fas fa-check"></i>':n)+'</div>' +
              '<span>'+labels[i]+'</span></div>' +
              (i<3?'<div class="lb-step-line '+(this.etapaAtual>n?'done':'')+'"></div>':'')
          ).join('') +
        '</div>' +
        '<div class="lb-modal-body">'+this.renderizarEtapa()+'</div>' +
      '</div>';

    overlay.classList.remove('hidden');
    overlay.style.display = 'flex';
  }

  renderizarEtapa() {
    return [this.etapaCarrinho,this.etapaEndereco,this.etapaPagamento,this.etapaConfirmacao][this.etapaAtual-1].call(this);
  }

  etapaCarrinho() {
    const sub = this.calcularSubtotal();
    const frete = this.calcularFrete();
    const desc = this.cupomAplicado?.tipo!=='frete' ? this.calcularDesconto() : 0;
    const total = this.calcularTotal();
    const fmt = n => n.toFixed(2).replace('.',',');

    return '<div class="lb-section-title"><i class="fas fa-shopping-cart"></i> Meu Carrinho</div>' +
      '<div class="lb-items-list">' +
      this.itens.map(item =>
        '<div class="lb-cart-item">' +
          '<div class="lb-item-info">' +
            '<span class="lb-item-name">'+item.nome+'</span>' +
            '<span class="lb-item-unit">R$ '+fmt(item.preco)+' / un.</span>' +
          '</div>' +
          '<div class="lb-item-controls">' +
            '<button class="lb-qty-btn" onclick="carrinho.alterarQuantidade('+item.id+',-1)"><i class="fas fa-minus"></i></button>' +
            '<span class="lb-qty">'+item.quantidade+'</span>' +
            '<button class="lb-qty-btn" onclick="carrinho.alterarQuantidade('+item.id+',1)"><i class="fas fa-plus"></i></button>' +
          '</div>' +
          '<span class="lb-item-subtotal">R$ '+fmt(item.preco*item.quantidade)+'</span>' +
          '<button class="lb-btn-remove" onclick="carrinho.removerItem('+item.id+')" title="Remover"><i class="fas fa-trash"></i></button>' +
        '</div>'
      ).join('') + '</div>' +

      '<div class="lb-coupon-row">' +
        '<input type="text" id="input-cupom" class="lb-input" placeholder="Cupom (ex: BEMVINDO10)" value="'+(this.cupomAplicado?.codigo||'')+'" style="text-transform:uppercase">' +
        '<button class="lb-btn-cupom" onclick="carrinho.tentarCupom()">Aplicar</button>' +
      '</div>' +
      (this.cupomAplicado ? '<div class="lb-cupom-ok"><i class="fas fa-tag"></i> <strong>'+this.cupomAplicado.codigo+'</strong> — '+this.cupomAplicado.descricao+'!</div>' : '') +

      '<div class="lb-summary">' +
        '<div class="lb-summary-row"><span>Subtotal</span><span>R$ '+fmt(sub)+'</span></div>' +
        (desc>0 ? '<div class="lb-summary-row green"><span>Desconto ('+this.cupomAplicado.codigo+')</span><span>- R$ '+fmt(desc)+'</span></div>' : '') +
        '<div class="lb-summary-row '+(frete===0?'green':'')+'"><span>Entrega</span><span>' +
          (frete===0 ? (this.cupomAplicado?.tipo==='frete'?'🎉 Grátis (cupom)':'🎉 Grátis (acima R$50)') : 'R$ '+fmt(frete)) +
        '</span></div>' +
        '<div class="lb-summary-total"><span>Total</span><span>R$ '+fmt(total)+'</span></div>' +
      '</div>' +

      '<div class="lb-actions">' +
        '<button class="lb-btn-secondary" onclick="carrinho.fecharModal()"><i class="fas fa-arrow-left"></i> Continuar</button>' +
        '<button class="lb-btn-primary" onclick="carrinho.proximaEtapa()">Endereço <i class="fas fa-arrow-right"></i></button>' +
      '</div>';
  }

  tentarCupom() {
    const input = document.getElementById('input-cupom');
    const codigo = input?.value?.trim();
    if (!codigo) { this.mostrarNotificacao('Digite um cupom','warning'); return; }
    try {
      const c = this.aplicarCupom(codigo);
      this.mostrarNotificacao('<i class="fas fa-tag"></i> Cupom aplicado: '+c.descricao+'!','success');
      this._atualizarCorpo();
    } catch(e) {
      this.mostrarNotificacao('<i class="fas fa-times-circle"></i> '+e.message,'error');
      if (input) { input.classList.add('lb-input-error'); setTimeout(()=>input.classList.remove('lb-input-error'),1500); }
    }
  }

  etapaEndereco() {
    const e = this.dadosCheckout.endereco;
    return '<div class="lb-section-title"><i class="fas fa-map-marker-alt"></i> Endereço de Entrega</div>' +
      '<form id="form-endereco" class="lb-form" onsubmit="return false">' +
        '<div class="lb-form-row">' +
          '<div class="lb-form-group" style="flex:2"><label>CEP *</label><input type="text" id="cep" inputmode="numeric" maxlength="9" placeholder="00000-000" value="'+(e.cep||'')+'" required></div>' +
          '<div class="lb-form-group lb-cep-btn-group"><label>&nbsp;</label><button type="button" class="lb-btn-cep" id="btn-buscar-cep" onclick="carrinho.buscarCEP()"><i class="fas fa-search"></i> Buscar</button></div>' +
        '</div>' +
        '<div class="lb-form-group"><label>Rua *</label><input type="text" id="rua" placeholder="Nome da rua" value="'+(e.rua||'')+'" required></div>' +
        '<div class="lb-form-row">' +
          '<div class="lb-form-group" style="flex:1"><label>Número *</label><input type="text" id="numero" placeholder="123" value="'+(e.numero||'')+'" required></div>' +
          '<div class="lb-form-group" style="flex:2"><label>Complemento</label><input type="text" id="complemento" placeholder="Apto, bloco..." value="'+(e.complemento||'')+'"></div>' +
        '</div>' +
        '<div class="lb-form-group"><label>Bairro *</label><input type="text" id="bairro" placeholder="Bairro" value="'+(e.bairro||'')+'" required></div>' +
        '<div class="lb-form-row">' +
          '<div class="lb-form-group" style="flex:2"><label>Cidade *</label><input type="text" id="cidade" placeholder="Cidade" value="'+(e.cidade||'')+'" required></div>' +
          '<div class="lb-form-group" style="flex:1"><label>UF *</label><input type="text" id="uf" maxlength="2" placeholder="RS" value="'+(e.uf||'')+'" required style="text-transform:uppercase"></div>' +
        '</div>' +
        '<div class="lb-form-group"><label>Referência</label><input type="text" id="referencia" placeholder="Perto de..." value="'+(e.referencia||'')+'"></div>' +
      '</form>' +
      '<div class="lb-actions">' +
        '<button class="lb-btn-secondary" onclick="carrinho.voltarEtapa()"><i class="fas fa-arrow-left"></i> Voltar</button>' +
        '<button class="lb-btn-primary" onclick="carrinho.salvarEndereco()">Pagamento <i class="fas fa-arrow-right"></i></button>' +
      '</div>';
  }

  etapaPagamento() {
    const tipo = this.dadosCheckout.pagamento.tipo;
    return '<div class="lb-section-title"><i class="fas fa-credit-card"></i> Forma de Pagamento</div>' +
      '<div class="lb-payment-grid">' +
        // FIX #3: usa data-pay para detecção, não textContent
        '<button class="lb-pay-option '+(tipo==='pix'?'selected':'')+'" data-pay="pix" onclick="carrinho.selecionarPagamento(\'pix\')"><i class="fas fa-qrcode"></i><span>PIX</span><small>Instantâneo</small></button>' +
        '<button class="lb-pay-option '+(tipo==='cartao'?'selected':'')+'" data-pay="cartao" onclick="carrinho.selecionarPagamento(\'cartao\')"><i class="fas fa-credit-card"></i><span>Cartão</span><small>Crédito/Débito</small></button>' +
        '<button class="lb-pay-option '+(tipo==='dinheiro'?'selected':'')+'" data-pay="dinheiro" onclick="carrinho.selecionarPagamento(\'dinheiro\')"><i class="fas fa-money-bill-wave"></i><span>Dinheiro</span><small>Na entrega</small></button>' +
      '</div>' +
      '<div id="form-pagamento-container" class="lb-pay-form"></div>' +
      '<div class="lb-actions">' +
        '<button class="lb-btn-secondary" onclick="carrinho.voltarEtapa()"><i class="fas fa-arrow-left"></i> Voltar</button>' +
      '</div>';
  }

  formPix() {
    const fmt = n => n.toFixed(2).replace('.',',');
    const total = this.calcularTotal();

    // Gerar chave PIX copia e cola (EMV format simulado)
    const pixKey = '51994682268'; // telefone da loja
    const merchantName = 'LANCHES E BEBIDAS';
    const merchantCity = 'RIO GRANDE';
    const txid = 'LB' + Date.now().toString().slice(-10);
    const valor = total.toFixed(2);

    // Montar payload PIX (formato EMV simplificado)
    function emvField(id, value) {
      const len = value.length.toString().padStart(2,'0');
      return id + len + value;
    }
    const merchantAccountInfo = emvField('00','br.gov.bcb.pix') + emvField('01', pixKey);
    const payload =
      emvField('00','01') +
      emvField('26', merchantAccountInfo) +
      emvField('52','0000') +
      emvField('53','986') +
      emvField('54', valor) +
      emvField('58','BR') +
      emvField('59', merchantName.slice(0,25)) +
      emvField('60', merchantCity.slice(0,15)) +
      emvField('62', emvField('05', txid.slice(0,25)));

    // CRC16 CCITT
    function crc16(str) {
      let crc = 0xFFFF;
      for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
      }
      return (crc & 0xFFFF).toString(16).toUpperCase().padStart(4,'0');
    }
    const payloadFull = payload + '6304';
    const pixCopiaCola = payloadFull + crc16(payloadFull);

    return '<div class="lb-pix-container">' +
      '<div class="lb-pix-badge"><i class="fas fa-qrcode"></i> Pagamento via PIX</div>' +
      '<p class="lb-pix-subtitle">Escaneie o QR Code ou copie o código abaixo</p>' +
      '<div class="lb-qr-wrapper"><div id="qrcode"></div></div>' +
      '<p class="lb-pix-value">R$ ' + fmt(total) + '</p>' +

      '<div class="lb-pix-copia-section">' +
        '<div class="lb-pix-copia-label"><i class="fas fa-copy"></i> PIX Copia e Cola</div>' +
        '<div class="lb-pix-copia-box">' +
          '<textarea id="pix-copia-cola" class="lb-pix-textarea" readonly onclick="this.select()">' + pixCopiaCola + '</textarea>' +
          '<button class="lb-btn-copiar" onclick="carrinhoPixCopiar()">' +
            '<i class="fas fa-copy" id="icon-copiar"></i> <span id="txt-copiar">Copiar</span>' +
          '</button>' +
        '</div>' +
      '</div>' +

      '<div class="lb-pix-info-row">' +
        '<div class="lb-pix-info-item"><i class="fas fa-key"></i><span>Chave PIX: <strong>' + pixKey + '</strong></span></div>' +
        '<div class="lb-pix-info-item"><i class="fas fa-store"></i><span>' + merchantName + '</span></div>' +
      '</div>' +

      '<div class="lb-waiting"><div class="lb-spinner"></div><span>Aguardando confirmação do pagamento...</span></div>' +

      '<div class="lb-pix-steps">' +
        '<div class="lb-pix-step"><div class="lb-ps-num">1</div><span>Abra seu app bancário</span></div>' +
        '<div class="lb-pix-step"><div class="lb-ps-num">2</div><span>Escaneie o QR Code ou cole o código</span></div>' +
        '<div class="lb-pix-step"><div class="lb-ps-num">3</div><span>Confirme o pagamento</span></div>' +
      '</div>' +

      '<button class="lb-btn-primary" style="width:100%;margin-top:14px" onclick="carrinho.confirmarPix()">' +
        '<i class="fas fa-check-circle"></i> Já realizei o pagamento' +
      '</button>' +
    '</div>';
  }

  confirmarPix() {
    if (this._pixTimer) { clearTimeout(this._pixTimer); this._pixTimer=null; }
    this.dadosCheckout.pagamento = { tipo: 'pix' };
    this._salvarCarrinho();
    this.proximaEtapa();
  }

  formCartao() {
    return '<form id="form-cartao" class="lb-form" onsubmit="return false">' +
      '<div class="lb-card-type-row">' +
        '<label class="lb-radio"><input type="radio" name="tipo-cartao" value="credito" checked><span><i class="fas fa-credit-card"></i> Crédito</span></label>' +
        '<label class="lb-radio"><input type="radio" name="tipo-cartao" value="debito"><span><i class="fas fa-money-check"></i> Débito</span></label>' +
      '</div>' +
      '<div class="lb-form-group"><label>Número do Cartão *</label><input type="text" id="numero-cartao" inputmode="numeric" maxlength="19" placeholder="0000 0000 0000 0000" required autocomplete="cc-number"></div>' +
      '<div class="lb-form-group"><label>Nome no Cartão *</label><input type="text" id="nome-cartao" placeholder="NOME COMPLETO" style="text-transform:uppercase" required autocomplete="cc-name"></div>' +
      '<div class="lb-form-row">' +
        '<div class="lb-form-group" style="flex:1"><label>Validade *</label><input type="text" id="validade" inputmode="numeric" maxlength="5" placeholder="MM/AA" required autocomplete="cc-exp"></div>' +
        '<div class="lb-form-group" style="flex:1"><label>CVV *</label><input type="text" id="cvv" inputmode="numeric" maxlength="4" placeholder="123" required autocomplete="cc-csc"></div>' +
      '</div>' +
      '<button type="button" id="btn-confirmar-cartao" class="lb-btn-primary" style="width:100%;margin-top:10px" onclick="carrinho.processarCartao()">' +
        '<i class="fas fa-lock"></i> Confirmar Pagamento' +
      '</button>' +
    '</form>';
  }

  formDinheiro() {
    const total = this.calcularTotal();
    const fmt = n => n.toFixed(2).replace('.',',');
    const sugestoes = [...new Set([10,20,50,100].map(b=>Math.ceil(total/b)*b))].filter(v=>v>total).slice(0,3);
    return '<div class="lb-form" style="padding-top:4px">' +
      '<div class="lb-form-group"><label>Troco para quanto? <small style="font-weight:400;color:#999">(opcional)</small></label>' +
        '<input type="number" id="troco-para" inputmode="decimal" placeholder="Ex: 50.00" min="'+total.toFixed(2)+'" step="0.01">' +
      '</div>' +
      (sugestoes.length ? '<div class="lb-troco-sugestoes"><small style="font-size:11px;color:#999">Sugestões:</small>'+
        sugestoes.map(s=>'<button type="button" class="lb-troco-sugestao" onclick="document.getElementById(\'troco-para\').value=\''+s.toFixed(2)+'\'">R$ '+s+'</button>').join('')+
      '</div>' : '') +
      '<div class="lb-total-entrega"><i class="fas fa-info-circle"></i> Total a pagar na entrega: <strong>R$ '+fmt(total)+'</strong></div>' +
      '<button type="button" class="lb-btn-primary" style="width:100%;margin-top:14px" onclick="carrinho.confirmarDinheiro()">' +
        '<i class="fas fa-check"></i> Confirmar com Dinheiro' +
      '</button>' +
    '</div>';
  }

  // FIX #6: proteção contra dados faltantes no endereço
  etapaConfirmacao() {
    const e = this.dadosCheckout.endereco || {};
    const p = this.dadosCheckout.pagamento || {};
    const fmt = n => n.toFixed(2).replace('.',',');
    const pedidoNum = Math.floor(Math.random()*90000)+10000;
    const tiposPgto = {
      pix: '<i class="fas fa-qrcode"></i> PIX',
      cartao: '<i class="fas fa-credit-card"></i> Cartão de '+(p.tipoCartao||'crédito'),
      dinheiro: '<i class="fas fa-money-bill-wave"></i> Dinheiro na entrega'
    };
    const endStr = e.rua
      ? e.rua+', '+e.numero+(e.complemento?' — '+e.complemento:'')+'<br>'+e.bairro+' — '+e.cidade+'/'+e.uf+(e.cep?'<br>CEP: '+e.cep:'')+(e.referencia?'<br><em>'+e.referencia+'</em>':'')
      : '<em>Endereço não informado</em>';

    return '<div class="lb-success-anim">' +
        '<div class="lb-check-circle"><i class="fas fa-check"></i></div>' +
        '<h3>Pedido Confirmado!</h3>' +
        '<p>Pedido <strong>#'+pedidoNum+'</strong> realizado com sucesso 🎉</p>' +
      '</div>' +
      '<div class="lb-receipt">' +
        '<div class="lb-receipt-section">' +
          '<div class="lb-receipt-title"><i class="fas fa-receipt"></i> Itens</div>' +
          this.itens.map(i=>'<div class="lb-receipt-row"><span>'+i.nome+' × '+i.quantidade+'</span><span>R$ '+fmt(i.preco*i.quantidade)+'</span></div>').join('') +
          (this.calcularDesconto()>0&&this.cupomAplicado?.tipo!=='frete' ? '<div class="lb-receipt-row green"><span>Desconto ('+this.cupomAplicado.codigo+')</span><span>- R$ '+fmt(this.calcularDesconto())+'</span></div>' : '') +
          '<div class="lb-receipt-row"><span>Entrega</span><span>'+(this.calcularFrete()===0?'Grátis':'R$ '+fmt(this.calcularFrete()))+'</span></div>' +
          '<div class="lb-receipt-total"><span>Total</span><span>R$ '+fmt(this.calcularTotal())+'</span></div>' +
        '</div>' +
        '<div class="lb-receipt-section">' +
          '<div class="lb-receipt-title"><i class="fas fa-map-marker-alt"></i> Entrega em ~30 min</div>' +
          '<p>'+endStr+'</p>' +
        '</div>' +
        '<div class="lb-receipt-section">' +
          '<div class="lb-receipt-title"><i class="fas fa-credit-card"></i> Pagamento</div>' +
          '<p>'+(tiposPgto[p.tipo]||p.tipo||'Não informado')+(p.trocoP&&parseFloat(p.trocoP)>0?' — troco para R$ '+fmt(parseFloat(p.trocoP)):'')+'</p>' +
        '</div>' +
      '</div>' +
      '<div class="lb-actions"><button class="lb-btn-primary" style="width:100%" onclick="carrinho.finalizarCompra()"><i class="fas fa-home"></i> Voltar ao Início</button></div>';
  }

  proximaEtapa() { if (this.etapaAtual<4) { this.etapaAtual++; this.renderizarModal(); } }

  voltarEtapa() {
    if (this._pixTimer) { clearTimeout(this._pixTimer); this._pixTimer = null; } // FIX #15
    if (this.etapaAtual>1) { this.etapaAtual--; this.renderizarModal(); }
  }

  salvarEndereco() {
    const campos = ['cep','rua','numero','bairro','cidade','uf'];
    for (const id of campos) {
      const el = document.getElementById(id);
      if (!el?.value.trim()) {
        el?.focus(); el?.classList.add('lb-field-error');
        setTimeout(()=>el?.classList.remove('lb-field-error'),1500);
        this.mostrarNotificacao('<i class="fas fa-exclamation-circle"></i> Preencha o campo obrigatório','error');
        return;
      }
    }
    this.dadosCheckout.endereco = {
      cep: document.getElementById('cep').value.trim(),
      rua: document.getElementById('rua').value.trim(),
      numero: document.getElementById('numero').value.trim(),
      complemento: document.getElementById('complemento').value.trim(),
      bairro: document.getElementById('bairro').value.trim(),
      cidade: document.getElementById('cidade').value.trim(),
      uf: document.getElementById('uf').value.trim().toUpperCase(),
      referencia: document.getElementById('referencia').value.trim()
    };
    this._salvarCarrinho();
    this.proximaEtapa();
  }

  async buscarCEP() {
    const cepInput = document.getElementById('cep');
    const cep = cepInput?.value.replace(/\D/g,'');
    const btn = document.getElementById('btn-buscar-cep');
    if (!cep||cep.length!==8) { this.mostrarNotificacao('<i class="fas fa-times-circle"></i> CEP inválido (8 dígitos)','error'); cepInput?.focus(); return; }
    if (btn) { btn.innerHTML='<i class="fas fa-spinner fa-spin"></i>'; btn.disabled=true; }
    try {
      const r = await fetch('https://viacep.com.br/ws/'+cep+'/json/');
      if (!r.ok) throw new Error();
      const d = await r.json();
      if (d.erro) { this.mostrarNotificacao('<i class="fas fa-times-circle"></i> CEP não encontrado','error'); }
      else {
        document.getElementById('rua').value = d.logradouro||'';
        document.getElementById('bairro').value = d.bairro||'';
        document.getElementById('cidade').value = d.localidade||'';
        document.getElementById('uf').value = d.uf||'';
        document.getElementById('numero').focus();
        this.mostrarNotificacao('<i class="fas fa-map-marker-alt"></i> Endereço encontrado!','success');
      }
    } catch { this.mostrarNotificacao('<i class="fas fa-wifi"></i> Erro ao buscar CEP. Preencha manualmente.','error'); }
    finally { if (btn) { btn.innerHTML='<i class="fas fa-search"></i> Buscar'; btn.disabled=false; } }
  }

  // FIX #3: usa data-pay para selecionar botão correto
  selecionarPagamento(tipo) {
    if (this._pixTimer) { clearTimeout(this._pixTimer); this._pixTimer=null; } // FIX #15
    const c = document.getElementById('form-pagamento-container');
    if (!c) return;
    document.querySelectorAll('.lb-pay-option').forEach(b => b.classList.toggle('selected', b.dataset.pay===tipo));

    if (tipo==='pix') {
      c.innerHTML = this.formPix();
      setTimeout(()=>{
        const el = document.getElementById('qrcode');
        const pixText = document.getElementById('pix-copia-cola')?.value || '';
        if (el && typeof QRCode!=='undefined') new QRCode(el,{ text: pixText || 'PIX:R$'+this.calcularTotal().toFixed(2)+'#'+Date.now(), width:180, height:180, colorDark:'#000', colorLight:'#fff', correctLevel:QRCode.CorrectLevel.H });
      },100);
    } else if (tipo==='cartao') {
      c.innerHTML = this.formCartao();
      this._mascarasCartao();
    } else if (tipo==='dinheiro') {
      c.innerHTML = this.formDinheiro();
    }
  }

  processarCartao() {
    const nc = document.getElementById('numero-cartao')?.value.replace(/\s/g,'');
    const nome = document.getElementById('nome-cartao')?.value.trim();
    const val = document.getElementById('validade')?.value;
    const cvv = document.getElementById('cvv')?.value;
    if (!nc||nc.length<13) { this.mostrarNotificacao('<i class="fas fa-times-circle"></i> Número do cartão inválido','error'); return; }
    if (!nome||nome.length<3) { this.mostrarNotificacao('<i class="fas fa-times-circle"></i> Nome inválido','error'); return; }
    if (!val||val.length<5) { this.mostrarNotificacao('<i class="fas fa-times-circle"></i> Validade inválida','error'); return; }
    if (!cvv||cvv.length<3) { this.mostrarNotificacao('<i class="fas fa-times-circle"></i> CVV inválido','error'); return; }
    const tipoCartao = document.querySelector('input[name="tipo-cartao"]:checked')?.value||'crédito';
    this.dadosCheckout.pagamento = { tipo:'cartao', tipoCartao };
    const btn = document.getElementById('btn-confirmar-cartao');
    if (btn) { btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Processando...'; btn.disabled=true; }
    setTimeout(()=>this.proximaEtapa(),2000);
  }

  confirmarDinheiro() {
    const trocoInput = document.getElementById('troco-para');
    const trocoP = trocoInput?.value ? parseFloat(trocoInput.value) : null;
    if (trocoP!==null&&trocoP<this.calcularTotal()) {
      this.mostrarNotificacao('<i class="fas fa-exclamation-triangle"></i> Valor menor que o total','error');
      trocoInput?.focus(); return;
    }
    this.dadosCheckout.pagamento = { tipo:'dinheiro', trocoP };
    this.proximaEtapa();
  }

  _mascarasCartao() {
    const nc=document.getElementById('numero-cartao'), val=document.getElementById('validade'), cvv=document.getElementById('cvv');
    if (nc) nc.addEventListener('input',e=>{ let v=e.target.value.replace(/\D/g,'').slice(0,16); e.target.value=v.replace(/(\d{4})(?=\d)/g,'$1 '); });
    if (val) val.addEventListener('input',e=>{ let v=e.target.value.replace(/\D/g,'').slice(0,4); if(v.length>=2) v=v.slice(0,2)+'/'+v.slice(2); e.target.value=v; });
    if (cvv) cvv.addEventListener('input',e=>{ e.target.value=e.target.value.replace(/\D/g,'').slice(0,4); });
  }

  finalizarCompra() {
    this.fecharModal();
    this.itens=[]; this.etapaAtual=1; this.dadosCheckout={endereco:{},pagamento:{}}; this.cupomAplicado=null;
    if (this._pixTimer) { clearTimeout(this._pixTimer); this._pixTimer=null; }
    localStorage.removeItem('lb_carrinho_itens');
    localStorage.removeItem('lb_carrinho_checkout');
    localStorage.removeItem('lb_carrinho_cupom');
    this.atualizarContador();
    this.mostrarNotificacao('<i class="fas fa-heart"></i> Obrigado pela compra! Logo chegará até você.','success');
  }

  fecharModal() {
    if (this._pixTimer) { clearTimeout(this._pixTimer); this._pixTimer=null; }
    const o=document.getElementById('modal-checkout');
    if (o) { o.style.opacity='0'; o.style.transition='opacity 0.25s ease'; setTimeout(()=>{ o.style.display='none'; o.style.opacity=''; o.style.transition=''; },250); }
  }
}

// ========================================
// INSTÂNCIAS GLOBAIS
// ========================================
const auth = new SistemaAuth();
const carrinho = new CarrinhoCompras();
function adicionarAoCarrinho(nome, preco, imagem='') { carrinho.adicionarItem(nome,preco,imagem); }
function abrirModalPedidos() { carrinho.abrirCheckout(); }

function carrinhoPixCopiar() {
  const txt = document.getElementById('pix-copia-cola');
  if (!txt) return;
  navigator.clipboard.writeText(txt.value).then(()=>{
    const icon = document.getElementById('icon-copiar');
    const label = document.getElementById('txt-copiar');
    if (icon) { icon.className='fas fa-check'; }
    if (label) { label.textContent='Copiado!'; }
    const btn = document.querySelector('.lb-btn-copiar');
    if (btn) { btn.style.background='linear-gradient(135deg,#28a745,#1e7e34)'; }
    setTimeout(()=>{
      if (icon) icon.className='fas fa-copy';
      if (label) label.textContent='Copiar';
      if (btn) btn.style.background='';
    },2500);
  }).catch(()=>{
    txt.select(); document.execCommand('copy');
    carrinho.mostrarNotificacao('<i class="fas fa-copy"></i> Código copiado!','success');
  });
}

// ========================================
// AUTENTICAÇÃO — MODAL
// ========================================
function renderizarModalAuth(abaAtiva='login') {
  let overlay=document.getElementById('modal-auth');
  if (!overlay) {
    overlay=document.createElement('div');
    overlay.id='modal-auth'; overlay.className='lb-modal-overlay';
    overlay.addEventListener('click',e=>{ if(e.target===overlay) fecharModalAuth(); });
    document.body.appendChild(overlay);
  }
  overlay.innerHTML =
    '<div class="lb-modal lb-auth-modal">' +
      '<button class="lb-btn-close lb-auth-close" onclick="fecharModalAuth()"><i class="fas fa-times"></i></button>' +
      '<div class="lb-auth-header">' +
        '<div class="lb-auth-logo"><i class="fas fa-burger"></i></div>' +
        '<h3>Lanches & Bebidas</h3>' +
        '<p>Acesse ou crie sua conta</p>' +
      '</div>' +
      '<div class="lb-auth-tabs">' +
        '<button class="lb-auth-tab '+(abaAtiva==='login'?'active':'')+'" onclick="renderizarModalAuth(\'login\')">Entrar</button>' +
        '<button class="lb-auth-tab '+(abaAtiva==='registro'?'active':'')+'" onclick="renderizarModalAuth(\'registro\')">Criar Conta</button>' +
      '</div>' +
      (abaAtiva==='login' ? _formLogin() : _formRegistro()) +
    '</div>';
  overlay.style.display='flex'; overlay.classList.remove('hidden');
}

function _formLogin() {
  return '<form class="lb-auth-form" onsubmit="tentarLogin(event)">' +
    '<div class="lb-auth-field"><i class="fas fa-envelope"></i><input type="email" id="auth-email" placeholder="seu@email.com" required autocomplete="email"></div>' +
    '<div class="lb-auth-field"><i class="fas fa-lock"></i><input type="password" id="auth-senha" placeholder="••••••••" required autocomplete="current-password"><button type="button" class="lb-toggle-pass" onclick="toggleSenha(\'auth-senha\')" tabindex="-1"><i class="fas fa-eye"></i></button></div>' +
    '<label class="lb-lembrar"><input type="checkbox" id="auth-lembrar"><span>Lembrar de mim</span></label>' +
    '<button type="submit" class="lb-auth-btn">Entrar <i class="fas fa-arrow-right"></i></button>' +
    '<p class="lb-auth-hint">Não tem conta? <a href="#" onclick="renderizarModalAuth(\'registro\');return false">Cadastre-se grátis</a></p>' +
  '</form>';
}

function _formRegistro() {
  return '<form class="lb-auth-form" onsubmit="tentarRegistro(event)">' +
    '<div class="lb-auth-field"><i class="fas fa-user"></i><input type="text" id="reg-nome" placeholder="Nome completo" required minlength="3" autocomplete="name"></div>' +
    '<div class="lb-auth-field"><i class="fas fa-envelope"></i><input type="email" id="reg-email" placeholder="seu@email.com" required autocomplete="email"></div>' +
    '<div class="lb-auth-field"><i class="fas fa-phone"></i><input type="tel" id="reg-tel" placeholder="(00) 00000-0000" autocomplete="tel"></div>' +
    '<div class="lb-auth-field"><i class="fas fa-lock"></i><input type="password" id="reg-senha" placeholder="Mín. 6 caracteres" required minlength="6" autocomplete="new-password"><button type="button" class="lb-toggle-pass" onclick="toggleSenha(\'reg-senha\')" tabindex="-1"><i class="fas fa-eye"></i></button></div>' +
    '<div id="reg-strength" class="lb-strength"></div>' +
    '<div class="lb-auth-field"><i class="fas fa-check-double"></i><input type="password" id="reg-senha2" placeholder="Confirme a senha" required minlength="6" autocomplete="new-password"></div>' +
    '<button type="submit" class="lb-auth-btn">Criar Conta <i class="fas fa-user-plus"></i></button>' +
    '<p class="lb-auth-hint">Já tem conta? <a href="#" onclick="renderizarModalAuth(\'login\');return false">Entrar</a></p>' +
  '</form>';
}

function toggleSenha(id) {
  const inp=document.getElementById(id); if (!inp) return;
  const show = inp.type==='password';
  inp.type = show?'text':'password';
  const btn=inp.nextElementSibling;
  if (btn) btn.innerHTML = show?'<i class="fas fa-eye-slash"></i>':'<i class="fas fa-eye"></i>';
}

function tentarLogin(e) {
  e.preventDefault();
  const email=document.getElementById('auth-email').value;
  const senha=document.getElementById('auth-senha').value;
  const lembrar=document.getElementById('auth-lembrar').checked;
  const btn=document.querySelector('#modal-auth .lb-auth-btn');
  try {
    if (btn) { btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Entrando...'; btn.disabled=true; }
    const u=auth.login(email,senha,lembrar);
    fecharModalAuth(); atualizarUIAuth();
    carrinho.mostrarNotificacao('<i class="fas fa-user-check"></i> Bem-vindo de volta, '+u.nome.split(' ')[0]+'!','success');
  } catch(err) {
    if (btn) { btn.innerHTML='Entrar <i class="fas fa-arrow-right"></i>'; btn.disabled=false; }
    const form=document.querySelector('#modal-auth .lb-auth-form');
    form?.classList.add('lb-shake'); setTimeout(()=>form?.classList.remove('lb-shake'),500);
    carrinho.mostrarNotificacao('<i class="fas fa-times-circle"></i> '+err.message,'error');
  }
}

function tentarRegistro(e) {
  e.preventDefault();
  const nome=document.getElementById('reg-nome').value.trim();
  const email=document.getElementById('reg-email').value.trim();
  const tel=document.getElementById('reg-tel').value.trim();
  const senha=document.getElementById('reg-senha').value;
  const senha2=document.getElementById('reg-senha2').value;
  if (senha!==senha2) { carrinho.mostrarNotificacao('<i class="fas fa-times-circle"></i> As senhas não coincidem.','error'); document.getElementById('reg-senha2').focus(); return; }
  const btn=document.querySelector('#modal-auth .lb-auth-btn');
  try {
    if (btn) { btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Criando...'; btn.disabled=true; }
    const u=auth.registrar(nome,email,senha,tel);
    fecharModalAuth(); atualizarUIAuth();
    // FIX #12: ícone correto no FA6
    carrinho.mostrarNotificacao('<i class="fas fa-star"></i> Conta criada! Bem-vindo, '+u.nome.split(' ')[0]+'!','success');
  } catch(err) {
    if (btn) { btn.innerHTML='Criar Conta <i class="fas fa-user-plus"></i>'; btn.disabled=false; }
    carrinho.mostrarNotificacao('<i class="fas fa-times-circle"></i> '+err.message,'error');
  }
}

function fecharModalAuth() {
  const o=document.getElementById('modal-auth');
  if (o) { o.style.opacity='0'; o.style.transition='opacity 0.2s'; setTimeout(()=>{ o.style.display='none'; o.style.opacity=''; o.style.transition=''; },200); }
}

function atualizarUIAuth() {
  const link=document.getElementById('link-login'); if (!link) return;
  if (auth.estaLogado()) {
    const u=auth.getUsuario();
    link.innerHTML='<i class="fas fa-user-circle me-2"></i>'+u.nome.split(' ')[0];
  } else {
    link.innerHTML='<i class="fas fa-user-circle me-2"></i>Entrar';
  }
}

// FIX #13: dropdown no li correto, não vai fora da viewport
function mostrarMenuUsuario() {
  document.getElementById('user-dropdown')?.remove();
  const link=document.getElementById('link-login');
  const li=link?.closest('li')||link?.parentElement;
  if (!li) return;
  if (getComputedStyle(li).position==='static') li.style.position='relative';
  const u=auth.getUsuario();
  const menu=document.createElement('div');
  menu.id='user-dropdown'; menu.className='lb-user-menu';
  menu.innerHTML=
    '<div class="lb-user-info">' +
      '<div class="lb-user-avatar">'+u.nome.charAt(0).toUpperCase()+'</div>' +
      '<div><strong>'+u.nome+'</strong><small>'+u.email+'</small></div>' +
    '</div><hr>' +
    '<button onclick="menuAcao(\'pedidos\')"><i class="fas fa-receipt"></i> Meus Pedidos</button>' +
    '<button onclick="menuAcao(\'perfil\')"><i class="fas fa-cog"></i> Meu Perfil</button>' +
    '<button onclick="menuAcao(\'logout\')" class="lb-logout-btn"><i class="fas fa-sign-out-alt"></i> Sair</button>';
  li.appendChild(menu);
  setTimeout(()=>{
    document.addEventListener('click',function fechar(ev){ if(!menu.contains(ev.target)&&ev.target!==link){ menu.remove(); document.removeEventListener('click',fechar); } });
  },10);
}

function menuAcao(acao) {
  document.getElementById('user-dropdown')?.remove();
  if (acao==='logout') { auth.logout(); atualizarUIAuth(); carrinho.mostrarNotificacao('<i class="fas fa-sign-out-alt"></i> Até logo!','info'); }
  else if (acao==='pedidos') carrinho.mostrarNotificacao('<i class="fas fa-receipt"></i> Histórico em breve!','info');
  else if (acao==='perfil') carrinho.mostrarNotificacao('<i class="fas fa-cog"></i> Perfil em breve!','info');
}

// Força da senha
document.addEventListener('input',e=>{
  if (e.target.id!=='reg-senha') return;
  const v=e.target.value;
  const f=[v.length>=6,/[A-Z]/.test(v),/\d/.test(v),/[^A-Za-z0-9]/.test(v)].filter(Boolean).length;
  const labels=['','Fraca','Razoável','Boa','Forte'];
  const colors=['','#dc3545','#fd7e14','#ffc107','#28a745'];
  const el=document.getElementById('reg-strength'); if(!el) return;
  el.innerHTML = v.length ? '<div style="background:#eee;border-radius:2px;overflow:hidden;height:4px;margin-bottom:4px"><div style="width:'+f*25+'%;background:'+colors[f]+';height:4px;border-radius:2px;transition:width 0.3s,background 0.3s"></div></div><span style="color:'+colors[f]+';font-size:12px">'+labels[f]+'</span>' : '';
});

// ========================================
// CARROSSEL
// ========================================
function inicializarCarrossel() {
  const track=document.getElementById('carousel-track');
  const slides=track?.querySelectorAll('.carousel-slide');
  if (!track||!slides?.length) return;
  let cur=0; const total=slides.length;
  const go=n=>{ cur=(n+total)%total; track.style.transition='transform 0.55s cubic-bezier(0.25,1,0.5,1)'; track.style.transform='translateX('+(-cur*100)+'%)'; };
  let timer=setInterval(()=>go(cur+1),5000);
  const reset=()=>{ clearInterval(timer); timer=setInterval(()=>go(cur+1),5000); };
  document.getElementById('nextBtn')?.addEventListener('click',()=>{ go(cur+1); reset(); });
  document.getElementById('prevBtn')?.addEventListener('click',()=>{ go(cur-1); reset(); });
  let tx=0;
  track.addEventListener('touchstart',e=>{ tx=e.touches[0].clientX; },{passive:true});
  track.addEventListener('touchend',e=>{ const d=tx-e.changedTouches[0].clientX; if(Math.abs(d)>50){ d>0?go(cur+1):go(cur-1); reset(); } },{passive:true});
}

// ========================================
// MENU MOBILE
// ========================================
function inicializarMenuMobile() {
  const toggle=document.getElementById('menu-toggle');
  const menu=document.getElementById('navbar-menu');
  if (!toggle||!menu) return;
  toggle.addEventListener('click',()=>{
    menu.classList.toggle('active');
    const icon=toggle.querySelector('i');
    if (icon) { icon.classList.toggle('fa-bars'); icon.classList.toggle('fa-times'); }
  });
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    menu.classList.remove('active');
    const icon=toggle.querySelector('i');
    if (icon) icon.className='fas fa-bars';
  }));
}

// ========================================
// BUSCA INTELIGENTE
// ========================================
class BuscaInteligente {
  constructor() {
    this.sinonimos={
      'pizza':['piza','pizzas'],
      'hamburguer':['hamburger','x-burger','lanche','sanduiche'],
      'refrigerante':['refri','coca','pepsi','soda','bebida'],
      'suco':['juice','vitamina','natural'],
      'batata':['fritas','chips'],
      'frango':['chicken','galeto','nuggets'],
      'queijo':['cheese','mussarela','catupiry'],
      'salada':['verdura','legumes'],
      'sobremesa':['doce','sorvete','acai','milkshake'],
      'cerveja':['beer','chopp','heineken','budweiser','corona']
    };
  }
  normalizar(t) { return t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim(); }
  relevancia(card,termo) {
    const titulo=this.normalizar(card.querySelector('.card-title')?.textContent||'');
    const desc=this.normalizar(card.querySelector('.card-text')?.textContent||'');
    const tN=this.normalizar(termo); let p=0;
    if (titulo.includes(tN)) p+=100;
    if (desc.includes(tN)) p+=40;
    for (const [pal,sins] of Object.entries(this.sinonimos)) {
      if (tN.includes(pal)||sins.some(s=>tN.includes(s))) {
        if (titulo.includes(pal)) p+=60;
        sins.forEach(s=>{ if(titulo.includes(s)) p+=30; });
      }
    }
    return p;
  }
  buscar(termo,cards) {
    if (!termo||termo.length<2) {
      // FIX #17: força visibilidade ao resetar busca
      cards.forEach(c=>{ c.style.display=''; c.style.order=''; c.style.opacity='1'; c.style.animation='none'; });
      return;
    }
    Array.from(cards).map(c=>({c,p:this.relevancia(c,termo)})).sort((a,b)=>b.p-a.p).forEach(({c,p},i)=>{
      if (p>15) {
        c.style.display=''; c.style.order=i; c.style.opacity='0'; c.style.animation='none';
        requestAnimationFrame(()=>{ c.style.transition='opacity 0.25s ease'; c.style.opacity='1'; });
      } else { c.style.display='none'; }
    });
  }
}
const busca=new BuscaInteligente();

// ========================================
// MAPA
// ========================================
function inicializarMapa() {
  setTimeout(()=>{
    if (typeof ol==='undefined'||!document.getElementById('map')) return;
    try {
      const coords=ol.proj.fromLonLat([-52.0986,-32.0350]);
      const map=new ol.Map({ target:'map', layers:[new ol.layer.Tile({source:new ol.source.OSM()})], view:new ol.View({center:coords,zoom:15,minZoom:12,maxZoom:18}), controls:[] });
      const svg='data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="36" viewBox="-2 -2 36 52"><path fill="%23FFC400" stroke="%23000" stroke-width="2" d="M16 0C7.2 0 0 7.2 0 16c0 13 16 32 16 32s16-19 16-32c0-8.8-7.2-16-16-16z"/><circle cx="16" cy="16" r="6" fill="white"/></svg>';
      const marker=new ol.Feature({geometry:new ol.geom.Point(coords)});
      marker.setStyle(new ol.style.Style({image:new ol.style.Icon({anchor:[0.5,1],src:svg,scale:1.2})}));
      map.addLayer(new ol.layer.Vector({source:new ol.source.Vector({features:[marker]})}));
      map.on('pointermove',evt=>{ map.getTargetElement().style.cursor=map.hasFeatureAtPixel(evt.pixel)?'pointer':''; });
    } catch(err){ console.warn('Mapa:',err); }
  },500);
}

// ========================================
// ESTILOS
// ========================================
const estilos=document.createElement('style');
estilos.textContent=`
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap');
@keyframes lbSlideIn{from{transform:translateX(110%) scale(0.9);opacity:0}to{transform:translateX(0) scale(1);opacity:1}}
@keyframes lbSlideOut{from{transform:translateX(0);opacity:1}to{transform:translateX(110%);opacity:0}}
@keyframes lbBounceIn{0%{transform:scale(0.3);opacity:0}60%{transform:scale(1.05)}80%{transform:scale(0.97)}100%{transform:scale(1);opacity:1}}
@keyframes lbShake{0%,100%{transform:translateX(0)}15%,45%,75%{transform:translateX(-7px)}30%,60%,90%{transform:translateX(7px)}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.lb-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);z-index:9000;display:flex;align-items:center;justify-content:center;padding:16px}
.lb-modal{background:#fff;width:100%;max-width:560px;border-radius:20px;box-shadow:0 25px 60px rgba(0,0,0,0.35);max-height:92vh;overflow-y:auto;animation:lbBounceIn 0.4s cubic-bezier(0.34,1.56,0.64,1)}
.lb-modal::-webkit-scrollbar{width:6px}.lb-modal::-webkit-scrollbar-track{background:#f1f1f1;border-radius:10px}.lb-modal::-webkit-scrollbar-thumb{background:#ccc;border-radius:10px}
.lb-modal-header{display:flex;justify-content:space-between;align-items:center;padding:18px 22px 14px;border-bottom:1px solid #f0f0f0;position:sticky;top:0;background:#fff;z-index:5;border-radius:20px 20px 0 0}
.lb-modal-header h4{font-size:1.05rem;font-weight:700;color:#1a1a1a;display:flex;align-items:center;gap:10px;margin:0}
.lb-modal-header h4 i{color:#ffc107}
.lb-btn-close{background:#f5f5f5;border:none;width:34px;height:34px;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#666;transition:0.2s;font-size:14px}
.lb-btn-close:hover{background:#ff4444;color:#fff}
.lb-steps{display:flex;align-items:center;padding:14px 18px;background:#fafafa;border-bottom:1px solid #f0f0f0}
.lb-step{display:flex;flex-direction:column;align-items:center;gap:5px;flex:1}
.lb-step-circle{width:32px;height:32px;border-radius:50%;background:#e9ecef;color:#999;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;transition:all 0.3s}
.lb-step.active .lb-step-circle{background:#ffc107;color:#1a1a1a;box-shadow:0 0 0 4px rgba(255,193,7,0.2)}
.lb-step.done .lb-step-circle{background:#28a745;color:#fff}
.lb-step span{font-size:11px;color:#999;font-weight:500}
.lb-step.active span{color:#ffc107;font-weight:700}.lb-step.done span{color:#28a745}
.lb-step-line{flex:1;height:2px;background:#e9ecef;margin:0 6px 14px;transition:background 0.3s}
.lb-step-line.done{background:#28a745}
.lb-modal-body{padding:20px 22px;animation:fadeIn 0.3s ease}
.lb-section-title{font-weight:700;font-size:0.95rem;color:#1a1a1a;margin-bottom:16px;display:flex;align-items:center;gap:8px;border-left:4px solid #ffc107;padding-left:10px}
.lb-items-list{display:flex;flex-direction:column;gap:9px;margin-bottom:15px}
.lb-cart-item{display:flex;align-items:center;gap:10px;padding:11px 12px;background:#f9f9f9;border-radius:12px;border:1px solid #eee;transition:0.2s}
.lb-cart-item:hover{border-color:#ffc107}
.lb-item-info{flex:1;min-width:0}
.lb-item-name{font-weight:600;font-size:13px;color:#1a1a1a;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.lb-item-unit{font-size:11px;color:#999}
.lb-item-controls{display:flex;align-items:center;gap:5px;background:#fff;border:1px solid #e9e9e9;border-radius:8px;padding:3px}
.lb-qty-btn{background:none;border:none;width:26px;height:26px;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#666;transition:0.2s;font-size:10px}
.lb-qty-btn:hover{background:#ffc107;color:#1a1a1a}
.lb-qty{font-weight:700;font-size:14px;min-width:22px;text-align:center;color:#1a1a1a}
.lb-item-subtotal{font-weight:700;color:#28a745;font-size:13px;white-space:nowrap}
.lb-btn-remove{background:none;border:none;color:#ddd;cursor:pointer;padding:6px;border-radius:6px;transition:0.2s;font-size:12px}
.lb-btn-remove:hover{background:#fff0f0;color:#dc3545}
.lb-coupon-row{display:flex;gap:8px;margin-bottom:10px}
.lb-input{flex:1;padding:10px 13px;border:1.5px solid #e9e9e9;border-radius:10px;font-size:14px;outline:none;transition:0.2s}
.lb-input:focus{border-color:#ffc107}
.lb-input.lb-input-error{border-color:#dc3545;animation:lbShake 0.4s ease}
.lb-btn-cupom{padding:10px 16px;background:#ffc107;border:none;border-radius:10px;font-weight:600;cursor:pointer;white-space:nowrap;transition:0.2s;font-size:14px}
.lb-btn-cupom:hover{background:#e6ac00}
.lb-cupom-ok{background:#d4edda;color:#155724;border-radius:8px;padding:8px 12px;font-size:13px;margin-bottom:12px}
.lb-summary{background:#f9f9f9;border-radius:12px;padding:12px 14px;border:1px solid #eee}
.lb-summary-row{display:flex;justify-content:space-between;padding:5px 0;font-size:14px;color:#555}
.lb-summary-row.green span:last-child{color:#28a745;font-weight:600}
.lb-summary-total{display:flex;justify-content:space-between;font-size:1.05rem;font-weight:700;color:#1a1a1a;border-top:2px solid #e9e9e9;margin-top:8px;padding-top:10px}
.lb-actions{display:flex;gap:10px;margin-top:18px;padding-top:15px;border-top:1px solid #f0f0f0}
.lb-btn-primary,.lb-btn-secondary{flex:1;padding:11px 16px;border:none;border-radius:12px;font-weight:600;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14px}
.lb-btn-primary{background:#ffc107;color:#1a1a1a}
.lb-btn-primary:hover{background:#e6ac00;transform:translateY(-1px);box-shadow:0 4px 14px rgba(255,193,7,0.4)}
.lb-btn-primary:disabled{opacity:0.65;cursor:not-allowed;transform:none}
.lb-btn-secondary{background:#f0f0f0;color:#555}
.lb-btn-secondary:hover{background:#e2e2e2}
.lb-form{display:flex;flex-direction:column}
.lb-form-row{display:flex;gap:10px}
.lb-form-group{display:flex;flex-direction:column;margin-bottom:13px;flex:1}
.lb-form-group label{font-size:11px;font-weight:700;color:#555;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.4px}
.lb-form-group input{padding:10px 12px;border:1.5px solid #e9e9e9;border-radius:10px;font-size:14px;outline:none;transition:0.2s;background:#fff;font-family:inherit}
.lb-form-group input:focus{border-color:#ffc107;box-shadow:0 0 0 3px rgba(255,193,7,0.1)}
.lb-form-group input:valid:not(:placeholder-shown){border-color:#c3e6cb}
.lb-form-group input.lb-field-error{border-color:#dc3545!important;animation:lbShake 0.4s ease}
.lb-cep-btn-group{justify-content:flex-end}
.lb-btn-cep{width:100%;padding:10px 12px;background:#1a1a1a;color:#ffc107;border:none;border-radius:10px;cursor:pointer;font-weight:600;transition:0.2s;display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;white-space:nowrap;min-height:42px}
.lb-btn-cep:hover{background:#333}.lb-btn-cep:disabled{opacity:0.6;cursor:not-allowed}
.lb-payment-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px}
.lb-pay-option{display:flex;flex-direction:column;align-items:center;gap:7px;padding:15px 10px;background:#fafafa;border:2px solid #eee;border-radius:14px;cursor:pointer;transition:all 0.2s;font-weight:600}
.lb-pay-option i{font-size:1.6rem;color:#aaa;transition:0.2s}
.lb-pay-option span{font-size:13px;color:#555;transition:0.2s}
.lb-pay-option small{font-size:11px;color:#aaa}
.lb-pay-option:hover,.lb-pay-option.selected{border-color:#ffc107;background:#fffdf0}
.lb-pay-option.selected i,.lb-pay-option:hover i{color:#ffc107}
.lb-pay-option.selected span,.lb-pay-option:hover span{color:#1a1a1a}
.lb-pay-form{animation:fadeIn 0.3s ease}
.lb-pix-container{text-align:center;padding:16px 0}
.lb-pix-badge{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(135deg,#00a859,#007a42);color:#fff;padding:7px 18px;border-radius:20px;font-weight:700;font-size:14px;margin-bottom:8px}
.lb-pix-subtitle{color:#777;font-size:13px;margin-bottom:14px}
.lb-qr-wrapper{display:inline-flex;padding:14px;background:#fff;border:2px solid #eee;border-radius:14px;margin-bottom:10px}
.lb-pix-info{color:#555;font-size:14px;margin-bottom:4px}
.lb-pix-value{font-size:1.7rem;font-weight:800;color:#1a1a1a;margin-bottom:14px}
.lb-pix-copia-section{background:#f8f9fa;border:1.5px solid #e0e0e0;border-radius:14px;padding:14px;margin-bottom:14px;text-align:left}
.lb-pix-copia-label{font-size:12px;font-weight:700;color:#555;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;display:flex;align-items:center;gap:6px}
.lb-pix-copia-box{display:flex;gap:8px;align-items:flex-start}
.lb-pix-textarea{flex:1;font-size:11px;font-family:monospace;border:1.5px solid #ddd;border-radius:8px;padding:10px;resize:none;height:64px;color:#333;background:#fff;cursor:pointer;word-break:break-all;line-height:1.4}
.lb-pix-textarea:focus{outline:none;border-color:#00a859}
.lb-btn-copiar{flex-shrink:0;background:linear-gradient(135deg,#ffc107,#e6ac00);border:none;border-radius:10px;padding:10px 14px;font-weight:700;font-size:13px;cursor:pointer;display:flex;align-items:center;gap:6px;color:#1a1a1a;transition:all 0.2s;white-space:nowrap;align-self:center}
.lb-btn-copiar:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(255,193,7,0.4)}
.lb-pix-info-row{display:flex;flex-direction:column;gap:6px;margin-bottom:14px;text-align:left;background:#fff;border:1.5px solid #eee;border-radius:12px;padding:12px}
.lb-pix-info-item{display:flex;align-items:center;gap:8px;font-size:13px;color:#555}
.lb-pix-info-item i{color:#00a859;width:16px;text-align:center}
.lb-waiting{display:flex;align-items:center;justify-content:center;gap:10px;color:#ffc107;font-weight:600;margin-bottom:12px}
.lb-spinner{width:18px;height:18px;border:3px solid #f3f3f3;border-top:3px solid #ffc107;border-radius:50%;animation:spin 1s linear infinite}
.lb-pix-steps{display:flex;gap:10px;justify-content:center;margin-bottom:8px}
.lb-pix-step{display:flex;flex-direction:column;align-items:center;gap:5px;flex:1;max-width:100px}
.lb-ps-num{width:28px;height:28px;background:linear-gradient(135deg,#00a859,#007a42);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px}
.lb-pix-step span{font-size:11px;color:#777;text-align:center;line-height:1.3}
.lb-card-type-row{display:flex;gap:10px;margin-bottom:13px}
.lb-radio{flex:1;display:flex;align-items:center;gap:8px;padding:11px;border:2px solid #eee;border-radius:10px;cursor:pointer;transition:0.2s;font-weight:500;font-size:14px}
.lb-radio:has(input:checked){border-color:#ffc107;background:#fffdf0}
.lb-radio input{accent-color:#ffc107}
.lb-troco-sugestoes{display:flex;gap:8px;flex-wrap:wrap;margin:6px 0 12px;align-items:center}
.lb-troco-sugestao{padding:6px 12px;background:#f0f0f0;border:2px solid transparent;border-radius:8px;cursor:pointer;font-weight:600;transition:0.2s;font-size:13px}
.lb-troco-sugestao:hover{border-color:#ffc107;background:#fffdf0}
.lb-total-entrega{color:#555;font-size:13px;padding:10px 12px;background:#fff9e6;border-radius:8px;border:1px solid #ffe082}
.lb-success-anim{text-align:center;padding:18px 0 14px}
.lb-check-circle{width:66px;height:66px;background:linear-gradient(135deg,#28a745,#1e7e34);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:1.8rem;color:#fff;margin-bottom:12px;animation:lbBounceIn 0.6s 0.15s both}
.lb-success-anim h3{font-size:1.25rem;color:#1a1a1a;margin-bottom:4px}
.lb-success-anim p{color:#777;font-size:14px}
.lb-receipt{background:#fafafa;border-radius:14px;border:1px solid #eee;overflow:hidden;margin:13px 0}
.lb-receipt-section{padding:12px 14px;border-bottom:1px solid #eee}
.lb-receipt-section:last-child{border-bottom:none}
.lb-receipt-title{font-weight:700;font-size:12px;color:#1a1a1a;margin-bottom:8px;display:flex;align-items:center;gap:7px;text-transform:uppercase;letter-spacing:0.5px}
.lb-receipt-title i{color:#ffc107}
.lb-receipt-row{display:flex;justify-content:space-between;font-size:13px;padding:3px 0;color:#555}
.lb-receipt-row.green span:last-child{color:#28a745}
.lb-receipt-total{display:flex;justify-content:space-between;font-weight:700;font-size:0.95rem;border-top:2px solid #eee;padding-top:9px;margin-top:5px;color:#1a1a1a}
.lb-receipt-section p{font-size:13px;color:#555;line-height:1.6;margin:0}
.lb-auth-modal{max-width:420px;padding:0}
.lb-auth-close{position:absolute;right:14px;top:14px;z-index:10}
.lb-auth-header{text-align:center;padding:30px 26px 16px;background:linear-gradient(135deg,#1a1a1a,#2d2d2d);color:#fff;border-radius:20px 20px 0 0;position:relative}
.lb-auth-logo{font-size:2.3rem;color:#ffc107;margin-bottom:8px}
.lb-auth-header h3{font-size:1.1rem;margin-bottom:4px;font-weight:700}
.lb-auth-header p{color:rgba(255,255,255,0.55);font-size:13px;margin:0}
.lb-auth-tabs{display:flex;border-bottom:2px solid #f0f0f0;padding:0 26px;background:#fff}
.lb-auth-tab{flex:1;padding:13px;background:none;border:none;font-size:15px;font-weight:600;color:#aaa;cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px;transition:0.2s}
.lb-auth-tab.active{color:#ffc107;border-bottom-color:#ffc107}
.lb-auth-form{padding:20px 26px 24px;display:flex;flex-direction:column;gap:12px}
.lb-auth-field{display:flex;align-items:center;border:1.5px solid #e9e9e9;border-radius:12px;padding:0 12px;transition:0.2s;background:#fff}
.lb-auth-field:focus-within{border-color:#ffc107;box-shadow:0 0 0 3px rgba(255,193,7,0.1)}
.lb-auth-field>i:first-child{color:#aaa;font-size:14px;width:18px;flex-shrink:0}
.lb-auth-field input{flex:1;border:none;outline:none;padding:12px 10px;font-size:14px;background:transparent;color:#1a1a1a}
.lb-toggle-pass{background:none;border:none;color:#aaa;cursor:pointer;padding:4px;font-size:13px;transition:0.2s;flex-shrink:0}
.lb-toggle-pass:hover{color:#ffc107}
.lb-lembrar{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:#555}
.lb-lembrar input{accent-color:#ffc107}
.lb-strength{min-height:22px}
.lb-auth-btn{padding:13px;background:linear-gradient(135deg,#ffc107,#e6ac00);border:none;border-radius:12px;font-weight:700;font-size:15px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:8px;color:#1a1a1a}
.lb-auth-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(255,193,7,0.35)}
.lb-auth-btn:disabled{opacity:0.65;cursor:not-allowed;transform:none}
.lb-auth-hint{text-align:center;font-size:13px;color:#888;margin:0}
.lb-auth-hint a{color:#ffc107;font-weight:600;text-decoration:none}
.lb-auth-hint a:hover{text-decoration:underline}
.lb-shake{animation:lbShake 0.5s ease}
.lb-user-menu{position:absolute;top:110%;right:0;background:#fff;border-radius:14px;box-shadow:0 10px 30px rgba(0,0,0,0.15);padding:14px;min-width:210px;z-index:9999;animation:fadeIn 0.2s ease;border:1px solid #f0f0f0}
.lb-user-info{display:flex;align-items:center;gap:11px;margin-bottom:10px}
.lb-user-avatar{width:38px;height:38px;flex-shrink:0;background:linear-gradient(135deg,#ffc107,#e6ac00);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;color:#1a1a1a}
.lb-user-info div strong{display:block;font-size:14px;color:#1a1a1a}
.lb-user-info div small{font-size:12px;color:#aaa;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px}
.lb-user-menu hr{border:none;border-top:1px solid #f0f0f0;margin:8px 0}
.lb-user-menu button{display:flex;align-items:center;gap:10px;width:100%;padding:9px 10px;background:none;border:none;border-radius:8px;cursor:pointer;font-size:14px;color:#333;transition:0.2s;text-align:left}
.lb-user-menu button:hover{background:#f9f9f9;color:#ffc107}
.lb-logout-btn{color:#dc3545!important}
.lb-logout-btn:hover{background:#fff5f5!important;color:#dc3545!important}
#contador-pedidos{background:#ffc107;color:#1a1a1a;border-radius:50%;width:20px;height:20px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;transition:transform 0.2s;margin-left:4px}
@media(max-width:640px){
  .lb-modal{border-radius:20px 20px 0 0;max-height:95vh;position:fixed;bottom:0;width:100%;max-width:100%}
  .lb-modal-overlay{align-items:flex-end;padding:0}
  .lb-form-row{flex-direction:column;gap:0}
  .lb-actions{flex-direction:column}
  .lb-btn-primary,.lb-btn-secondary{width:100%}
  .lb-auth-form{padding:18px 20px 22px}
  .lb-user-menu{right:auto;left:0}
}
`;
document.head.appendChild(estilos);

// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded',()=>{
  inicializarCarrossel();
  inicializarMenuMobile();
  inicializarMapa();
  atualizarUIAuth();

  // Login link
  const linkLogin=document.getElementById('link-login');
  if (linkLogin) {
    linkLogin.addEventListener('click',e=>{
      e.preventDefault();
      if (auth.estaLogado()) mostrarMenuUsuario();
      else renderizarModalAuth('login');
    });
  }

  // FIX #14: remove div#modal-overlay legado do cardapio.html
  document.getElementById('modal-overlay')?.remove();

  // Busca
  const inputPesquisa=document.getElementById('input-pesquisa');
  const cards=document.querySelectorAll('#lista-produtos .card');
  if (inputPesquisa&&cards.length) {
    cards.forEach(c=>{ c.style.opacity='1'; }); // FIX #17
    let t;
    inputPesquisa.addEventListener('input',e=>{ clearTimeout(t); t=setTimeout(()=>busca.buscar(e.target.value,cards),250); });
    inputPesquisa.addEventListener('keydown',e=>{ if(e.key==='Escape'){ inputPesquisa.value=''; busca.buscar('',cards); }});
  }

  // Contato
  document.getElementById('form-contato')?.addEventListener('submit',e=>{
    e.preventDefault(); carrinho.mostrarNotificacao('<i class="fas fa-paper-plane"></i> Mensagem enviada!','success'); e.target.reset();
  });

  // Botões comprar — com feedback visual
  document.addEventListener('click',e=>{
    const btn=e.target.closest('.btn-comprar');
    if (btn) {
      adicionarAoCarrinho(btn.dataset.item,btn.dataset.preco);
      const orig=btn.innerHTML;
      btn.innerHTML='<i class="fas fa-check"></i> Adicionado!';
      btn.style.background='linear-gradient(to right,#1a7a2e,#28a745)';
      setTimeout(()=>{ btn.innerHTML=orig; btn.style.background=''; },1200);
    }
  });

  // Links pedidos
  document.querySelectorAll('#link-pedidos').forEach(el=>{
    el.addEventListener('click',e=>{ e.preventDefault(); abrirModalPedidos(); });
  });

  // Máscara CEP via delegação (funciona mesmo após renderizar formulário)
  document.addEventListener('input',e=>{
    if (e.target.id==='cep') {
      let v=e.target.value.replace(/\D/g,'').slice(0,8);
      if(v.length>=5) v=v.slice(0,5)+'-'+v.slice(5);
      e.target.value=v;
    }
  });

  carrinho.atualizarContador();
  console.log('🍔 Lanches & Bebidas v2.1 — todos os bugs corrigidos!');
});