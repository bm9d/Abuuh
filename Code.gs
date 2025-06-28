/**
 * Google Apps Script backend for Parfum Luxe e-commerce website
 * Handles product data management, order processing, and email notifications
 */

// Configuration
const CONFIG = {
  PRODUCTS_SHEET_ID: PropertiesService.getScriptProperties().getProperty('PRODUCTS_SHEET_ID') || '',
  ORDERS_SHEET_ID: PropertiesService.getScriptProperties().getProperty('ORDERS_SHEET_ID') || '',
  CUSTOMERS_SHEET_ID: PropertiesService.getScriptProperties().getProperty('CUSTOMERS_SHEET_ID') || '',
  EMAIL_TEMPLATE_SHEET_ID: PropertiesService.getScriptProperties().getProperty('EMAIL_TEMPLATE_SHEET_ID') || '',
  ADMIN_EMAIL: PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL') || 'admin@parfumluxe.com'
};

/**
 * Main function to handle web app requests
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    switch (action) {
      case 'getProducts':
        return createResponse(getProducts(data.filters));
      case 'getProduct':
        return createResponse(getProduct(data.productId));
      case 'getFeaturedProducts':
        return createResponse(getFeaturedProducts());
      case 'createOrder':
        return createResponse(createOrder(data.data));
      case 'getDashboardData':
        return createResponse(getDashboardData());
      case 'saveProduct':
        return createResponse(saveProduct(data.productData, data.isEdit));
      case 'deleteProduct':
        return createResponse(deleteProduct(data.productId));
      case 'subscribeNewsletter':
        return createResponse(subscribeNewsletter(data.email));
      default:
        return createResponse({ error: 'Unknown action' }, 400);
    }
  } catch (error) {
    console.error('Error in doPost:', error);
    return createResponse({ error: 'Internal server error' }, 500);
  }
}

/**
 * Handle GET requests
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    
    switch (action) {
      case 'getProducts':
        return createResponse(getProducts());
      case 'getFeaturedProducts':
        return createResponse(getFeaturedProducts());
      default:
        return createResponse({ error: 'Unknown action' }, 400);
    }
  } catch (error) {
    console.error('Error in doGet:', error);
    return createResponse({ error: 'Internal server error' }, 500);
  }
}

/**
 * Create standardized response
 */
function createResponse(data, statusCode = 200) {
  const response = {
    success: statusCode === 200,
    data: data,
    timestamp: new Date().toISOString()
  };
  
  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Get all products with optional filtering
 */
function getProducts(filters = {}) {
  try {
    const sheet = getProductsSheet();
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const products = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const product = {};
      
      headers.forEach((header, index) => {
        product[header] = row[index];
      });
      
      // Apply filters
      if (applyProductFilters(product, filters)) {
        products.push(product);
      }
    }
    
    return products;
  } catch (error) {
    console.error('Error getting products:', error);
    return [];
  }
}

/**
 * Get a single product by ID
 */
function getProduct(productId) {
  try {
    const products = getProducts();
    return products.find(product => product.id === productId) || null;
  } catch (error) {
    console.error('Error getting product:', error);
    return null;
  }
}

/**
 * Get featured products
 */
function getFeaturedProducts(limit = 6) {
  try {
    const products = getProducts();
    return products
      .filter(product => product.featured === 'TRUE' || product.featured === true)
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting featured products:', error);
    return [];
  }
}

/**
 * Apply filters to product
 */
function applyProductFilters(product, filters) {
  if (!filters) return true;
  
  // Brand filter
  if (filters.brands && filters.brands.length > 0) {
    if (!filters.brands.includes(product.brand)) return false;
  }
  
  // Scent family filter
  if (filters.scents && filters.scents.length > 0) {
    if (!filters.scents.includes(product.scent_family)) return false;
  }
  
  // Price range filter
  if (filters.priceMin !== undefined && product.price < filters.priceMin) return false;
  if (filters.priceMax !== undefined && product.price > filters.priceMax) return false;
  
  // Search filter
  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    const searchableText = `${product.name} ${product.brand} ${product.scent_family} ${product.description || ''}`.toLowerCase();
    if (!searchableText.includes(searchTerm)) return false;
  }
  
  return true;
}

/**
 * Create a new order
 */
function createOrder(orderData) {
  try {
    const ordersSheet = getOrdersSheet();
    if (!ordersSheet) {
      throw new Error('Orders sheet not found');
    }
    
    // Add order to sheet
    const orderRow = [
      orderData.orderId,
      orderData.orderDate,
      orderData.customer.email,
      `${orderData.shipping.firstName} ${orderData.shipping.lastName}`,
      orderData.customer.phone,
      formatAddress(orderData.shipping),
      orderData.payment.method,
      JSON.stringify(orderData.items),
      orderData.totals.subtotal,
      orderData.totals.shipping,
      orderData.totals.tax,
      orderData.totals.total,
      'pending',
      orderData.orderNotes || ''
    ];
    
    ordersSheet.appendRow(orderRow);
    
    // Update inventory
    updateInventory(orderData.items);
    
    // Save customer data
    saveCustomer(orderData.customer, orderData.shipping);
    
    // Send confirmation emails
    sendOrderConfirmationEmail(orderData);
    sendAdminNotificationEmail(orderData);
    
    return { success: true, orderId: orderData.orderId };
    
  } catch (error) {
    console.error('Error creating order:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update product inventory after order
 */
function updateInventory(items) {
  try {
    const sheet = getProductsSheet();
    if (!sheet) return;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id');
    const stockIndex = headers.indexOf('stock');
    
    if (idIndex === -1 || stockIndex === -1) return;
    
    items.forEach(item => {
      for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === item.id) {
          const currentStock = parseInt(data[i][stockIndex]) || 0;
          const newStock = Math.max(0, currentStock - item.quantity);
          sheet.getRange(i + 1, stockIndex + 1).setValue(newStock);
          break;
        }
      }
    });
  } catch (error) {
    console.error('Error updating inventory:', error);
  }
}

/**
 * Save customer data
 */
function saveCustomer(customer, shipping) {
  try {
    const sheet = getCustomersSheet();
    if (!sheet) return;
    
    // Check if customer already exists
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const emailIndex = headers.indexOf('email');
    
    let customerRow = null;
    let rowIndex = -1;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][emailIndex] === customer.email) {
        customerRow = data[i];
        rowIndex = i;
        break;
      }
    }
    
    const now = new Date().toISOString();
    
    if (customerRow) {
      // Update existing customer
      const orderCountIndex = headers.indexOf('orderCount');
      const lastOrderIndex = headers.indexOf('lastOrderDate');
      
      if (orderCountIndex !== -1) {
        const currentCount = parseInt(customerRow[orderCountIndex]) || 0;
        sheet.getRange(rowIndex + 1, orderCountIndex + 1).setValue(currentCount + 1);
      }
      
      if (lastOrderIndex !== -1) {
        sheet.getRange(rowIndex + 1, lastOrderIndex + 1).setValue(now);
      }
    } else {
      // Add new customer
      const newCustomerRow = [
        customer.email,
        shipping.firstName,
        shipping.lastName,
        customer.phone,
        formatAddress(shipping),
        1, // orderCount
        0, // totalSpent (will be calculated separately)
        now, // firstOrderDate
        now  // lastOrderDate
      ];
      
      sheet.appendRow(newCustomerRow);
    }
  } catch (error) {
    console.error('Error saving customer:', error);
  }
}

/**
 * Send order confirmation email
 */
function sendOrderConfirmationEmail(orderData) {
  try {
    const customer = orderData.customer;
    const subject = `Order Confirmation - ${orderData.orderId}`;
    
    const body = `
Dear ${orderData.shipping.firstName},

Thank you for your order! We've received your order and are preparing it for shipment.

Order Details:
Order ID: ${orderData.orderId}
Order Date: ${new Date(orderData.orderDate).toLocaleDateString()}

Items Ordered:
${orderData.items.map(item => `- ${item.name} (${item.brand}) - Qty: ${item.quantity} - $${item.price}`).join('\n')}

Order Summary:
Subtotal: $${orderData.totals.subtotal}
Shipping: $${orderData.totals.shipping === 0 ? '0.00 (Free)' : orderData.totals.shipping}
Tax: $${orderData.totals.tax}
Total: $${orderData.totals.total}

Shipping Address:
${formatAddress(orderData.shipping)}

We'll send you a tracking number once your order ships.

Thank you for choosing Parfum Luxe!

Best regards,
The Parfum Luxe Team
`;
    
    MailApp.sendEmail({
      to: customer.email,
      subject: subject,
      body: body
    });
    
  } catch (error) {
    console.error('Error sending confirmation email:', error);
  }
}

/**
 * Send admin notification email
 */
function sendAdminNotificationEmail(orderData) {
  try {
    const subject = `New Order Received - ${orderData.orderId}`;
    
    const body = `
New order received on Parfum Luxe website:

Order ID: ${orderData.orderId}
Customer: ${orderData.shipping.firstName} ${orderData.shipping.lastName}
Email: ${orderData.customer.email}
Phone: ${orderData.customer.phone}
Total: $${orderData.totals.total}

Items:
${orderData.items.map(item => `- ${item.name} (${item.brand}) - Qty: ${item.quantity}`).join('\n')}

Shipping Address:
${formatAddress(orderData.shipping)}

${orderData.orderNotes ? `Order Notes: ${orderData.orderNotes}` : ''}

Please process this order in the admin dashboard.
`;
    
    MailApp.sendEmail({
      to: CONFIG.ADMIN_EMAIL,
      subject: subject,
      body: body
    });
    
  } catch (error) {
    console.error('Error sending admin notification:', error);
  }
}

/**
 * Format shipping address
 */
function formatAddress(shipping) {
  return `${shipping.firstName} ${shipping.lastName}
${shipping.address}${shipping.apartment ? ', ' + shipping.apartment : ''}
${shipping.city}, ${shipping.state} ${shipping.zipCode}`;
}

/**
 * Get dashboard data
 */
function getDashboardData() {
  try {
    const products = getProducts();
    const orders = getOrders();
    const customers = getCustomers();
    const stats = calculateStats(orders, customers);
    
    return {
      products: products,
      orders: orders,
      customers: customers,
      stats: stats
    };
  } catch (error) {
    console.error('Error getting dashboard data:', error);
    return {
      products: [],
      orders: [],
      customers: [],
      stats: {}
    };
  }
}

/**
 * Get all orders
 */
function getOrders() {
  try {
    const sheet = getOrdersSheet();
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const orders = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const order = {};
      
      headers.forEach((header, index) => {
        order[header] = row[index];
      });
      
      // Parse items JSON
      try {
        order.items = JSON.parse(order.items || '[]');
      } catch (e) {
        order.items = [];
      }
      
      // Create nested objects for better structure
      order.customer = {
        email: order.customerEmail,
        firstName: order.customerName?.split(' ')[0] || '',
        lastName: order.customerName?.split(' ').slice(1).join(' ') || ''
      };
      
      order.totals = {
        subtotal: parseFloat(order.subtotal) || 0,
        shipping: parseFloat(order.shipping) || 0,
        tax: parseFloat(order.tax) || 0,
        total: parseFloat(order.total) || 0
      };
      
      orders.push(order);
    }
    
    return orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
  } catch (error) {
    console.error('Error getting orders:', error);
    return [];
  }
}

/**
 * Get all customers
 */
function getCustomers() {
  try {
    const sheet = getCustomersSheet();
    if (!sheet) return [];
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const customers = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const customer = {};
      
      headers.forEach((header, index) => {
        customer[header] = row[index];
      });
      
      customers.push(customer);
    }
    
    return customers;
  } catch (error) {
    console.error('Error getting customers:', error);
    return [];
  }
}

/**
 * Calculate dashboard statistics
 */
function calculateStats(orders, customers) {
  try {
    const totalRevenue = orders.reduce((sum, order) => sum + (parseFloat(order.total) || 0), 0);
    const totalOrders = orders.length;
    const totalCustomers = customers.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    
    // For demo purposes, using static change percentages
    // In real implementation, these would be calculated based on previous period data
    return {
      totalRevenue: totalRevenue,
      totalOrders: totalOrders,
      totalCustomers: totalCustomers,
      avgOrderValue: avgOrderValue,
      revenueChange: 12.5,
      ordersChange: 8.3,
      customersChange: 15.2,
      avgOrderChange: 4.7
    };
  } catch (error) {
    console.error('Error calculating stats:', error);
    return {
      totalRevenue: 0,
      totalOrders: 0,
      totalCustomers: 0,
      avgOrderValue: 0,
      revenueChange: 0,
      ordersChange: 0,
      customersChange: 0,
      avgOrderChange: 0
    };
  }
}

/**
 * Save product (add or update)
 */
function saveProduct(productData, isEdit = false) {
  try {
    const sheet = getProductsSheet();
    if (!sheet) {
      throw new Error('Products sheet not found');
    }
    
    if (isEdit) {
      // Update existing product
      const data = sheet.getDataRange().getValues();
      const headers = data[0];
      const idIndex = headers.indexOf('id');
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][idIndex] === productData.id) {
          // Update row
          const row = headers.map(header => productData[header] || data[i][headers.indexOf(header)]);
          sheet.getRange(i + 1, 1, 1, headers.length).setValues([row]);
          return { success: true };
        }
      }
      
      throw new Error('Product not found for update');
    } else {
      // Add new product
      const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      const row = headers.map(header => productData[header] || '');
      sheet.appendRow(row);
      return { success: true };
    }
  } catch (error) {
    console.error('Error saving product:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Delete product
 */
function deleteProduct(productId) {
  try {
    const sheet = getProductsSheet();
    if (!sheet) {
      throw new Error('Products sheet not found');
    }
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const idIndex = headers.indexOf('id');
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] === productId) {
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    
    throw new Error('Product not found');
  } catch (error) {
    console.error('Error deleting product:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Subscribe to newsletter
 */
function subscribeNewsletter(email) {
  try {
    // This would typically save to a newsletter subscribers sheet
    // For now, just send a welcome email
    
    MailApp.sendEmail({
      to: email,
      subject: 'Welcome to Parfum Luxe Newsletter!',
      body: `Thank you for subscribing to our newsletter! You'll be the first to know about new arrivals, exclusive offers, and fragrance tips.

Best regards,
The Parfum Luxe Team`
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Helper functions to get sheets
 */
function getProductsSheet() {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.PRODUCTS_SHEET_ID);
    return spreadsheet.getActiveSheet();
  } catch (error) {
    console.error('Error accessing products sheet:', error);
    return null;
  }
}

function getOrdersSheet() {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.ORDERS_SHEET_ID);
    return spreadsheet.getActiveSheet();
  } catch (error) {
    console.error('Error accessing orders sheet:', error);
    return null;
  }
}

function getCustomersSheet() {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.CUSTOMERS_SHEET_ID);
    return spreadsheet.getActiveSheet();
  } catch (error) {
    console.error('Error accessing customers sheet:', error);
    return null;
  }
}

/**
 * Initialize sheets with proper headers (run once)
 */
function initializeSheets() {
  // Products sheet headers
  const productsHeaders = [
    'id', 'name', 'brand', 'price', 'stock', 'scent_family', 
    'description', 'image_url', 'featured', 'created_date'
  ];
  
  // Orders sheet headers
  const ordersHeaders = [
    'orderId', 'orderDate', 'customerEmail', 'customerName', 'customerPhone',
    'shippingAddress', 'paymentMethod', 'items', 'subtotal', 'shipping',
    'tax', 'total', 'status', 'orderNotes'
  ];
  
  // Customers sheet headers
  const customersHeaders = [
    'email', 'firstName', 'lastName', 'phone', 'address',
    'orderCount', 'totalSpent', 'firstOrderDate', 'lastOrderDate'
  ];
  
  console.log('Sheet headers defined. Use these to create your Google Sheets manually.');
  console.log('Products headers:', productsHeaders);
  console.log('Orders headers:', ordersHeaders);
  console.log('Customers headers:', customersHeaders);
}
