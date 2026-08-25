(function () {
  'use strict';

  const STORAGE_KEYS = {
    menu: 'restaurant_menu',
    cart: 'restaurant_cart',
    sales: 'restaurant_sales',
    settings: 'restaurant_settings'
  };

  /* Default QR shown in Pay Now when no custom URL is set (replace in Settings with your UPI QR) */
  const DEFAULT_QR_URL = 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=Pay%20at%20counter&format=png';
  const DEFAULT_FOOD_IMAGE = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400';

  const DEFAULT_MENU = [
    { id: '1', name: 'Idly', price: 30, imageUrl: 'eff60f10251dede991417cfdcd14806b.jpg' },
    { id: '2', name: 'Puttu', price: 40, imageUrl: 'puttu and kadala curry.jpg' },
    { id: '3', name: 'Poori', price: 35, imageUrl: 'poori.jpg' },
    { id: '4', name: 'Coffee', price: 25, imageUrl: 'filter coffee.jpg' },
    { id: '5', name: 'Dosai', price: 45, imageUrl: 'dosa.jpg' },
    { id: '6', name: 'Vadadi', price: 50, imageUrl: 'vada.jpg' },
    { id: '7', name: 'Palampoori', price: 55, imageUrl: 'Pazhampori.jpg' }
  ];

  function getImageKey(name) {
    return (name || '').toString().trim().toLowerCase();
  }

  var DEFAULT_MENU_IMAGES_BY_NAME = {
    'idly': 'eff60f10251dede991417cfdcd14806b.jpg',
    'idli': 'eff60f10251dede991417cfdcd14806b.jpg',
    'puttu': 'puttu and kadala curry.jpg',
    'puttu with kadala curry': 'puttu and kadala curry.jpg',
    'poori': 'poori.jpg',
    'coffee': 'filter coffee.jpg',
    'tea': 'coffee.jpg',
    'dosai': 'dosa.jpg',
    'dosa': 'dosa.jpg',
    'vadadi': 'vada.jpg',
    'vada': 'vada.jpg',
    'vadai': 'vada.jpg',
    'palampoori': 'Pazhampori.jpg',
    'pazhampori': 'Pazhampori.jpg'
  };

  function resolveMenuItemImageUrl(item) {
    var imageUrl = (item.imageUrl || '').trim();
    var expectedImage = DEFAULT_MENU_IMAGES_BY_NAME[getImageKey(item.name)];
    if (expectedImage) {
      if (!imageUrl || imageUrl === DEFAULT_FOOD_IMAGE || imageUrl.indexOf('source.unsplash.com') !== -1) {
        return expectedImage;
      }
      // If the item is one of the standard menu names, prefer the known image.
      if (imageUrl !== expectedImage) {
        return expectedImage;
      }
    }
    return imageUrl || DEFAULT_FOOD_IMAGE;
  }

  function normalizeMenuImages(menu) {
    if (!Array.isArray(menu)) return menu;
    return menu.map(function (item) {
      if (!item || !item.name) return item;
      var expectedImage = DEFAULT_MENU_IMAGES_BY_NAME[getImageKey(item.name)];
      if (!expectedImage) return item;
      var imageUrl = (item.imageUrl || '').trim();
      if (!imageUrl || imageUrl === DEFAULT_FOOD_IMAGE || imageUrl.indexOf('source.unsplash.com') !== -1 || imageUrl !== expectedImage) {
        return Object.assign({}, item, { imageUrl: expectedImage });
      }
      return item;
    });
  }

  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function getMenu() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.menu);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function setMenu(items) {
    localStorage.setItem(STORAGE_KEYS.menu, JSON.stringify(items));
  }

  function seedMenuIfEmpty() {
    let menu = getMenu();
    if (!menu || !Array.isArray(menu) || menu.length === 0) {
      setMenu(DEFAULT_MENU.map(function (item) { return { ...item, id: item.id || generateId() }; }));
      return;
    }
    var normalized = normalizeMenuImages(menu);
    if (JSON.stringify(normalized) !== JSON.stringify(menu)) {
      setMenu(normalized);
    }
  }

  function getCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.cart);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (_) {
      return [];
    }
  }

  function setCart(cart) {
    localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
  }

  function getSales() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.sales);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (_) {
      return [];
    }
  }

  function setSales(sales) {
    localStorage.setItem(STORAGE_KEYS.sales, JSON.stringify(sales));
  }

  function getSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.settings);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch (_) {
      return {};
    }
  }

  function setSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
  }

  // --- Navigation ---
  function initNav() {
    var sections = document.querySelectorAll('.section');
    var navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var sectionId = btn.getAttribute('data-section');
        navBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        sections.forEach(function (sec) {
          sec.classList.remove('active');
          if (sec.id === 'section-' + sectionId) sec.classList.add('active');
        });
        if (sectionId === 'manage-menu') renderMenuTable();
        if (sectionId === 'report') setReportMonthToCurrent();
      });
    });
  }

  // --- Order: menu grid and add to cart ---
  function renderMenuGrid() {
    var menu = getMenu() || [];
    var grid = document.getElementById('menu-grid');
    if (!grid) return;
    grid.innerHTML = '';
    menu.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'menu-card';
      card.dataset.id = item.id;
      var imgUrl = resolveMenuItemImageUrl(item);
      var img = '<img class="menu-card-image" src="' + escapeHtml(imgUrl) + '" alt="' + escapeHtml(item.name) + '" loading="lazy">';
      card.innerHTML =
        '<div class="menu-card-image-wrap">' + img + '</div>' +
        '<div class="menu-card-body">' +
        '<p class="menu-card-name">' + escapeHtml(item.name) + '</p>' +
        '<p class="menu-card-price">₹' + Number(item.price).toFixed(2) + '</p>' +
        '<button type="button" class="menu-card-add" data-id="' + escapeHtml(item.id) + '" data-name="' + escapeHtml(item.name) + '" data-price="' + Number(item.price) + '">Add</button>' +
        '</div>';
      grid.appendChild(card);
    });
    grid.querySelectorAll('.menu-card-add').forEach(function (btn) {
      btn.addEventListener('click', function () {
        addToCart({
          id: btn.dataset.id,
          name: btn.dataset.name,
          price: parseFloat(btn.dataset.price)
        });
      });
    });
  }

  function escapeHtml(s) {
    if (s == null) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function addToCart(item) {
    var cart = getCart();
    var found = cart.find(function (c) { return c.id === item.id; });
    if (found) {
      found.qty = (found.qty || 1) + 1;
    } else {
      cart.push({ id: item.id, name: item.name, price: item.price, qty: 1 });
    }
    setCart(cart);
    renderCartBill();
  }

  function renderCartBill() {
    var cart = getCart();
    var container = document.getElementById('cart-items');
    var subtotalEl = document.getElementById('cart-subtotal');
    if (!container || !subtotalEl) return;
    if (cart.length === 0) {
      container.innerHTML = '<p class="cart-empty">Cart is empty.</p>';
      subtotalEl.textContent = '₹0.00';
      return;
    }
    var total = 0;
    container.innerHTML = cart.map(function (c) {
      var lineTotal = c.price * (c.qty || 1);
      total += lineTotal;
      return '<div class="cart-item">' +
        '<span class="cart-item-name">' + escapeHtml(c.name) + '</span>' +
        '<span class="cart-item-qty">×' + (c.qty || 1) + '</span>' +
        '<span class="cart-item-total">₹' + lineTotal.toFixed(2) + '</span>' +
        '</div>';
    }).join('');
    subtotalEl.textContent = '₹' + total.toFixed(2);
  }

  function clearCart() {
    setCart([]);
    renderCartBill();
  }

  function initCartActions() {
    document.getElementById('btn-clear-cart')?.addEventListener('click', clearCart);
  }

  // --- Pay now modal and QR ---
  function openPayModal() {
    var cart = getCart();
    if (cart.length === 0) {
      alert('Cart is empty. Add items first.');
      return;
    }
    var modal = document.getElementById('pay-modal');
    var img = document.getElementById('pay-qr-image');
    var placeholder = document.getElementById('pay-qr-placeholder');
    var qrUrl = (getSettings().qrImageUrl || '').trim() || DEFAULT_QR_URL;
    img.src = qrUrl;
    img.alt = 'Scan to pay';
    img.classList.add('visible');
    placeholder.classList.add('hidden');
    img.onerror = function () {
      img.classList.remove('visible');
      placeholder.classList.remove('hidden');
    };
    img.onload = function () {
      img.classList.add('visible');
      placeholder.classList.add('hidden');
    };
    modal.setAttribute('aria-hidden', 'false');
  }

  function closePayModal() {
    document.getElementById('pay-modal')?.setAttribute('aria-hidden', 'true');
  }

  function markPaidAndClose() {
    var cart = getCart();
    if (cart.length === 0) {
      closePayModal();
      return;
    }
    var total = cart.reduce(function (sum, c) {
      return sum + c.price * (c.qty || 1);
    }, 0);
    var sales = getSales();
    sales.push({
      dateIso: new Date().toISOString(),
      items: cart.map(function (c) { return { name: c.name, qty: c.qty || 1, price: c.price }; }),
      total: total
    });
    setSales(sales);
    setCart([]);
    renderCartBill();
    closePayModal();
  }

  function initPayModal() {
    document.getElementById('btn-pay-now')?.addEventListener('click', openPayModal);
    document.getElementById('btn-close-modal')?.addEventListener('click', closePayModal);
    document.getElementById('btn-done-paid')?.addEventListener('click', markPaidAndClose);
    document.getElementById('pay-modal')?.addEventListener('click', function (e) {
      if (e.target === this) closePayModal();
    });
  }

  // --- Print bill ---
  function getJsPdfConstructor() {
    if (typeof window.jsPDF === 'function') return window.jsPDF;
    if (window.jspdf && typeof window.jspdf.jsPDF === 'function') return window.jspdf.jsPDF;
    if (window.jspdf && typeof window.jspdf.default === 'function') return window.jspdf.default;
    return null;
  }

  function printBill() {
    var cart = getCart();
    if (cart.length === 0) {
      alert('Cart is empty. Nothing to print.');
      return;
    }
    var total = cart.reduce(function (sum, c) { return sum + c.price * (c.qty || 1); }, 0);
    var rows = cart.map(function (c) {
      var qty = c.qty || 1;
      var lineTotal = c.price * qty;
      return [
        escapeHtml(c.name),
        qty.toString(),
        'Rs. ' + c.price.toFixed(2),
        'Rs. ' + lineTotal.toFixed(2)
      ];
    });

    var JsPdf = getJsPdfConstructor();
    if (JsPdf) {
      var doc = new JsPdf();
      doc.setFontSize(16);
      doc.text('Restaurant Bill', 14, 20);
      doc.setFontSize(10);
      doc.text('Date: ' + new Date().toLocaleString(), 14, 28);

      if (typeof doc.autoTable === 'function') {
        doc.autoTable({
          startY: 34,
          head: [['Item', 'Qty', 'Price', 'Total']],
          body: rows,
          theme: 'grid',
          headStyles: { fillColor: [61, 50, 37], textColor: 255 },
          styles: { fontSize: 10, cellPadding: 3 },
          columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'center' },
            2: { halign: 'center' },
            3: { halign: 'center' }
          }
        });
      } else {
        var y = 34;
        doc.setFontSize(10);
        doc.text('Item', 14, y);
        doc.text('Qty', 90, y, { align: 'right' });
        doc.text('Price', 130, y, { align: 'right' });
        doc.text('Total', 180, y, { align: 'right' });
        y += 8;
        rows.forEach(function (row) {
          doc.text(row[0], 14, y);
          doc.text(row[1], 90, y, { align: 'center' });
          doc.text(row[2], 130, y, { align: 'center' });
          doc.text(row[3], 180, y, { align: 'center' });
          y += 8;
        });
      }

      var finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 100;
      doc.setFontSize(12);
      doc.text('Total Price: Rs. ' + total.toFixed(2), 14, finalY);
      doc.save('bill.pdf');
      return;
    }

    var area = document.getElementById('bill-print-area');
    if (!area) return;

    var lines = rows.map(function (row) {
      return '<tr>' +
        '<td>' + row[0] + '</td>' +
        '<td style="text-align:right;">' + row[1] + '</td>' +
        '<td style="text-align:right;">' + row[2] + '</td>' +
        '<td style="text-align:right;">' + row[3] + '</td>' +
        '</tr>';
    }).join('');

    area.innerHTML = '<div class="print-bill-content">' +
      '<h2>Bill</h2>' +
      '<p>Date: ' + new Date().toLocaleString() + '</p>' +
      '<table style="width:100%; border-collapse:collapse; margin-top:1rem;">' +
      '<thead><tr>' +
      '<th style="border-bottom:1px solid #333; text-align:left; padding:0.25rem 0;">Item</th>' +
      '<th style="border-bottom:1px solid #333; text-align:right; padding:0.25rem 0;">Qty</th>' +
      '<th style="border-bottom:1px solid #333; text-align:right; padding:0.25rem 0;">Price</th>' +
      '<th style="border-bottom:1px solid #333; text-align:right; padding:0.25rem 0;">Total</th>' +
      '</tr></thead>' +
      '<tbody>' + lines + '</tbody>' +
      '</table>' +
      '<p style="margin-top:1rem; font-size:1.1rem;"><strong>Total Price: Rs. ' + total.toFixed(2) + '</strong></p>' +
      '</div>';
    area.removeAttribute('aria-hidden');

    window.print();
    area.innerHTML = '';
    area.setAttribute('aria-hidden', 'true');
  }

  function initPrintBill() {
    document.getElementById('btn-print-bill')?.addEventListener('click', printBill);
  }

  // --- Manage menu CRUD ---
  function renderMenuTable() {
    var menu = getMenu() || [];
    var tbody = document.getElementById('menu-table-body');
    if (!tbody) return;
    if (menu.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4">No items. Add one below.</td></tr>';
      return;
    }
    tbody.innerHTML = menu.map(function (item) {
      return '<tr data-id="' + escapeHtml(item.id) + '">' +
        '<td>' + escapeHtml(item.name) + '</td>' +
        '<td>₹' + Number(item.price).toFixed(2) + '</td>' +
        '<td>' + (item.imageUrl ? '<span title="' + escapeHtml(item.imageUrl) + '">Yes</span>' : '—') + '</td>' +
        '<td>' +
        '<button type="button" class="btn-edit">Edit</button>' +
        '<button type="button" class="btn-delete">Delete</button>' +
        '</td></tr>';
    }).join('');
    tbody.querySelectorAll('.btn-edit').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = btn.closest('tr');
        var id = row.dataset.id;
        var menu = getMenu() || [];
        var item = menu.find(function (m) { return m.id === id; });
        if (!item) return;
        document.getElementById('menu-edit-id').value = item.id;
        document.getElementById('menu-name').value = item.name;
        document.getElementById('menu-price').value = item.price;
        document.getElementById('menu-image').value = item.imageUrl || '';
        document.getElementById('btn-save-item').textContent = 'Update item';
      });
    });
    tbody.querySelectorAll('.btn-delete').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var row = btn.closest('tr');
        var id = row.dataset.id;
        if (!confirm('Delete this item?')) return;
        var menu = (getMenu() || []).filter(function (m) { return m.id !== id; });
        setMenu(menu);
        renderMenuTable();
        renderMenuGrid();
      });
    });
  }

  function submitMenuItem(e) {
    e.preventDefault();
    var id = document.getElementById('menu-edit-id').value.trim();
    var name = document.getElementById('menu-name').value.trim();
    var price = parseFloat(document.getElementById('menu-price').value);
    var imageUrl = (document.getElementById('menu-image').value || '').trim();
    if (!name || isNaN(price) || price < 0) {
      alert('Please enter a valid name and price.');
      return;
    }
    var menu = getMenu() || [];
    if (id) {
      var idx = menu.findIndex(function (m) { return m.id === id; });
      if (idx !== -1) {
        menu[idx] = { id: menu[idx].id, name: name, price: price, imageUrl: imageUrl };
      }
    } else {
      menu.push({ id: generateId(), name: name, price: price, imageUrl: imageUrl });
    }
    setMenu(menu);
    document.getElementById('form-menu-item').reset();
    document.getElementById('menu-edit-id').value = '';
    document.getElementById('btn-save-item').textContent = 'Add item';
    renderMenuTable();
    renderMenuGrid();
  }

  function cancelEdit() {
    document.getElementById('form-menu-item').reset();
    document.getElementById('menu-edit-id').value = '';
    document.getElementById('btn-save-item').textContent = 'Add item';
  }

  function resetMenuToDefaults() {
    if (!confirm('Reset the menu to default items? This will remove any custom menu changes.')) return;
    setMenu(DEFAULT_MENU.map(function (item) { return { ...item, id: item.id || generateId() }; }));
    renderMenuTable();
    renderMenuGrid();
    alert('Menu reset to default items.');
  }

  function initManageMenu() {
    document.getElementById('form-menu-item')?.addEventListener('submit', submitMenuItem);
    document.getElementById('btn-cancel-edit')?.addEventListener('click', cancelEdit);
    document.getElementById('btn-reset-menu')?.addEventListener('click', resetMenuToDefaults);
  }

  // --- Monthly report ---
  function setReportMonthToCurrent() {
    var input = document.getElementById('report-month');
    if (!input) return;
    var now = new Date();
    var month = String(now.getMonth() + 1).padStart(2, '0');
    input.value = now.getFullYear() + '-' + month;
    showReport();
  }

  function showReport() {
    var input = document.getElementById('report-month');
    var totalEl = document.getElementById('report-total');
    var countEl = document.getElementById('report-count');
    var ordersEl = document.getElementById('report-orders');
    if (!input || !totalEl || !countEl || !ordersEl) return;
    var val = input.value;
    if (!val) {
      totalEl.textContent = 'Total sales: —';
      countEl.textContent = 'Order count: —';
      ordersEl.innerHTML = '';
      return;
    }
    var sales = getSales();
    var [y, m] = val.split('-').map(Number);
    var filtered = sales.filter(function (s) {
      var d = new Date(s.dateIso);
      return d.getFullYear() === y && d.getMonth() + 1 === m;
    });
    var total = filtered.reduce(function (sum, s) { return sum + (s.total || 0); }, 0);
    totalEl.textContent = 'Total sales: ₹' + total.toFixed(2);
    countEl.textContent = 'Order count: ' + filtered.length;
    if (filtered.length === 0) {
      ordersEl.innerHTML = '<p>No orders in this month.</p>';
    } else {
      ordersEl.innerHTML = filtered.map(function (s) {
        var date = new Date(s.dateIso).toLocaleString();
        return '<div class="report-order-row">' + date + ' — ₹' + (s.total || 0).toFixed(2) + '</div>';
      }).join('');
    }
  }

  function initReport() {
    document.getElementById('btn-show-report')?.addEventListener('click', showReport);
  }

  // --- Settings ---
  function loadSettings() {
    var s = getSettings();
    var input = document.getElementById('settings-qr-url');
    if (input) input.value = s.qrImageUrl || '';
  }

  function saveSettings() {
    var input = document.getElementById('settings-qr-url');
    var url = (input?.value || '').trim();
    setSettings({ qrImageUrl: url });
    alert('Settings saved.');
  }

  function initSettings() {
    loadSettings();
    document.getElementById('btn-save-settings')?.addEventListener('click', saveSettings);
  }

  // --- Init ---
  function init() {
    seedMenuIfEmpty();
    initNav();
    renderMenuGrid();
    renderCartBill();
    initCartActions();
    initPayModal();
    initPrintBill();
    initManageMenu();
    initReport();
    initSettings();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
