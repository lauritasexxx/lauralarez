document.addEventListener('DOMContentLoaded', () => {
    // Definición de variables y selectores
    const searchForm = document.getElementById('search-form');
    const productsContainer = document.getElementById('product-carousel') || document.getElementById('products-grid');
    const cartBtn = document.getElementById('cart-btn');
    const cartModalOverlay = document.getElementById('cart-modal-overlay');
    const cartModalClose = document.getElementById('cart-modal-close');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalAmount = document.getElementById('cart-total-amount');
    const emptyCartBtn = document.getElementById('empty-cart-btn');
    const completePaymentBtn = document.getElementById('complete-payment-btn');
    const paymentMethodsBtn = document.getElementById('payment-methods-btn');
    const paymentOptions = document.getElementById('payment-options');
    const emptyCartMessage = document.getElementById('empty-cart-message');
    const toast = document.getElementById('toast-message');

    // Estado global de la aplicación
    let cart = [];
    let exchangeRate = 0;
    let allProducts = [];

    // Funciones de utilidad
    const parsePrice = (priceString) => parseFloat(priceString.replace('$', '').replace(/,/g, ''));
    const saveCart = () => localStorage.setItem('shoppingCart', JSON.stringify(cart));
    const loadCart = () => {
        const savedCart = localStorage.getItem('shoppingCart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
            updateCartUI();
        }
    };
    const showToast = (message) => {
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    };

    // Lógica del carrito
    const updateCartUI = () => {
        cartItemsContainer.innerHTML = '';
        let totalUSD = 0;

        if (cart.length === 0) {
            emptyCartMessage.style.display = 'block';
            cartTotalAmount.textContent = '$0';
            completePaymentBtn.disabled = true;
            emptyCartBtn.disabled = true;
        } else {
            emptyCartMessage.style.display = 'none';
            completePaymentBtn.disabled = false;
            emptyCartBtn.disabled = false;

            cart.forEach(cartItem => {
                const product = allProducts.find(p => p.id === cartItem.id);
                if (product) {
                    const priceUSD = parsePrice(product.precio);
                    totalUSD += priceUSD * cartItem.quantity;
                    const priceMXN = (priceUSD * exchangeRate).toFixed(2);
                    const li = document.createElement('li');
                    li.className = 'cart-item';
                    li.innerHTML = `
                        <img src="${product.imagen}" alt="${product.nombre}">
                        <div class="cart-item-info">
                            <h4>${product.nombre} (x${cartItem.quantity})</h4>
                            <p>${product.precio} ($${priceMXN} MXN)</p>
                        </div>
                    `;
                    cartItemsContainer.appendChild(li);
                }
            });
            cartTotalAmount.textContent = `$${totalUSD.toFixed(2).replace('.', ',')}`;
        }
    };

    const addProductToCart = (product) => {
        const existingItem = cart.find(item => item.id === product.id);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({ id: product.id, quantity: 1 });
        }
        saveCart();
        updateCartUI();
        showToast("Producto añadido al carrito");
    };

    const emptyCart = () => {
        cart = [];
        saveCart();
        updateCartUI();
        showToast('El carrito ha sido vaciado.');
    };

    // Lógica de carga de productos
    const renderProducts = (productsToDisplay) => {
        productsContainer.innerHTML = '';
        productsToDisplay.forEach(product => {
            const priceUSD = parsePrice(product.precio);
            const priceMXN = (priceUSD * exchangeRate).toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
            const productCard = document.createElement('li');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <img src="${product.imagen}" alt="${product.nombre}">
                <div class="product-info">
                    <div class="product-details">
                        <span class="product-price">${product.precio}</span>
                        <span class="product-price-mxn">${priceMXN}</span>
                        <p class="product-title">${product.nombre}</p>
                    </div>
                    <button class="add-to-cart-btn" data-id="${product.id}">Agregar al carrito</button>
                </div>
            `;
            productsContainer.appendChild(productCard);
        });

        document.querySelectorAll('.add-to-cart-btn').forEach(button => {
            button.addEventListener('click', (event) => {
                const productId = parseInt(event.target.dataset.id);
                const selectedProduct = allProducts.find(p => p.id === productId);
                if (selectedProduct) {
                    addProductToCart(selectedProduct);
                }
            });
        });
    };

    const loadAndRenderProducts = (category = null) => {
        fetch('productos.json')
            .then(response => response.json())
            .then(products => {
                allProducts = products;
                const productsToDisplay = category ? products.filter(p => p.categoria === category) : products;
                renderProducts(productsToDisplay);
            })
            .catch(error => console.error('Error al cargar los productos:', error));
    };

    // Inicialización y eventos
    const updateExchangeRate = () => {
        fetch('https://open.er-api.com/v6/latest/USD')
            .then(response => response.json())
            .then(data => {
                exchangeRate = data.rates.MXN;
                document.getElementById('exchange-rate').textContent = exchangeRate.toFixed(2);
                
                // Determina la categoría según la página actual
                const currentPage = window.location.pathname.split('/').pop().replace('.html', '');
                let category = null;
                if (currentPage !== 'index' && currentPage !== '') {
                    category = currentPage;
                    const categoryTitleElement = document.querySelector('.category-title');
                    if (categoryTitleElement) {
                         categoryTitleElement.textContent = `Productos de ${category.charAt(0).toUpperCase() + category.slice(1)}`;
                    }
                }
                loadAndRenderProducts(category);
                loadCart();
            })
            .catch(error => {
                console.error('Error al obtener la tasa de cambio:', error);
                document.getElementById('exchange-rate').textContent = 'Error';
            });
    };

    updateExchangeRate();
    setInterval(updateExchangeRate, 300000);

    cartBtn.addEventListener('click', () => { cartModalOverlay.style.display = 'block'; updateCartUI(); });
    cartModalClose.addEventListener('click', () => { cartModalOverlay.style.display = 'none'; });
    cartModalOverlay.addEventListener('click', (event) => { if (event.target === cartModalOverlay) { cartModalOverlay.style.display = 'none'; } });
    emptyCartBtn.addEventListener('click', emptyCart);
    completePaymentBtn.addEventListener('click', () => {
        const productsList = cart.map(cartItem => {
            const product = allProducts.find(p => p.id === cartItem.id);
            return `- ${product.nombre} (x${cartItem.quantity}) ${product.precio}`;
        }).join('\n');
        const totalAmount = cartTotalAmount.textContent;
        const message = `¡Hola! Me gustaría completar mi compra.\n\nProductos:\n${productsList}\n\nTotal a pagar: ${totalAmount}\n`;
        const encodedMessage = encodeURIComponent(message);
        window.open(`https://wa.me/584249556777?text=${encodedMessage}`, '_blank');
    });
    paymentMethodsBtn.addEventListener('click', () => { paymentOptions.style.display = paymentOptions.style.display === 'block' ? 'none' : 'block'; });
});

function scrollCarousel(direction) {
    const carousel = document.getElementById('product-carousel');
    const scrollAmount = carousel.clientWidth / 2;
    carousel.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' });
}
