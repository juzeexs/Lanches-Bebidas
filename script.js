let carrinho = [];



/**
 * 
 * @param {string} nome 
 * @param {number} preco 
 */
function adicionarAoCarrinho(nome, preco) {
    const itemExistente = carrinho.find(item => item.nome === nome);

    if (itemExistente) {
        itemExistente.quantidade++;
    } else {
        carrinho.push({
            nome: nome,
            preco: preco,
            quantidade: 1
        });
    }

    atualizarContadorPedidos();
    if (document.getElementById('modal-overlay') && !document.getElementById('modal-overlay').classList.contains('hidden')) {
        renderizarPedidosModal();
    }
}

/**
 * 
 * @param {string} nome 
 */
function removerItem(nome) {
    carrinho = carrinho.filter(item => item.nome !== nome);
    atualizarContadorPedidos();
    renderizarPedidosModal();
}

/**
 * 
 * @param {string} nome 
 * @param {number} delta 
 */
function ajustarQuantidade(nome, delta) {
    const item = carrinho.find(item => item.nome === nome);

    if (item) {
        item.quantidade += delta;

        if (item.quantidade <= 0) {
            removerItem(nome);
            return;
        }
    }

    atualizarContadorPedidos();
    renderizarPedidosModal();
}

/**
 * 
 * @returns {number}
 */
function calcularTotal() {
    return carrinho.reduce((total, item) => total + (item.preco * item.quantidade), 0);
}

function atualizarContadorPedidos() {
    const contador = document.getElementById('contador-pedidos');
    if (!contador) return;
    
    const totalItens = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
    contador.textContent = totalItens;
}


 
function exibirModalPedidos() {
    const overlay = document.getElementById('modal-overlay');
    
    if (!overlay) {
        console.error("Elemento '#modal-overlay' não encontrado. Verifique seu HTML.");
        return;
    }

    const modal = document.createElement('div');
    modal.classList.add('modal-content');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('role', 'dialog');

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

    overlay.innerHTML = '';
    overlay.appendChild(modal);
    overlay.classList.remove('hidden');
    document.getElementById('fechar-modal').addEventListener('click', fecharModal);

    document.getElementById('btn-finalizar-pedido').addEventListener('click', exibirFormularioFinalizacao);

    renderizarPedidosModal();
}


function renderizarPedidosModal() {
    const corpoModal = document.getElementById('corpo-modal-pedidos');
    const totalElement = document.getElementById('total-carrinho');
    const btnFinalizar = document.getElementById('btn-finalizar-pedido');
    
    if (!corpoModal || !totalElement || !btnFinalizar) return; 

    const total = calcularTotal();

    totalElement.textContent = `Total: R$ ${total.toFixed(2).replace('.', ',')}`;
    
    btnFinalizar.disabled = carrinho.length === 0;

    if (carrinho.length === 0) {
        corpoModal.innerHTML = '<p class="text-center mt-4">Seu carrinho está vazio. Adicione alguns lanches! 🍔🍟</p>';
        return;
    }

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
 * 
 */
function fecharModal() {
    const overlay = document.getElementById('modal-overlay');
    if (!overlay) return;
    overlay.classList.add('hidden');
    overlay.innerHTML = ''; // Limpa o conteúdo
}

/**
 * 
 */
function exibirFormularioFinalizacao() {
    const corpoModal = document.getElementById('corpo-modal-pedidos');
    const footerModal = document.querySelector('.modal-footer');

    if (!corpoModal || !footerModal) return;

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

    document.getElementById('form-finalizacao').addEventListener('submit', finalizarPedido);
}

/**
 * 
 * @param {Event} e 
 */
function finalizarPedido(e) {
    e.preventDefault();

    const nomeCliente = document.getElementById('nome-cliente').value;
    const endereco = document.getElementById('endereco').value;
    const complemento = document.getElementById('complemento').value;
    const telefone = document.getElementById('telefone').value;
    const pagamento = document.getElementById('pagamento').value;
    const troco = document.getElementById('troco').value;
    const total = calcularTotal();

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

    exibirConfirmacao(resumoPedido, total);
}

/**
 * 
 * @param {string} resumoPedido 
 * @param {number} total
 */
function exibirConfirmacao(resumoPedido, total) {
    const corpoModal = document.getElementById('corpo-modal-pedidos');
    const modalContent = document.querySelector('.modal-content');
    const footerModal = document.querySelector('.modal-footer');
    
    if (!corpoModal || !modalContent) return;

    if (footerModal) footerModal.style.display = 'none';

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

    modalContent.style.maxWidth = '500px';
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

    carrinho = [];
    atualizarContadorPedidos();
}

function filtrarProdutos() {
    const input = document.getElementById('input-pesquisa');
    const listaProdutos = document.getElementById('lista-produtos');

    if (!input || !listaProdutos) return;

    const filtro = input.value.toLowerCase();
    const cards = listaProdutos.querySelectorAll('.card');

    cards.forEach(card => {
        const titulo = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
        const texto = card.querySelector('.card-text')?.textContent.toLowerCase() || '';
        
        if (titulo.includes(filtro) || texto.includes(filtro)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function inicializarCarrossel() {
    const track = document.querySelector('.carousel-track');
    const slides = Array.from(document.querySelectorAll('.carousel-slide'));
    const buttons = document.querySelectorAll('.carousel-btn');

    if (!track || slides.length === 0) {
        return;
    }
    
    const slideCount = slides.length;
    let currentSlideIndex = 0;
    
    track.style.transitionDuration = '0.5s'; 
    track.style.transitionTimingFunction = 'ease-in-out';
    const moveToSlide = (newIndex) => {
        currentSlideIndex = (newIndex % slideCount + slideCount) % slideCount;
        
        const offset = -(currentSlideIndex * 100);

        track.style.transform = `translateX(${offset}%)`;
    };

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

function inicializarEventos() {
    inicializarCarrossel();
    
    document.querySelectorAll('.btn-comprar').forEach(button => {
        button.addEventListener('click', (e) => {
            const nome = e.currentTarget.dataset.item;
            const preco = parseFloat(e.currentTarget.dataset.preco); 
            
            if (isNaN(preco)) {
                console.error("Preço do item é inválido:", e.currentTarget.dataset.preco);
                return;
            }

            adicionarAoCarrinho(nome, preco);
            
            e.currentTarget.innerHTML = '<i class="fas fa-check me-2"></i>Adicionado!';
            setTimeout(() => {
                e.currentTarget.innerHTML = '<i class="fas fa-cart-plus me-2"></i>Adicionar';
            }, 800);
        });
    });

    const linkPedidos = document.getElementById('link-pedidos');
    if (linkPedidos) {
        linkPedidos.addEventListener('click', (e) => {
            e.preventDefault();
            exibirModalPedidos();
        });
    }

    const toggleButton = document.getElementById('menu-toggle');
    const navbarMenu = document.getElementById('navbar-menu');
    if (toggleButton && navbarMenu) {
        toggleButton.addEventListener('click', () => {
            navbarMenu.classList.toggle('active');
        });
    }

    const inputPesquisa = document.getElementById('input-pesquisa');
    if (inputPesquisa) {
        inputPesquisa.addEventListener('keyup', filtrarProdutos);
    }
    
    const navLinks = document.querySelectorAll('#navbar-menu a.nav-link');
    if (navLinks.length > 0 && navbarMenu) {
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navbarMenu.classList.remove('active'); 
            });
        });
    }
    
    atualizarContadorPedidos();
}

document.addEventListener('DOMContentLoaded', inicializarEventos);