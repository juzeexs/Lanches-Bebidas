// VARIÁVEL GLOBAL PARA O CARRINHO
let carrinho = [];

// ===================================
// FUNÇÕES DE MANIPULAÇÃO DO CARRINHO
// ===================================

/**
 * Adiciona um item ao carrinho ou aumenta a quantidade se já existir.
 * @param {string} nome - Nome do produto.
 * @param {number} preco - Preço do produto.
 */
function adicionarAoCarrinho(nome, preco) {
    // Tenta encontrar o item no carrinho
    const itemExistente = carrinho.find(item => item.nome === nome);

    if (itemExistente) {
        // Se existir, aumenta a quantidade
        itemExistente.quantidade++;
    } else {
        // Se não existir, adiciona como novo item
        carrinho.push({
            nome: nome,
            preco: preco,
            quantidade: 1
        });
    }

    // Atualiza o contador e renderiza o modal
    atualizarContadorPedidos();
    // Verifica se o modal está aberto antes de tentar renderizar, para evitar erros
    if (document.getElementById('modal-overlay') && !document.getElementById('modal-overlay').classList.contains('hidden')) {
        renderizarPedidosModal();
    }
}

/**
 * Remove um item completamente do carrinho.
 * @param {string} nome - Nome do produto a ser removido.
 */
function removerItem(nome) {
    carrinho = carrinho.filter(item => item.nome !== nome);
    atualizarContadorPedidos();
    renderizarPedidosModal();
}

/**
 * Ajusta a quantidade de um item específico no carrinho.
 * @param {string} nome - Nome do produto.
 * @param {number} delta - Valor a ser adicionado ou subtraído da quantidade (+1 ou -1).
 */
function ajustarQuantidade(nome, delta) {
    const item = carrinho.find(item => item.nome === nome);

    if (item) {
        item.quantidade += delta;

        // Se a quantidade cair para 0 ou menos, remove o item
        if (item.quantidade <= 0) {
            removerItem(nome);
            return; // Sai da função para evitar chamar a renderização duas vezes se remover
        }
    }

    atualizarContadorPedidos();
    renderizarPedidosModal();
}

/**
 * Calcula e retorna o total do carrinho.
 * @returns {number} O valor total de todos os itens no carrinho.
 */
function calcularTotal() {
    return carrinho.reduce((total, item) => total + (item.preco * item.quantidade), 0);
}

/**
 * Atualiza o número de itens totais exibidos no ícone do carrinho.
 */
function atualizarContadorPedidos() {
    const contador = document.getElementById('contador-pedidos');
    if (!contador) return; // Garante que o elemento existe
    
    // Soma a quantidade de todos os itens no carrinho
    const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
    contador.textContent = totalItens;
}

// ===================================
// FUNÇÕES DE RENDERIZAÇÃO E MODAL
// ===================================

/**
 * Cria e exibe o modal de pedidos (carrinho).
 */
function exibirModalPedidos() {
    const overlay = document.getElementById('modal-overlay');
    
    if (!overlay) {
        console.error("Elemento '#modal-overlay' não encontrado. Verifique seu HTML.");
        return;
    }

    // Cria o corpo principal do modal
    const modal = document.createElement('div');
    modal.classList.add('modal-content');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('role', 'dialog');

    // Cabeçalho do modal
    modal.innerHTML = `
        <div class="modal-header">
            <h3 class="modal-title"><i class="fas fa-shopping-cart me-2"></i>Seus Pedidos</h3>
            <button class="close-button" id="fechar-modal" aria-label="Fechar Modal">&times;</button>
        </div>
        <div class="modal-body" id="corpo-modal-pedidos">
            </div>
        <div class="modal-footer">
            <p class="total-carrinho" id="total-carrinho">Total: R$ 0,00</p>
            <button class="btn btn-finalizar" id="btn-finalizar-pedido" disabled>
                <i class="fas fa-motorcycle me-2"></i>Finalizar Pedido
            </button>
        </div>
    `;

    // Limpa o overlay e anexa o novo modal
    overlay.innerHTML = '';
    overlay.appendChild(modal);
    overlay.classList.remove('hidden');
    
    // Adiciona evento para fechar o modal
    document.getElementById('fechar-modal').addEventListener('click', fecharModal);

    // Adiciona evento para finalizar o pedido
    document.getElementById('btn-finalizar-pedido').addEventListener('click', exibirFormularioFinalizacao);

    // Renderiza o conteúdo do carrinho
    renderizarPedidosModal();
}

/**
 * Preenche o corpo do modal com os itens do carrinho.
 */
function renderizarPedidosModal() {
    const corpoModal = document.getElementById('corpo-modal-pedidos');
    const totalElement = document.getElementById('total-carrinho');
    const btnFinalizar = document.getElementById('btn-finalizar-pedido');
    
    if (!corpoModal || !totalElement || !btnFinalizar) return; // Garante que os elementos existem

    const total = calcularTotal();

    // Atualiza o total
    totalElement.textContent = `Total: R$ ${total.toFixed(2).replace('.', ',')}`;
    
    // Habilita/Desabilita o botão de finalização
    btnFinalizar.disabled = carrinho.length === 0;

    if (carrinho.length === 0) {
        corpoModal.innerHTML = '<p class="text-center mt-4">Seu carrinho está vazio. Adicione alguns lanches! 🍔🍟</p>';
        return;
    }

    // Cria a lista de itens
    let htmlItens = '<ul class="lista-carrinho">';
    carrinho.forEach(item => {
        const subtotal = (item.preco * item.quantidade).toFixed(2).replace('.', ',');
        htmlItens += `
            <li class="item-carrinho">
                <span class="item-nome">${item.nome}</span>
                <span class="item-preco">R$ ${item.preco.toFixed(2).replace('.', ',')}</span>
                <div class="item-controles">
                    <button class="btn btn-qty" data-acao="diminuir" data-nome="${item.nome}">-</button>
                    <span class="item-quantidade">${item.quantidade}</span>
                    <button class="btn btn-qty" data-acao="aumentar" data-nome="${item.nome}">+</button>
                </div>
                <span class="item-subtotal">Subtotal: R$ ${subtotal}</span>
                <button class="btn btn-remover" data-nome="${item.nome}" aria-label="Remover item">&times;</button>
            </li>
        `;
    });
    htmlItens += '</ul>';

    corpoModal.innerHTML = htmlItens;

    // Adiciona event listeners aos botões de controle de quantidade e remoção
    corpoModal.querySelectorAll('.btn-qty').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const nome = e.currentTarget.dataset.nome;
            const acao = e.currentTarget.dataset.acao;
            if (acao === 'aumentar') {
                ajustarQuantidade(nome, 1);
            } else if (acao === 'diminuir') {
                ajustarQuantidade(nome, -1);
            }
        });
    });

    corpoModal.querySelectorAll('.btn-remover').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const nome = e.currentTarget.dataset.nome;
            removerItem(nome);
        });
    });
}

/**
 * Fecha o modal.
 */
function fecharModal() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.innerHTML = ''; // Limpa o conteúdo
}

/**
 * Muda o conteúdo do modal para o formulário de finalização.
 */
function exibirFormularioFinalizacao() {
    const corpoModal = document.getElementById('corpo-modal-pedidos');
    const footerModal = document.querySelector('.modal-footer');

    if (!corpoModal || !footerModal) return;

    // Desativa o botão de finalizar (ele será substituído por um botão de envio do form)
    footerModal.style.display = 'none';

    corpoModal.innerHTML = `
        <h4>Detalhes da Entrega e Pagamento</h4>
        <form id="form-finalizacao" class="form-finalizacao">
            <div class="form-group">
                <label for="nome-cliente">Nome Completo:</label>
                <input type="text" id="nome-cliente" class="form-control" required>
            </div>
            <div class="form-group">
                <label for="endereco">Endereço de Entrega:</label>
                <input type="text" id="endereco" class="form-control" placeholder="Rua, Número, Bairro" required>
            </div>
            <div class="form-group">
                <label for="complemento">Complemento/Referência:</label>
                <input type="text" id="complemento" class="form-control" placeholder="Apto, Casa 2, Próximo ao parque">
            </div>
            <div class="form-group">
                <label for="telefone">Telefone:</label>
                <input type="tel" id="telefone" class="form-control" placeholder="(DD) 99999-9999" required>
            </div>
            <div class="form-group">
                <label for="pagamento">Forma de Pagamento:</label>
                <select id="pagamento" class="form-control" required>
                    <option value="" disabled selected>Selecione</option>
                    <option value="pix">Pix (Pagamento Rápido)</option>
                    <option value="cartao-credito">Cartão de Crédito/Débito (na entrega)</option>
                    <option value="dinheiro">Dinheiro (levar troco?)</option>
                </select>
            </div>
            <div class="form-group troco-group hidden">
                <label for="troco">Precisa de troco para quanto?</label>
                <input type="number" id="troco" class="form-control" placeholder="Ex: R$ 50,00" step="0.01">
            </div>
            <p class="total-final">Total do Pedido: <span class="text-warning">R$ ${calcularTotal().toFixed(2).replace('.', ',')}</span></p>
            <button type="submit" class="btn btn-comprar w-100 mt-3">
                <i class="fas fa-check-circle me-2"></i>Confirmar e Enviar Pedido
            </button>
        </form>
    `;

    // Adiciona listener para mostrar/esconder campo de troco
    document.getElementById('pagamento').addEventListener('change', (e) => {
        const trocoGroup = document.querySelector('.troco-group');
        const inputTroco = document.getElementById('troco');
        if (!trocoGroup || !inputTroco) return;

        if (e.target.value === 'dinheiro') {
            trocoGroup.classList.remove('hidden');
            inputTroco.required = true;
        } else {
            trocoGroup.classList.add('hidden');
            inputTroco.required = false;
        }
    });

    // Adiciona listener para o envio do formulário
    document.getElementById('form-finalizacao').addEventListener('submit', finalizarPedido);
}

/**
 * Processa a finalização do pedido, gera o resumo e o QR Code.
 * @param {Event} e - Evento de submissão do formulário.
 */
function finalizarPedido(e) {
    e.preventDefault();

    // Coleta os dados do formulário
    const nomeCliente = document.getElementById('nome-cliente').value;
    const endereco = document.getElementById('endereco').value;
    const complemento = document.getElementById('complemento').value;
    const telefone = document.getElementById('telefone').value;
    const pagamento = document.getElementById('pagamento').value;
    const troco = document.getElementById('troco').value;
    const total = calcularTotal();

    // Monta o resumo do pedido
    const resumoItens = carrinho.map(item => 
        `${item.quantidade}x ${item.nome} (R$ ${item.preco.toFixed(2).replace('.', ',')} cada)`
    ).join('\n');

    let resumoPedido = `*=====================================*\n`;
    resumoPedido += `|         ✨ PEDIDO DE DELIVERY ✨      |\n`;
    resumoPedido += `*=====================================*\n`;
    resumoPedido += `\n*CLIENTE:*\n`;
    resumoPedido += `${nomeCliente}\n`;
    resumoPedido += `\n*ENDEREÇO DE ENTREGA:*\n`;
    resumoPedido += `${endereco}`;
    if (complemento) {
        resumoPedido += ` - Comp: ${complemento}\n`;
    } else {
        resumoPedido += `\n`;
    }
    resumoPedido += `*TELEFONE:*\n`;
    resumoPedido += `${telefone}\n`;
    resumoPedido += `\n*FORMA DE PAGAMENTO:*\n`;
    resumoPedido += `${pagamento.toUpperCase().replace('-', ' ')}`;
    if (pagamento === 'dinheiro' && troco) {
        resumoPedido += ` - *TROCO PARA:* R$ ${parseFloat(troco).toFixed(2).replace('.', ',')}`;
    }
    resumoPedido += `\n\n*ITENS DO PEDIDO (${carrinho.reduce((acc, item) => acc + item.quantidade, 0)} itens):*\n`;
    resumoPedido += resumoItens;
    resumoPedido += `\n\n*TOTAL FINAL: R$ ${total.toFixed(2).replace('.', ',')}*\n`;
    resumoPedido += `\n*=====================================*\n`;
    resumoPedido += `*Aguarde a confirmação do nosso delivery!*`;


    // Exibe a tela de confirmação/QR Code
    exibirConfirmacao(resumoPedido, total);
}

/**
 * Exibe a tela de confirmação com o resumo do pedido e QR Code (simulação).
 * @param {string} resumoPedido - O texto formatado do resumo do pedido.
 * @param {number} total - O valor total do pedido.
 */
function exibirConfirmacao(resumoPedido, total) {
    const corpoModal = document.getElementById('corpo-modal-pedidos');
    const modalContent = document.querySelector('.modal-content');
    const footerModal = document.querySelector('.modal-footer');
    
    if (!corpoModal || !modalContent) return;

    // Esconde o footer (se não estiver escondido)
    if (footerModal) footerModal.style.display = 'none';

    // Cria o HTML de confirmação
    corpoModal.innerHTML = `
        <div class="confirmacao-pedido text-center">
            <i class="fas fa-check-circle text-success mb-3" style="font-size: 4rem;"></i>
            <h3>Pedido Recebido com Sucesso!</h3>
            <p class="lead">Obrigado pela sua preferência. Seu pedido será preparado.</p>
            <div class="resumo-box mb-4">
                <p><strong>Total:</strong> <span class="text-warning">R$ ${total.toFixed(2).replace('.', ',')}</span></p>
                <p>Você pode copiar o resumo abaixo para acompanhar:</p>
                <textarea class="form-control" rows="8" readonly>${resumoPedido}</textarea>
            </div>
            
            <h4>Status do Pedido:</h4>
            <div id="qrcode" class="qrcode-container"></div>
            <p class="mt-2 text-muted">Use o QR Code abaixo para uma simulação de rastreamento (simulação).</p>
        </div>
        <button class="btn btn-finalizar mt-3" onclick="window.location.reload();">
            <i class="fas fa-undo me-2"></i>Voltar ao Cardápio
        </button>
    `;

    // Redimensiona o modal para a nova tela
    modalContent.style.maxWidth = '500px';

    // Gera o QR Code (usando o resumo do pedido como conteúdo)
    // ATENÇÃO: A CLASSE 'QRCode' PRECISA SER INCLUÍDA NO SEU HTML VIA TAG <SCRIPT>!
    if (typeof QRCode !== 'undefined') {
        new QRCode(document.getElementById("qrcode"), {
            text: resumoPedido,
            width: 128,
            height: 128,
            colorDark: "#333333",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });
    } else {
        document.getElementById("qrcode").innerHTML = '<p class="text-danger">Biblioteca QR Code não carregada. Verifique o HTML.</p>';
        console.error("A biblioteca 'qrcode.js' não está carregada. O QR Code não será gerado.");
    }

    // Limpa o carrinho após a finalização
    carrinho = [];
    atualizarContadorPedidos();
}

// ===================================
// FUNÇÕES DE UTILIDADE E INICIALIZAÇÃO
// ===================================

/**
 * Função de pesquisa/filtro de produtos.
 */
function filtrarProdutos() {
    const input = document.getElementById('input-pesquisa');
    const listaProdutos = document.getElementById('lista-produtos');

    if (!input || !listaProdutos) return;

    const filtro = input.value.toLowerCase();
    const cards = listaProdutos.querySelectorAll('.card');

    cards.forEach(card => {
        const titulo = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
        const texto = card.querySelector('.card-text')?.textContent.toLowerCase() || '';
        
        // Exibe o card se o filtro corresponder ao título ou ao texto
        if (titulo.includes(filtro) || texto.includes(filtro)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// ===================================
// LÓGICA DO CARROSSEL INFINITO (INTEGRADA)
// ===================================

function inicializarCarrossel() {
    const track = document.querySelector('.carousel-track');
    const slides = Array.from(document.querySelectorAll('.carousel-slide'));
    const buttons = document.querySelectorAll('.carousel-btn');

    if (!track || slides.length === 0) {
        // console.log("Carrossel não encontrado ou sem slides. Ignorando inicialização.");
        return; // Sai se os elementos do carrossel não existirem
    }
    
    const slideCount = slides.length;
    let currentSlideIndex = 0;
    
    // Adiciona a propriedade transition-duration para animação suave
    track.style.transitionDuration = '0.5s'; 
    track.style.transitionTimingFunction = 'ease-in-out';

    // Função principal para mover o carrossel
    const moveToSlide = (newIndex) => {
        // Lógica MÓDULO (%) para loop infinito
        currentSlideIndex = (newIndex % slideCount + slideCount) % slideCount;
        
        const offset = -(currentSlideIndex * 100);
        
        // Aplica a transformação
        track.style.transform = `translateX(${offset}%)`;
    };

    // Adiciona event listeners aos botões
    buttons.forEach(button => {
        button.addEventListener('click', e => {
            const target = e.currentTarget.dataset.target;
            let newIndex = currentSlideIndex;

            if (target === 'next') {
                newIndex++;
            } else if (target === 'prev') {
                newIndex--;
            }

            moveToSlide(newIndex);
        });
    });
}

// ===================================
// FUNÇÃO DE INICIALIZAÇÃO PRINCIPAL
// ===================================

/**
 * Configura todos os event listeners ao carregar a página.
 */
function inicializarEventos() {
    // 1. Inicializa a lógica do Carrossel (SE EXISTIR)
    inicializarCarrossel();
    
    // 2. Listeners para adicionar ao carrinho
    document.querySelectorAll('.btn-comprar').forEach(button => {
        button.addEventListener('click', (e) => {
            const nome = e.currentTarget.dataset.item;
            // Garante que o preço seja um número (parse para float)
            const preco = parseFloat(e.currentTarget.dataset.preco); 
            
            if (isNaN(preco)) {
                console.error("Preço do item é inválido:", e.currentTarget.dataset.preco);
                return;
            }

            adicionarAoCarrinho(nome, preco);
            
            // Feedback visual (opcional)
            e.currentTarget.innerHTML = '<i class="fas fa-check me-2"></i>Adicionado!';
            setTimeout(() => {
                e.currentTarget.innerHTML = '<i class="fas fa-cart-plus me-2"></i>Adicionar';
            }, 800);
        });
    });

    // 3. Listener para abrir o modal de pedidos
    const linkPedidos = document.getElementById('link-pedidos');
    if (linkPedidos) {
        linkPedidos.addEventListener('click', (e) => {
            e.preventDefault();
            exibirModalPedidos();
        });
    }

    // 4. Listener para o botão de toggle do menu (mobile)
    const toggleButton = document.getElementById('menu-toggle');
    const navbarMenu = document.getElementById('navbar-menu');
    if (toggleButton && navbarMenu) {
        toggleButton.addEventListener('click', () => {
            navbarMenu.classList.toggle('active');
        });
    }

    // 5. Listener para a pesquisa
    const inputPesquisa = document.getElementById('input-pesquisa');
    if (inputPesquisa) {
        inputPesquisa.addEventListener('keyup', filtrarProdutos);
    }
    
    // 6. NOVO: Listener para fechar o menu ao clicar em um link (para mobile)
    // Presume-se que os links da nav estão dentro de '#navbar-menu' e que eles têm a classe 'nav-link'
    const navLinks = document.querySelectorAll('#navbar-menu a.nav-link');
    if (navLinks.length > 0 && navbarMenu) {
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                // Remove a classe 'active' para fechar o menu, fazendo o 'sanduíche' subir.
                navbarMenu.classList.remove('active'); 
            });
        });
    }
    
    // Inicializa o contador
    atualizarContadorPedidos();
}

// Inicializa os eventos quando o DOM estiver completamente carregado
document.addEventListener('DOMContentLoaded', inicializarEventos);