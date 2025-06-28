// Checkout page functionality
let currentStep = 1;
let orderData = {};

document.addEventListener('DOMContentLoaded', function() {
    initializeCheckoutPage();
});

function initializeCheckoutPage() {
    loadOrderSummary();
    initializeForm();
    initializePaymentMethods();
    updateCartCount();
    
    // Check if cart is empty
    const cartItems = window.cartManager.getCartItems();
    if (cartItems.length === 0) {
        window.location.href = 'cart.html';
        return;
    }
}

function loadOrderSummary() {
    const cartItems = window.cartManager.getCartItems();
    const orderItemsContainer = document.getElementById('orderItems');
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = calculateShipping(subtotal);
    const tax = calculateTax(subtotal);
    const total = subtotal + shipping + tax;

    // Render order items
    if (orderItemsContainer) {
        orderItemsContainer.innerHTML = cartItems.map(item => `
            <div class="order-item">
                <div class="order-item__image">
                    <img src="${item.image_url || ''}" alt="${item.name}" 
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                    <svg class="product-image-placeholder" style="display: none;" width="60" height="75" viewBox="0 0 60 75">
                        <rect width="60" height="75" fill="#f5f5f5" stroke="#ddd"/>
                        <text x="30" y="37" text-anchor="middle" fill="#999" font-size="8">Product</text>
                    </svg>
                </div>
                <div class="order-item__details">
                    <div class="order-item__name">${item.name}</div>
                    <div class="order-item__price">Qty: ${item.quantity} × ${formatCurrency(item.price)}</div>
                </div>
            </div>
        `).join('');
    }

    // Update totals
    updateOrderTotal('orderSubtotal', subtotal);
    updateOrderTotal('orderShipping', shipping);
    updateOrderTotal('orderTax', tax);
    updateOrderTotal('orderTotal', total);
}

function updateOrderTotal(elementId, amount) {
    const element = document.getElementById(elementId);
    if (element) {
        if (elementId === 'orderShipping' && amount === 0) {
            element.textContent = 'Free';
        } else {
            element.textContent = formatCurrency(amount);
        }
    }
}

function initializeForm() {
    const checkoutForm = document.getElementById('checkoutForm');
    if (!checkoutForm) return;

    checkoutForm.addEventListener('submit', handleCheckoutSubmit);

    // Real-time validation
    const inputs = checkoutForm.querySelectorAll('input, select');
    inputs.forEach(input => {
        input.addEventListener('blur', function() {
            validateField(this);
        });
        
        input.addEventListener('input', function() {
            clearFieldError(document.getElementById(this.id + 'Error'));
        });
    });

    // Format card number input
    const cardNumberInput = document.getElementById('cardNumber');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', formatCardNumber);
    }

    // Format expiry date input
    const expiryInput = document.getElementById('expiry');
    if (expiryInput) {
        expiryInput.addEventListener('input', formatExpiryDate);
    }

    // Format CVV input
    const cvvInput = document.getElementById('cvv');
    if (cvvInput) {
        cvvInput.addEventListener('input', formatCVV);
    }
}

function initializePaymentMethods() {
    const paymentMethods = document.querySelectorAll('input[name="paymentMethod"]');
    const creditCardForm = document.getElementById('creditCardForm');

    paymentMethods.forEach(method => {
        method.addEventListener('change', function() {
            if (creditCardForm) {
                if (this.value === 'credit') {
                    creditCardForm.style.display = 'block';
                } else {
                    creditCardForm.style.display = 'none';
                }
            }
        });
    });
}

async function handleCheckoutSubmit(e) {
    e.preventDefault();
    
    if (!validateCheckoutForm()) {
        return;
    }

    try {
        showLoading();
        
        // Collect form data
        const formData = collectFormData();
        const cartItems = window.cartManager.getCartItems();
        
        // Prepare order data
        orderData = {
            orderDate: new Date().toISOString(),
            orderId: 'ORDER-' + Date.now(),
            customer: formData.customer,
            shipping: formData.shipping,
            payment: formData.payment,
            items: cartItems,
            totals: calculateOrderTotals(),
            orderNotes: formData.orderNotes || ''
        };

        // Submit order to Google Apps Script
        const success = await submitOrder(orderData);
        
        if (success) {
            // Clear cart
            window.cartManager.clearCart();
            
            // Redirect to success page or show success message
            showOrderSuccess();
        } else {
            showNotification('Order submission failed. Please try again.', 'error');
        }
        
    } catch (error) {
        console.error('Checkout error:', error);
        showNotification('An error occurred during checkout. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

function validateCheckoutForm() {
    const form = document.getElementById('checkoutForm');
    const requiredFields = [
        { id: 'email', name: 'Email', type: 'email' },
        { id: 'phone', name: 'Phone', type: 'tel' },
        { id: 'firstName', name: 'First Name' },
        { id: 'lastName', name: 'Last Name' },
        { id: 'address', name: 'Address' },
        { id: 'city', name: 'City' },
        { id: 'state', name: 'State' },
        { id: 'zipCode', name: 'ZIP Code', pattern: /^\d{5}(-\d{4})?$/ }
    ];

    // Add payment fields if credit card is selected
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked');
    if (paymentMethod && paymentMethod.value === 'credit') {
        requiredFields.push(
            { id: 'cardNumber', name: 'Card Number', pattern: /^\d{4}\s\d{4}\s\d{4}\s\d{4}$/ },
            { id: 'expiry', name: 'Expiry Date', pattern: /^(0[1-9]|1[0-2])\/\d{2}$/ },
            { id: 'cvv', name: 'CVV', pattern: /^\d{3,4}$/ },
            { id: 'cardName', name: 'Name on Card' }
        );
    }

    let isValid = true;

    requiredFields.forEach(field => {
        const input = document.getElementById(field.id);
        const error = document.getElementById(field.id + 'Error');
        
        if (!input || !input.value.trim()) {
            showFieldError(error, `${field.name} is required`);
            isValid = false;
        } else if (field.type === 'email' && !isValidEmail(input.value)) {
            showFieldError(error, 'Please enter a valid email address');
            isValid = false;
        } else if (field.type === 'tel' && !isValidPhone(input.value)) {
            showFieldError(error, 'Please enter a valid phone number');
            isValid = false;
        } else if (field.pattern && !field.pattern.test(input.value)) {
            showFieldError(error, `Please enter a valid ${field.name.toLowerCase()}`);
            isValid = false;
        } else {
            clearFieldError(error);
        }
    });

    return isValid;
}

function validateField(input) {
    const error = document.getElementById(input.id + 'Error');
    
    if (input.required && !input.value.trim()) {
        showFieldError(error, `${input.labels[0]?.textContent.replace('*', '').trim() || 'This field'} is required`);
        return false;
    }
    
    if (input.type === 'email' && input.value && !isValidEmail(input.value)) {
        showFieldError(error, 'Please enter a valid email address');
        return false;
    }
    
    clearFieldError(error);
    return true;
}

function collectFormData() {
    const form = document.getElementById('checkoutForm');
    const formData = new FormData(form);
    
    return {
        customer: {
            email: formData.get('email'),
            phone: formData.get('phone')
        },
        shipping: {
            firstName: formData.get('firstName'),
            lastName: formData.get('lastName'),
            address: formData.get('address'),
            apartment: formData.get('apartment'),
            city: formData.get('city'),
            state: formData.get('state'),
            zipCode: formData.get('zipCode')
        },
        payment: {
            method: formData.get('paymentMethod'),
            cardNumber: formData.get('cardNumber'),
            expiry: formData.get('expiry'),
            cvv: formData.get('cvv'),
            cardName: formData.get('cardName')
        },
        orderNotes: formData.get('orderNotes')
    };
}

function calculateOrderTotals() {
    const cartItems = window.cartManager.getCartItems();
    const subtotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = calculateShipping(subtotal);
    const tax = calculateTax(subtotal);
    const total = subtotal + shipping + tax;
    
    return {
        subtotal: roundToDecimal(subtotal),
        shipping: roundToDecimal(shipping),
        tax: roundToDecimal(tax),
        total: roundToDecimal(total)
    };
}

async function submitOrder(orderData) {
    try {
        // In a real implementation, this would call Google Apps Script
        // For now, we'll simulate the API call
        
        // Prepare data for Google Apps Script
        const payload = {
            action: 'createOrder',
            data: orderData
        };
        
        // This would be the actual Google Apps Script URL
        // const scriptUrl = 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL';
        // const response = await fetch(scriptUrl, {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify(payload)
        // });
        
        // For demonstration, simulate successful submission
        return new Promise((resolve) => {
            setTimeout(() => resolve(true), 2000);
        });
        
    } catch (error) {
        console.error('Error submitting order:', error);
        return false;
    }
}

function showOrderSuccess() {
    const main = document.querySelector('.checkout-section');
    if (!main) return;
    
    main.innerHTML = `
        <div class="container">
            <div class="order-success">
                <div class="order-success__icon">
                    <i class="fas fa-check-circle"></i>
                </div>
                <h1 class="order-success__title">Order Confirmed!</h1>
                <p class="order-success__message">
                    Thank you for your order. You will receive a confirmation email shortly.
                </p>
                <div class="order-success__details">
                    <p><strong>Order ID:</strong> ${orderData.orderId}</p>
                    <p><strong>Total:</strong> ${formatCurrency(orderData.totals.total)}</p>
                </div>
                <div class="order-success__actions">
                    <a href="index.html" class="btn btn--primary">Continue Shopping</a>
                    <a href="products.html" class="btn btn--outline">Browse Products</a>
                </div>
            </div>
        </div>
    `;
    
    // Update page title
    document.title = 'Order Confirmed - Parfum Luxe';
    
    // Scroll to top
    window.scrollTo(0, 0);
}

// Input formatting functions
function formatCardNumber(e) {
    let value = e.target.value.replace(/\D/g, '');
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    value = value.substring(0, 19); // Limit to 16 digits + 3 spaces
    e.target.value = value;
}

function formatExpiryDate(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    e.target.value = value;
}

function formatCVV(e) {
    let value = e.target.value.replace(/\D/g, '');
    value = value.substring(0, 4); // Limit to 4 digits
    e.target.value = value;
}

// State options for the select dropdown
function populateStateOptions() {
    const stateSelect = document.getElementById('state');
    if (!stateSelect) return;
    
    const states = [
        'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
        'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
        'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
        'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
    ];
    
    const currentOptions = stateSelect.innerHTML;
    if (currentOptions.includes('Alabama')) return; // Already populated
    
    stateSelect.innerHTML = '<option value="">Select State</option>' + 
        states.map(state => `<option value="${state}">${state}</option>`).join('');
}

// Initialize state options when page loads
document.addEventListener('DOMContentLoaded', function() {
    populateStateOptions();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initializeCheckoutPage,
        validateCheckoutForm,
        submitOrder,
        calculateOrderTotals
    };
}
