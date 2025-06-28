// Shopping cart management
class CartManager {
    constructor() {
        this.cartKey = 'parfum_luxe_cart';
        this.cart = this.loadCart();
    }

    // Load cart from localStorage
    loadCart() {
        return getLocalStorage(this.cartKey, []);
    }

    // Save cart to localStorage
    saveCart() {
        setLocalStorage(this.cartKey, this.cart);
        this.updateCartDisplay();
    }

    // Add item to cart
    addToCart(productId, quantity = 1) {
        try {
            const existingItem = this.cart.find(item => item.id === productId);
            
            if (existingItem) {
                existingItem.quantity += quantity;
            } else {
                // In a real implementation, this would fetch product data
                // For now, we'll create a placeholder item
                const newItem = {
                    id: productId,
                    name: 'Product ' + productId,
                    brand: 'Unknown Brand',
                    price: 0,
                    quantity: quantity,
                    image_url: '',
                    addedAt: new Date().toISOString()
                };
                this.cart.push(newItem);
            }
            
            this.saveCart();
            return true;
        } catch (error) {
            console.error('Error adding to cart:', error);
            return false;
        }
    }

    // Remove item from cart
    removeFromCart(productId) {
        try {
            this.cart = this.cart.filter(item => item.id !== productId);
            this.saveCart();
            return true;
        } catch (error) {
            console.error('Error removing from cart:', error);
            return false;
        }
    }

    // Update item quantity
    updateQuantity(productId, quantity) {
        try {
            const item = this.cart.find(item => item.id === productId);
            if (item) {
                if (quantity <= 0) {
                    return this.removeFromCart(productId);
                }
                item.quantity = quantity;
                this.saveCart();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating quantity:', error);
            return false;
        }
    }

    // Get cart items
    getCartItems() {
        return this.cart;
    }

    // Get cart count
    getCartCount() {
        return this.cart.reduce((total, item) => total + item.quantity, 0);
    }

    // Get cart total
    getCartTotal() {
        return this.cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    }

    // Clear entire cart
    clearCart() {
        this.cart = [];
        this.saveCart();
    }

    // Update cart display in header
    updateCartDisplay() {
        const cartCountElements = document.querySelectorAll('.cart-count');
        const count = this.getCartCount();
        
        cartCountElements.forEach(element => {
            element.textContent = count;
            element.style.display = count > 0 ? 'inline' : 'none';
        });
    }

    // Check if item is in cart
    isInCart(productId) {
        return this.cart.some(item => item.id === productId);
    }

    // Get item quantity
    getItemQuantity(productId) {
        const item = this.cart.find(item => item.id === productId);
        return item ? item.quantity : 0;
    }
}

// Initialize cart manager
window.cartManager = new CartManager();

// Update cart count on page load
function updateCartCount() {
    window.cartManager.updateCartDisplay();
}

// Add to cart with product details
async function addToCartWithDetails(productId, productData) {
    try {
        const existingItem = window.cartManager.cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            const newItem = {
                id: productId,
                name: productData.name,
                brand: productData.brand,
                price: parseFloat(productData.price),
                quantity: 1,
                image_url: productData.image_url || '',
                scent_family: productData.scent_family,
                addedAt: new Date().toISOString()
            };
            window.cartManager.cart.push(newItem);
        }
        
        window.cartManager.saveCart();
        showNotification('Added to cart!', 'success');
        return true;
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Failed to add to cart', 'error');
        return false;
    }
}

// Quick add to cart function for product cards
function quickAddToCart(button, productId) {
    const productCard = button.closest('.product-card');
    if (!productCard) return;

    const productData = {
        name: productCard.querySelector('.product-card__title')?.textContent || 'Unknown Product',
        brand: productCard.querySelector('.product-card__brand')?.textContent || 'Unknown Brand',
        price: productCard.querySelector('.product-card__price')?.textContent?.replace('$', '') || '0',
        image_url: productCard.querySelector('img')?.src || ''
    };

    addToCartWithDetails(productId, productData);
}

// Cart mini display for header dropdown
function createCartMiniDisplay() {
    const cartItems = window.cartManager.getCartItems();
    const cartTotal = window.cartManager.getCartTotal();
    
    if (cartItems.length === 0) {
        return '<p class="cart-mini__empty">Your cart is empty</p>';
    }
    
    let html = '<div class="cart-mini__items">';
    
    cartItems.slice(0, 3).forEach(item => {
        html += `
            <div class="cart-mini__item">
                <img src="${item.image_url || ''}" alt="${item.name}" class="cart-mini__image">
                <div class="cart-mini__details">
                    <h4>${item.name}</h4>
                    <p>${item.quantity} x $${item.price}</p>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    if (cartItems.length > 3) {
        html += `<p class="cart-mini__more">+${cartItems.length - 3} more items</p>`;
    }
    
    html += `
        <div class="cart-mini__total">
            <strong>Total: ${formatCurrency(cartTotal)}</strong>
        </div>
        <div class="cart-mini__actions">
            <a href="cart.html" class="btn btn--outline btn--small">View Cart</a>
            <a href="checkout.html" class="btn btn--primary btn--small">Checkout</a>
        </div>
    `;
    
    return html;
}

// Cart persistence across sessions
function syncCartWithServer() {
    // This would sync cart with server in a real implementation
    // For now, we'll just validate localStorage data
    const cart = window.cartManager.getCartItems();
    
    // Remove invalid items
    const validCart = cart.filter(item => {
        return item.id && item.name && item.price !== undefined && item.quantity > 0;
    });
    
    if (validCart.length !== cart.length) {
        window.cartManager.cart = validCart;
        window.cartManager.saveCart();
    }
}

// Calculate shipping cost
function calculateShipping(subtotal, shippingMethod = 'standard') {
    if (subtotal >= 50) {
        return 0; // Free shipping over $50
    }
    
    switch (shippingMethod) {
        case 'standard':
            return 9.99;
        case 'express':
            return 19.99;
        case 'overnight':
            return 39.99;
        default:
            return 9.99;
    }
}

// Calculate tax
function calculateTax(subtotal, taxRate = 0.08) {
    return subtotal * taxRate;
}

// Apply discount code
function applyDiscount(subtotal, discountCode) {
    const discounts = {
        'WELCOME10': { type: 'percentage', value: 0.10 },
        'SAVE20': { type: 'percentage', value: 0.20 },
        'FREESHIP': { type: 'freeship', value: 0 },
        'NEWCUSTOMER': { type: 'fixed', value: 15 }
    };
    
    const discount = discounts[discountCode.toUpperCase()];
    if (!discount) {
        return { valid: false, message: 'Invalid discount code' };
    }
    
    let discountAmount = 0;
    
    switch (discount.type) {
        case 'percentage':
            discountAmount = subtotal * discount.value;
            break;
        case 'fixed':
            discountAmount = Math.min(discount.value, subtotal);
            break;
        case 'freeship':
            // This would be handled in shipping calculation
            break;
    }
    
    return {
        valid: true,
        type: discount.type,
        amount: discountAmount,
        message: 'Discount applied successfully!'
    };
}

// Cart analytics
function trackCartEvent(event, data = {}) {
    // This would send analytics data in a real implementation
    console.log('Cart Event:', event, data);
    
    // Example events:
    // - cart_add
    // - cart_remove
    // - cart_update
    // - cart_view
    // - checkout_start
}

// Initialize cart functionality
document.addEventListener('DOMContentLoaded', function() {
    // Update cart count on page load
    updateCartCount();
    
    // Sync cart with server
    syncCartWithServer();
    
    // Add event listeners for add to cart buttons
    document.addEventListener('click', function(e) {
        if (e.target.matches('.add-to-cart-btn') || e.target.closest('.add-to-cart-btn')) {
            e.preventDefault();
            const button = e.target.matches('.add-to-cart-btn') ? e.target : e.target.closest('.add-to-cart-btn');
            const productId = button.dataset.productId;
            
            if (productId) {
                quickAddToCart(button, productId);
            }
        }
    });
    
    // Track cart view
    if (window.location.pathname.includes('cart.html')) {
        trackCartEvent('cart_view', {
            item_count: window.cartManager.getCartCount(),
            total_value: window.cartManager.getCartTotal()
        });
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CartManager,
        addToCartWithDetails,
        quickAddToCart,
        createCartMiniDisplay,
        calculateShipping,
        calculateTax,
        applyDiscount,
        trackCartEvent
    };
}
