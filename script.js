// ========================================
// SISTEMA DE CARRINHO DE COMPRAS APRIMORADO
// ========================================

class CarrinhoCompras {
  constructor() {
    this.itens = [];
    this.etapaAtual = 1;
    this.dadosCheckout = {
      endereco: {},
      pagamento: {}
    };
  }

  // Adicionar item ao carrinho
  adicionarItem(nome, preco) {
    this.itens.push({ 
      id: Date.now(),
      nome, 
      preco: parseFloat(preco) 
    });
    this.atualizarContador();
    this.mostrarNotificacao(`${nome} adicionado ao carrinho!`, 'success');
  }

  // Remover item do carrinho
  removerItem(id) {
    const index = this.itens.findIndex(item => item.id === id);
    if (index !== -1) {
      const item = this.itens[index];
      this.itens.splice(index, 1);
      this.atualizarContador();
      this.mostrarNotificacao(`${item.nome} removido do carrinho`, 'info');
    }
  }

  // Calcular total
  calcularTotal() {
    return this.itens.reduce((total, item) => total + item.preco, 0);
  }

  // Atualizar contador visual
  atualizarContador() {
    const contador = document.getElementById('contador-pedidos');
    if (contador) {
      contador.textContent = this.itens.length;
      contador.style.transform = 'scale(1.2)';
      setTimeout(() => {
        contador.style.transform = 'scale(1)';
      }, 200);
    }
  }

  // Mostrar notificação
  mostrarNotificacao(mensagem, tipo = 'info') {
    const notif = document.createElement('div');
    notif.className = `notificacao notif-${tipo}`;
    
    const icones = {
      success: 'fa-check-circle',
      info: 'fa-info-circle',
      warning: 'fa-exclamation-triangle',
      error: 'fa-times-circle'
    };

    const cores = {
      success: '#28a745',
      info: '#17a2b8',
      warning: '#ffc107',
      error: '#dc3545'
    };

    notif.innerHTML = `
      <i class="fas ${icones[tipo]}"></i>
      <span>${mensagem}</span>
    `;
    
    notif.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${cores[tipo]};
      color: white;
      padding: 15px 25px;
      border-radius: 10px;
      box-shadow: 0 5px 15px rgba(0,0,0,0.3);
      z-index: 10000;
      animation: slideInRight 0.4s ease;
      display: flex;
      align-items: center;
      gap: 10px;
      max-width: 90vw;
      word-wrap: break-word;
    `;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
      notif.style.animation = 'slideOutRight 0.4s ease';
      setTimeout(() => notif.remove(), 400);
    }, 3000);
  }

  // Abrir modal de checkout
  abrirCheckout() {
    if (this.itens.length === 0) {
      this.mostrarNotificacao('Seu carrinho está vazio!', 'warning');
      return;
    }

    this.etapaAtual = 1;
    this.renderizarModal();
  }

  // Renderizar modal com etapas
  renderizarModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    if (!modalOverlay) return;

    modalOverlay.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h4><i class="fas fa-shopping-cart me-2"></i>Finalizar Pedido</h4>
          <button class="btn-close" onclick="carrinho.fecharModal()">&times;</button>
        </div>
        
        <!-- Indicador de Etapas -->
        <div class="etapas-indicador">
          <div class="etapa ${this.etapaAtual >= 1 ? 'ativa' : ''} ${this.etapaAtual > 1 ? 'completa' : ''}">
            <div class="etapa-numero">1</div>
            <div class="etapa-label">Carrinho</div>
          </div>
          <div class="etapa-linha ${this.etapaAtual > 1 ? 'completa' : ''}"></div>
          <div class="etapa ${this.etapaAtual >= 2 ? 'ativa' : ''} ${this.etapaAtual > 2 ? 'completa' : ''}">
            <div class="etapa-numero">2</div>
            <div class="etapa-label">Endereço</div>
          </div>
          <div class="etapa-linha ${this.etapaAtual > 2 ? 'completa' : ''}"></div>
          <div class="etapa ${this.etapaAtual >= 3 ? 'ativa' : ''} ${this.etapaAtual > 3 ? 'completa' : ''}">
            <div class="etapa-numero">3</div>
            <div class="etapa-label">Pagamento</div>
          </div>
          <div class="etapa-linha ${this.etapaAtual > 3 ? 'completa' : ''}"></div>
          <div class="etapa ${this.etapaAtual >= 4 ? 'ativa' : ''}">
            <div class="etapa-numero">4</div>
            <div class="etapa-label">Confirmação</div>
          </div>
        </div>

        <div class="modal-body">
          ${this.renderizarEtapa()}
        </div>
      </div>
    `;

    modalOverlay.classList.remove('hidden');
  }

  // Renderizar conteúdo da etapa atual
  renderizarEtapa() {
    switch(this.etapaAtual) {
      case 1: return this.etapaCarrinho();
      case 2: return this.etapaEndereco();
      case 3: return this.etapaPagamento();
      case 4: return this.etapaConfirmacao();
      default: return '';
    }
  }

  // ETAPA 1: Revisão do Carrinho
  etapaCarrinho() {
    const itensHtml = this.itens.map(item => `
      <div class="item-carrinho">
        <div class="item-info">
          <h6>${item.nome}</h6>
          <p class="item-preco">R$ ${item.preco.toFixed(2)}</p>
        </div>
        <button class="btn-remover" onclick="carrinho.removerItem(${item.id})">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `).join('');

    return `
      <h5><i class="fas fa-shopping-bag me-2"></i>Itens do Pedido</h5>
      <div class="lista-itens">
        ${itensHtml}
      </div>
      <div class="total-container">
        <span>Total:</span>
        <span class="total-valor">R$ ${this.calcularTotal().toFixed(2)}</span>
      </div>
      <div class="modal-acoes">
        <button class="btn-secundario" onclick="carrinho.fecharModal()">
          <i class="fas fa-arrow-left me-2"></i>Continuar Comprando
        </button>
        <button class="btn-primary" onclick="carrinho.proximaEtapa()">
          Próximo: Endereço
          <i class="fas fa-arrow-right ms-2"></i>
        </button>
      </div>
    `;
  }

  // ETAPA 2: Endereço de Entrega
  etapaEndereco() {
    const endereco = this.dadosCheckout.endereco;
    
    return `
      <h5><i class="fas fa-map-marker-alt me-2"></i>Endereço de Entrega</h5>
      <form id="form-endereco" class="form-checkout">
        <div class="form-row">
          <div class="form-group col-9">
            <label>CEP *</label>
            <input type="text" id="cep" maxlength="9" placeholder="00000-000" 
                   value="${endereco.cep || ''}" required>
          </div>
          <div class="form-group col-3">
            <label>&nbsp;</label>
            <button type="button" class="btn-buscar-cep" onclick="carrinho.buscarCEP()">
              <i>Buscar CEP</i>
            </button>
          </div>
        </div>
        
        <div class="form-group">
          <label>Rua *</label>
          <input type="text" id="rua" placeholder="Nome da rua" 
                 value="${endereco.rua || ''}" required>
        </div>
        
        <div class="form-row">
          <div class="form-group col-4">
            <label>Número *</label>
            <input type="text" id="numero" placeholder="123" 
                   value="${endereco.numero || ''}" required>
          </div>
          <div class="form-group col-8">
            <label>Complemento</label>
            <input type="text" id="complemento" placeholder="Apto, bloco, etc" 
                   value="${endereco.complemento || ''}">
          </div>
        </div>
        
        <div class="form-group">
          <label>Bairro *</label>
          <input type="text" id="bairro" placeholder="Bairro" 
                 value="${endereco.bairro || ''}" required>
        </div>
        
        <div class="form-row">
          <div class="form-group col-8">
            <label>Cidade *</label>
            <input type="text" id="cidade" placeholder="Cidade" 
                   value="${endereco.cidade || ''}" required>
          </div>
          <div class="form-group col-4">
            <label>UF *</label>
            <input type="text" id="uf" maxlength="2" placeholder="RS" 
                   value="${endereco.uf || ''}" required>
          </div>
        </div>
      </form>
      
      <div class="modal-acoes">
        <button class="btn-secundario" onclick="carrinho.voltarEtapa()">
          <i class="fas fa-arrow-left me-2"></i>Voltar
        </button>
        <button class="btn-primary" onclick="carrinho.salvarEndereco()">
          Próximo: Pagamento
          <i class="fas fa-arrow-right ms-2"></i>
        </button>
      </div>
    `;
  }

  // ETAPA 3: Forma de Pagamento
  etapaPagamento() {
    return `
      <h5><i class="fas fa-credit-card me-2"></i>Forma de Pagamento</h5>
      
      <div class="opcoes-pagamento">
        <button class="opcao-pagamento" onclick="carrinho.selecionarPagamento('pix')">
          <i class="fab fa-pix"></i>
          <span>PIX</span>
          <small>Aprovação instantânea</small>
        </button>
        
        <button class="opcao-pagamento" onclick="carrinho.selecionarPagamento('cartao')">
          <i class="fas fa-credit-card"></i>
          <span>Cartão</span>
          <small>Crédito ou Débito</small>
        </button>
      </div>
      
      <div id="form-pagamento-container"></div>
      
      <div class="modal-acoes">
        <button class="btn-secundario" onclick="carrinho.voltarEtapa()">
          <i class="fas fa-arrow-left me-2"></i>Voltar
        </button>
      </div>
    `;
  }

  // Formulário de Cartão
  formCartao() {
    return `
      <form id="form-cartao" class="form-checkout mt-3">
        <h6>Tipo de Cartão</h6>
        <div class="tipo-cartao-opcoes">
          <label class="radio-option">
            <input type="radio" name="tipo-cartao" value="credito" checked>
            <span><i class="fas fa-credit-card"></i> Crédito</span>
          </label>
          <label class="radio-option">
            <input type="radio" name="tipo-cartao" value="debito">
            <span><i class="fas fa-money-check"></i> Débito</span>
          </label>
        </div>
        
        <div class="form-group">
          <label>Número do Cartão *</label>
          <input type="text" id="numero-cartao" maxlength="19" 
                 placeholder="0000 0000 0000 0000" required>
        </div>
        
        <div class="form-group">
          <label>Nome no Cartão *</label>
          <input type="text" id="nome-cartao" placeholder="NOME COMPLETO" 
                 style="text-transform: uppercase" required>
        </div>
        
        <div class="form-row">
          <div class="form-group col-6">
            <label>Validade *</label>
            <input type="text" id="validade" maxlength="5" placeholder="MM/AA" required>
          </div>
          <div class="form-group col-6">
            <label>CVV *</label>
            <input type="text" id="cvv" maxlength="4" placeholder="123" required>
          </div>
        </div>
        
        <button type="button" class="btn-primary btn-block" onclick="carrinho.processarCartao()">
          <i class="fas fa-check me-2"></i>Confirmar Pagamento
        </button>
      </form>
    `;
  }

  // Formulário PIX
  formPix() {
    return `
      <div class="pix-container">
        <div class="qrcode-wrapper">
          <div id="qrcode"></div>
        </div>
        <p class="pix-instrucoes">
          <i class="fas fa-mobile-alt me-2"></i>
          Escaneie o QR Code com seu aplicativo de banco
        </p>
        <p class="pix-valor">Valor: R$ ${this.calcularTotal().toFixed(2)}</p>
        <div class="pix-aguardando">
          <div class="spinner"></div>
          <span>Aguardando pagamento...</span>
        </div>
      </div>
    `;
  }

  // ETAPA 4: Confirmação
  etapaConfirmacao() {
    const endereco = this.dadosCheckout.endereco;
    const pagamento = this.dadosCheckout.pagamento;
    
    return `
      <div class="confirmacao-sucesso">
        <i class="fas fa-check-circle"></i>
        <h4>Pedido Confirmado!</h4>
        <p>Seu pedido foi realizado com sucesso</p>
      </div>
      
      <div class="resumo-final">
        <h6><i class="fas fa-receipt me-2"></i>Resumo do Pedido</h6>
        <div class="resumo-itens">
          ${this.itens.map(item => `
            <div class="resumo-item">
              <span>${item.nome}</span>
              <span>R$ ${item.preco.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        <div class="resumo-total">
          <span>Total:</span>
          <span>R$ ${this.calcularTotal().toFixed(2)}</span>
        </div>
        
        <h6><i class="fas fa-map-marker-alt me-2"></i>Entrega</h6>
        <p class="endereco-resumo">
          ${endereco.rua}, ${endereco.numero}${endereco.complemento ? ' - ' + endereco.complemento : ''}<br>
          ${endereco.bairro} - ${endereco.cidade}/${endereco.uf}<br>
          CEP: ${endereco.cep}
        </p>
        
        <h6><i class="fas fa-credit-card me-2"></i>Pagamento</h6>
        <p>${pagamento.tipo === 'pix' ? 'PIX' : `Cartão de ${pagamento.tipoCartao}`}</p>
      </div>
      
      <div class="modal-acoes">
        <button class="btn-primary btn-block" onclick="carrinho.finalizarCompra()">
          <i class="fas fa-home me-2"></i>Voltar ao Início
        </button>
      </div>
    `;
  }

  // Métodos de navegação
  proximaEtapa() {
    if (this.etapaAtual < 4) {
      this.etapaAtual++;
      this.renderizarModal();
    }
  }

  voltarEtapa() {
    if (this.etapaAtual > 1) {
      this.etapaAtual--;
      this.renderizarModal();
    }
  }

  // Salvar endereço
  salvarEndereco() {
    const form = document.getElementById('form-endereco');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    this.dadosCheckout.endereco = {
      cep: document.getElementById('cep').value,
      rua: document.getElementById('rua').value,
      numero: document.getElementById('numero').value,
      complemento: document.getElementById('complemento').value,
      bairro: document.getElementById('bairro').value,
      cidade: document.getElementById('cidade').value,
      uf: document.getElementById('uf').value.toUpperCase()
    };

    this.proximaEtapa();
  }

  // Buscar CEP
  async buscarCEP() {
    const cep = document.getElementById('cep').value.replace(/\D/g, '');
    
    if (cep.length !== 8) {
      this.mostrarNotificacao('CEP inválido', 'error');
      return;
    }

    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const dados = await response.json();
      
      if (dados.erro) {
        this.mostrarNotificacao('CEP não encontrado', 'error');
        return;
      }

      document.getElementById('rua').value = dados.logradouro || '';
      document.getElementById('bairro').value = dados.bairro || '';
      document.getElementById('cidade').value = dados.localidade || '';
      document.getElementById('uf').value = dados.uf || '';
      
      this.mostrarNotificacao('CEP encontrado!', 'success');
    } catch (error) {
      this.mostrarNotificacao('Erro ao buscar CEP', 'error');
    }
  }

  // Selecionar forma de pagamento
  selecionarPagamento(tipo) {
    const container = document.getElementById('form-pagamento-container');
    
    if (tipo === 'pix') {
      container.innerHTML = this.formPix();
      
      // Gerar QR Code
      setTimeout(() => {
        const qrcodeDiv = document.getElementById('qrcode');
        if (qrcodeDiv && typeof QRCode !== 'undefined') {
          new QRCode(qrcodeDiv, {
            text: `PIX: R$ ${this.calcularTotal().toFixed(2)} - Pedido #${Date.now()}`,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
          });
        }
      }, 100);
      
      // Simular confirmação do pagamento após 5 segundos
      setTimeout(() => {
        this.dadosCheckout.pagamento = { tipo: 'pix' };
        this.proximaEtapa();
      }, 5000);
      
    } else {
      container.innerHTML = this.formCartao();
      this.aplicarMascarasCartao();
    }
  }

  // Processar pagamento com cartão
  processarCartao() {
    const form = document.getElementById('form-cartao');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const tipoCartao = document.querySelector('input[name="tipo-cartao"]:checked').value;
    
    this.dadosCheckout.pagamento = {
      tipo: 'cartao',
      tipoCartao: tipoCartao
    };

    this.mostrarNotificacao('Processando pagamento...', 'info');
    
    setTimeout(() => {
      this.proximaEtapa();
    }, 2000);
  }

  // Aplicar máscaras nos campos do cartão
  aplicarMascarasCartao() {
    const numeroCartao = document.getElementById('numero-cartao');
    const validade = document.getElementById('validade');
    const cvv = document.getElementById('cvv');
    const cep = document.getElementById('cep');

    if (numeroCartao) {
      numeroCartao.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
        e.target.value = value;
      });
    }

    if (validade) {
      validade.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
          value = value.slice(0, 2) + '/' + value.slice(2, 4);
        }
        e.target.value = value;
      });
    }

    if (cvv) {
      cvv.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/\D/g, '');
      });
    }

    if (cep) {
      cep.addEventListener('input', (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 5) {
          value = value.slice(0, 5) + '-' + value.slice(5, 8);
        }
        e.target.value = value;
      });
    }
  }

  // Finalizar compra
  finalizarCompra() {
    this.fecharModal();
    this.itens = [];
    this.etapaAtual = 1;
    this.dadosCheckout = { endereco: {}, pagamento: {} };
    this.atualizarContador();
    this.mostrarNotificacao('Obrigado pela compra!', 'success');
  }

  // Fechar modal
  fecharModal() {
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) {
      modalOverlay.classList.add('hidden');
    }
  }
}

// Instância global do carrinho
const carrinho = new CarrinhoCompras();

// Funções de compatibilidade com HTML existente
function adicionarAoCarrinho(nome, preco) {
  carrinho.adicionarItem(nome, preco);
}

function abrirModalPedidos() {
  carrinho.abrirCheckout();
}

// Animações CSS
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  @keyframes slideOutRight {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(100%);
      opacity: 0;
    }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .modal-content {
    max-height: 90vh;
    overflow-y: auto;
    border-radius: 15px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
  }

  .etapas-indicador {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px;
    background: #f8f9fa;
    border-bottom: 1px solid #dee2e6;
  }

  .etapa {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    flex: 1;
  }

  .etapa-numero {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #e9ecef;
    color: #6c757d;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    transition: all 0.3s;
  }

  .etapa.ativa .etapa-numero {
    background: #007bff;
    color: white;
  }

  .etapa.completa .etapa-numero {
    background: #28a745;
    color: white;
  }

  .etapa-label {
    font-size: 12px;
    color: #6c757d;
    text-align: center;
  }

  .etapa.ativa .etapa-label {
    color: #007bff;
    font-weight: bold;
  }

  .etapa-linha {
    flex: 1;
    height: 2px;
    background: #dee2e6;
    margin: 0 10px;
    transition: all 0.3s;
  }

  .etapa-linha.completa {
    background: #28a745;
  }

  .item-carrinho {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 15px;
    border: 1px solid #dee2e6;
    border-radius: 8px;
    margin-bottom: 10px;
    transition: all 0.3s;
  }

  .item-carrinho:hover {
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .item-info h6 {
    margin: 0 0 5px 0;
  }

  .item-preco {
    color: #28a745;
    font-weight: bold;
    margin: 0;
  }

  .btn-remover {
    background: #dc3545;
    color: white;
    border: none;
    padding: 8px 12px;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-remover:hover {
    background: #c82333;
  }

  .total-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 8px;
    margin: 20px 0;
    font-size: 1.2em;
    font-weight: bold;
  }

  .total-valor {
    color: #28a745;
  }

  .form-checkout {
    margin: 20px 0;
  }

  .form-row {
    display: flex;
    gap: 10px;
  }

  .form-group {
    margin-bottom: 15px;
    flex: 1;
  }

  .form-group.col-3 { flex: 0 0 25%; }
  .form-group.col-4 { flex: 0 0 33.333%; }
  .form-group.col-6 { flex: 0 0 50%; }
  .form-group.col-8 { flex: 0 0 66.666%; }
  .form-group.col-9 { flex: 0 0 75%; }

  .form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
    color: #495057;
  }

  .form-group input {
    width: 100%;
    padding: 10px;
    border: 1px solid #ced4da;
    border-radius: 5px;
    font-size: 14px;
    transition: all 0.3s;
  }

  .form-group input:focus {
    outline: none;
    border-color: #007bff;
    box-shadow: 0 0 0 0.2rem rgba(0,123,255,0.25);
  }

  .btn-buscar-cep {
    width: 100%;
    padding: 10px;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 5px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .btn-buscar-cep:hover {
    background: #0056b3;
  }

  .opcoes-pagamento {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin: 20px 0;
  }

  .opcao-pagamento {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 30px;
    background: white;
    border: 2px solid #dee2e6;
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .opcao-pagamento:hover {
    border-color: #007bff;
    transform: translateY(-5px);
    box-shadow: 0 5px 15px rgba(0,123,255,0.3);
  }

  .opcao-pagamento i {
    font-size: 2.5em;
    color: #007bff;
  }

  .opcao-pagamento span {
    font-weight: bold;
    font-size: 1.1em;
  }

  .opcao-pagamento small {
    color: #6c757d;
  }

  .tipo-cartao-opcoes {
    display: flex;
    gap: 15px;
    margin: 15px 0;
  }

  .radio-option {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 15px;
    border: 2px solid #dee2e6;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s;
  }

  .radio-option:hover {
    border-color: #007bff;
  }

  .radio-option input[type="radio"] {
    width: auto;
  }

  .radio-option input[type="radio"]:checked + span {
    color: #007bff;
    font-weight: bold;
  }

  .pix-container {
    text-align: center;
    padding: 30px;
  }

  .qrcode-wrapper {
    display: flex;
    justify-content: center;
    margin: 20px 0;
    padding: 20px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  }

  #qrcode {
    display: inline-block;
  }

  .pix-instrucoes {
    font-size: 16px;
    color: #495057;
    margin: 15px 0;
  }

  .pix-valor {
    font-size: 24px;
    font-weight: bold;
    color: #28a745;
    margin: 10px 0;
  }

  .pix-aguardando {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 20px;
    color: #007bff;
  }

  .spinner {
    width: 20px;
    height: 20px;
    border: 3px solid #f3f3f3;
    border-top: 3px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .confirmacao-sucesso {
    text-align: center;
    padding: 30px;
  }

  .confirmacao-sucesso i {
    font-size: 4em;
    color: #28a745;
    margin-bottom: 15px;
  }

  .confirmacao-sucesso h4 {
    color: #28a745;
    margin: 10px 0;
  }

  .confirmacao-sucesso p {
    color: #6c757d;
  }

  .resumo-final {
    background: #f8f9fa;
    padding: 20px;
    border-radius: 10px;
    margin: 20px 0;
  }

  .resumo-final h6 {
    margin: 15px 0 10px 0;
    color: #495057;
  }

  .resumo-itens {
    margin-bottom: 15px;
  }

  .resumo-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #dee2e6;
  }

  .resumo-total {
    display: flex;
    justify-content: space-between;
    padding: 15px 0;
    font-size: 1.3em;
    font-weight: bold;
    border-top: 2px solid #28a745;
    color: #28a745;
  }

  .endereco-resumo {
    line-height: 1.6;
    color: #495057;
  }

  .modal-acoes {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid #dee2e6;
  }

  .btn-primary,
  .btn-secundario {
    flex: 1;
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .btn-primary {
    background: #007bff;
    color: white;
  }

  .btn-primary:hover {
    background: #0056b3;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,123,255,0.4);
  }

  .btn-secundario {
    background: #6c757d;
    color: white;
  }

  .btn-secundario:hover {
    background: #545b62;
  }

  .btn-block {
    width: 100%;
  }

  .hidden {
    display: none !important;
  }

  /* Responsividade Mobile */
  @media (max-width: 768px) {
    .modal-content {
      width: 95vw;
      max-height: 95vh;
      margin: 2.5vh auto;
    }

    .etapas-indicador {
      padding: 15px 10px;
    }

    .etapa {
      min-width: 60px;
    }

    .etapa-numero {
      width: 32px;
      height: 32px;
      font-size: 14px;
    }

    .etapa-label {
      font-size: 10px;
    }

    .etapa-linha {
      margin: 0 5px;
    }

    .form-row {
      flex-direction: column;
    }

    .form-group.col-3,
    .form-group.col-4,
    .form-group.col-6,
    .form-group.col-8,
    .form-group.col-9 {
      flex: 1;
      width: 100%;
    }

    .opcoes-pagamento {
      grid-template-columns: 1fr;
    }

    .opcao-pagamento {
      padding: 20px;
    }

    .tipo-cartao-opcoes {
      flex-direction: column;
    }

    .modal-acoes {
      flex-direction: column;
    }

    .btn-primary,
    .btn-secundario {
      width: 100%;
    }

    .notificacao {
      top: 10px !important;
      right: 10px !important;
      left: 10px !important;
      max-width: calc(100vw - 20px) !important;
    }

    .qrcode-wrapper {
      padding: 15px;
    }

    #qrcode {
      transform: scale(0.8);
    }

    .confirmacao-sucesso i {
      font-size: 3em;
    }

    .total-container {
      font-size: 1em;
    }

    .resumo-total {
      font-size: 1.1em;
    }
  }

  /* Tablets */
  @media (max-width: 1024px) and (min-width: 769px) {
    .modal-content {
      width: 80vw;
    }

    .etapas-indicador {
      padding: 18px;
    }

    .opcoes-pagamento {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  /* Desktop Large */
  @media (min-width: 1400px) {
    .modal-content {
      max-width: 900px;
    }
  }

  /* Melhorias de acessibilidade */
  .btn-primary:focus,
  .btn-secundario:focus,
  .opcao-pagamento:focus,
  input:focus {
    outline: 2px solid #007bff;
    outline-offset: 2px;
  }

  /* Animação de loading suave */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .modal-body {
    animation: fadeIn 0.3s ease;
  }

  /* Scroll suave no modal */
  .modal-content {
    scroll-behavior: smooth;
  }

  .modal-content::-webkit-scrollbar {
    width: 8px;
  }

  .modal-content::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 10px;
  }

  .modal-content::-webkit-scrollbar-thumb {
    background: #888;
    border-radius: 10px;
  }

  .modal-content::-webkit-scrollbar-thumb:hover {
    background: #555;
  }

  /* Estados de validação */
  input:invalid:not(:placeholder-shown) {
    border-color: #dc3545;
  }

  input:valid:not(:placeholder-shown) {
    border-color: #28a745;
  }

  /* Efeito hover melhorado */
  .item-carrinho,
  .opcao-pagamento,
  .radio-option {
    position: relative;
    overflow: hidden;
  }

  .item-carrinho::before,
  .opcao-pagamento::before,
  .radio-option::before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(0,123,255,0.1);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }

  .item-carrinho:hover::before,
  .opcao-pagamento:hover::before,
  .radio-option:hover::before {
    width: 300px;
    height: 300px;
  }
`;

document.head.appendChild(style);

// ========================================
// CARROSSEL DE IMAGENS - VERSÃO SIMPLES
// ========================================
function inicializarCarrossel() {
  const track = document.getElementById('carousel-track');
  const btnPrev = document.getElementById('prevBtn');
  const btnNext = document.getElementById('nextBtn');
  
  if (!track || !btnPrev || !btnNext) return;
  
  let currentIndex = 0;
  const slides = track.querySelectorAll('.carousel-slide');
  const totalSlides = slides.length;
  let autoPlayInterval;
  
  function updateCarousel(smooth = true) {
    track.style.transition = smooth ? 'transform 0.5s ease-in-out' : 'none';
    const offset = -currentIndex * 100;
    track.style.transform = `translateX(${offset}%)`;
  }
  
  function irParaProximo() {
    currentIndex++;
    updateCarousel();
    
    // Loop infinito: volta pro início quando chegar no fim
    if (currentIndex >= totalSlides) {
      setTimeout(() => {
        currentIndex = 0;
        updateCarousel(false);
      }, 500);
    }
  }
  
  function irParaAnterior() {
    if (currentIndex === 0) {
      // Pula pro final instantaneamente e volta uma
      currentIndex = totalSlides;
      updateCarousel(false);
      setTimeout(() => {
        currentIndex = totalSlides - 1;
        updateCarousel();
      }, 20);
    } else {
      currentIndex--;
      updateCarousel();
    }
  }
  
  function startAutoPlay() {
    autoPlayInterval = setInterval(() => {
      irParaProximo();
    }, 5000);
  }
  
  function resetAutoPlay() {
    clearInterval(autoPlayInterval);
    startAutoPlay();
  }
  
  // Eventos dos botões
  btnNext.addEventListener('click', () => {
    irParaProximo();
    resetAutoPlay();
  });
  
  btnPrev.addEventListener('click', () => {
    irParaAnterior();
    resetAutoPlay();
  });
  
  // Inicializa
  updateCarousel(false);
  startAutoPlay();
}

// Inicializa o carrossel
inicializarCarrossel();

// ========================================
// MENU MOBILE
// ========================================
function inicializarMenuMobile() {
  const menuToggle = document.getElementById('menu-toggle');
  const navbarMenu = document.getElementById('navbar-menu');
  
  if (menuToggle && navbarMenu) {
    // Toggle do menu
    menuToggle.addEventListener('click', () => {
      navbarMenu.classList.toggle('active');
      const icon = menuToggle.querySelector('i');
      icon.classList.toggle('fa-bars');
      icon.classList.toggle('fa-times');
    });
    
    // Fechar menu ao clicar nos links
    const navLinks = navbarMenu.querySelectorAll('a');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navbarMenu.classList.remove('active');
        const icon = menuToggle.querySelector('i');
        icon.classList.remove('fa-times');
        icon.classList.add('fa-bars');
        
        // Rolar para o topo suavemente
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
    });
  }
}

// ========================================
// BUSCA DE PRODUTOS
// ========================================
function inicializarBusca() {
  const inputPesquisa = document.getElementById('input-pesquisa');
  const listaProdutos = document.getElementById('lista-produtos');
  
  if (!inputPesquisa || !listaProdutos) return;
  
  inputPesquisa.addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase().trim();
    const cards = listaProdutos.querySelectorAll('.card');
    
    cards.forEach(card => {
      const titulo = card.querySelector('.card-title').textContent.toLowerCase();
      const descricao = card.querySelector('.card-text').textContent.toLowerCase();
      
      if (titulo.includes(termo) || descricao.includes(termo)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  });
}

// ========================================
// FORMULÁRIO DE CONTATO
// ========================================
function inicializarFormularioContato() {
  const formContato = document.getElementById('form-contato');
  
  if (formContato) {
    formContato.addEventListener('submit', (e) => {
      e.preventDefault();
      mostrarNotificacao('Mensagem enviada com sucesso! Entraremos em contato em breve.', 'success');
      formContato.reset();
    });
  }
}

// ========================================
// EVENT LISTENERS
// ========================================
function inicializarEventListeners() {
  // Botões de adicionar ao carrinho
  document.addEventListener('click', (e) => {
    if (e.target.closest('.btn-comprar')) {
      const btn = e.target.closest('.btn-comprar');
      const item = btn.dataset.item;
      const preco = btn.dataset.preco;
      adicionarAoCarrinho(item, preco);
    }
  });
  
  // Link de pedidos
  const linkPedidos = document.getElementById('link-pedidos');
  if (linkPedidos) {
    linkPedidos.addEventListener('click', (e) => {
      e.preventDefault();
      abrirModalPedidos();
    });
  }
  
  // Fechar modal ao clicar fora
  const modalOverlay = document.getElementById('modal-overlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        fecharModal();
      }
    });
  }
}

// ========================================
// ANIMAÇÕES CSS ADICIONAIS
// ========================================
function adicionarAnimacoes() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
    
    .btn-comprar {
      transition: all 0.3s ease;
    }
    
    .btn-comprar:active {
      transform: scale(0.95);
    }
    
    .card {
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .card:hover {
      transform: translateY(-5px);
    }
  `;
  document.head.appendChild(style);
}

// ========================================
// INICIALIZAÇÃO
// ========================================
document.addEventListener('DOMContentLoaded', () => {
  inicializarCarrossel();
  inicializarMenuMobile();
  inicializarBusca();
  inicializarFormularioContato();
  inicializarEventListeners();
  adicionarAnimacoes();
  atualizarContador();
  
  console.log('🍔 Sistema de Delivery inicializado com sucesso!');
});

function inicializarMapa() {
  setTimeout(() => {
    if (typeof ol === 'undefined') {
      console.error('❌ OpenLayers não carregou');
      return;
    }

    const mapElement = document.getElementById('map');
    if (!mapElement) {
      console.error('❌ Elemento #map não encontrado');
      return;
    }

    try {
      // Coordenadas de Rio Grande, RS
      const coords = ol.proj.fromLonLat([-52.0986, -32.0350]);

      // Criar mapa SEM controles
      const map = new ol.Map({
        target: 'map',
        layers: [
          new ol.layer.Tile({
            source: new ol.source.OSM()
          })
        ],
        view: new ol.View({
          center: coords,
          zoom: 15,
          minZoom: 12,
          maxZoom: 18
        }),
        controls: [] // ← SEM CONTROLES!
      });

// Adicionar marcador personalizado
const marker = new ol.Feature({
  geometry: new ol.geom.Point(coords)
});

marker.setStyle(new ol.style.Style({
  image: new ol.style.Icon({
    anchor: [0.5, 1],
    // A cor foi alterada de %23FF6B35 para %23FFC400
    src: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="30" height="36" viewBox="0 0 32 48"><path fill="%23FFC400" d="M16 0C7.2 0 0 7.2 0 16c0 13 16 32 16 32s16-19 16-32c0-8.8-7.2-16-16-16z"/><circle cx="16" cy="16" r="6" fill="white"/></svg>',
    scale: 1.2
  })
}));

const vectorLayer = new ol.layer.Vector({
  source: new ol.source.Vector({
    features: [marker]
  })
});


      map.addLayer(vectorLayer);

      // Cursor pointer ao passar sobre o marcador
      map.on('pointermove', (evt) => {
        const hit = map.hasFeatureAtPixel(evt.pixel);
        map.getTargetElement().style.cursor = hit ? 'pointer' : '';
      });

      console.log('✅ Mapa limpo inicializado!');

    } catch (error) {
      console.error('❌ Erro ao criar mapa:', error);
    }
  }, 500);
}

document.addEventListener('DOMContentLoaded', () => {
  // ... suas outras funções ...
  inicializarMapa(); // ← Adicione essa linha
});