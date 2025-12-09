  /****************************************************************
   * MangaStore Online - HTML/CSS/JS completo
   * - Registro/Login (localStorage)
   * - Catálogo de mangas (array de productos)
   * - Carrito por usuario (localStorage)
   * - Checkout -> ticket + QR
   *
   * Nota: este archivo está diseñado para fines educativos y de entrega
   * de la actividad. No usar contraseñas en texto plano en producción.
   ****************************************************************/

  /* -------------------------
     Utilidades / manejo de storage
  --------------------------*/
  const STORAGE_KEYS = {
    USERS: 'mangastore_users_v1',
    PRODUCTS: 'mangastore_products_v1', // optional persist
    SESSION: 'mangastore_session_v1'
  };

  // Guardar/leer JSON de localStorage
  function save(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function load(key, fallback=null) {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  }

  // Encode simple (NO ES SEGURO, solo demostración)
  function encodePassword(p){ return btoa(p); }
  function decodePassword(p){ try { return atob(p); }catch(e){return p;} }

  /* -------------------------
     Productos (mangas físicos) - precios en centavos para evitar floats
     (precio unitario expresado en ARS, sin centavos -> se usa entero)
  --------------------------*/
  const SAMPLE_PRODUCTS = [
    { id:'m001', title:'Jujutsu Kaisen Vol.1', author:'Gege Akutami', editorial:'Shueisha', price:12000, stock:12, img: 'https://source.unsplash.com/400x600/?manga,anime,book' },
    { id:'m002', title:'Chainsaw Man Vol.1', author:'Tatsuki Fujimoto', editorial:'Shueisha', price:11000, stock:8, img: 'https://source.unsplash.com/400x600/?chainsaw,comic,book' },
    { id:'m003', title:'One Piece Vol.1', author:'Eiichiro Oda', editorial:'Shueisha', price:10000, stock:20, img: 'https://source.unsplash.com/400x600/?onepiece,manga,comic' },
    { id:'m004', title:'Berserk Vol.1 (Deluxe)', author:'Kentaro Miura', editorial:'Hakusensha', price:45000, stock:4, img: 'https://source.unsplash.com/400x600/?berserk,comic,book' },
    { id:'m005', title:'Akira Vol.1', author:'Katsuhiro Otomo', editorial:'Kodansha', price:22000, stock:6, img: 'https://source.unsplash.com/400x600/?akira,manga,book' },
    { id:'m006', title:'My Hero Academia Vol.1', author:'Kohei Horikoshi', editorial:'Shueisha', price:9500, stock:14, img: 'https://source.unsplash.com/400x600/?myheroacademy,manga,book' },
    { id:'m007', title:'Death Note Vol.1', author:'Tsugumi Ohba', editorial:'Shueisha', price:13000, stock:11, img: 'https://source.unsplash.com/400x600/?deathnote,manga,book' },
    { id:'m008', title:'Vagabond Vol.1', author:'Takehiko Inoue', editorial:'Kodansha', price:26000, stock:7, img: 'https://source.unsplash.com/400x600/?vagabond,manga,book' },
    { id:'m009', title:'Fullmetal Alchemist Vol.1', author:'Hiromu Arakawa', editorial:'Square Enix', price:14000, stock:10, img: 'https://source.unsplash.com/400x600/?fullmetal,manga,book' },
    { id:'m010', title:'Tokyo Ghoul Vol.1', author:'Sui Ishida', editorial:'Shueisha', price:11500, stock:9, img: 'https://source.unsplash.com/400x600/?tokyoghoul,manga,book' },
    { id:'m011', title:'Hunter x Hunter Vol.1', author:'Yoshihiro Togashi', editorial:'Shueisha', price:12500, stock:13, img: 'https://source.unsplash.com/400x600/?hunterxhunter,manga,book' },
    { id:'m012', title:'Neon Genesis Evangelion Vol.1', author:'Yoshiyuki Sadamoto', editorial:'Kadokawa', price:20000, stock:5, img: 'https://source.unsplash.com/400x600/?evangelion,manga,book' }
  ];

  // Inicializar productos en localStorage si no existen (para persistencia)
  if (!load(STORAGE_KEYS.PRODUCTS)) {
    save(STORAGE_KEYS.PRODUCTS, SAMPLE_PRODUCTS);
  }
  let PRODUCTS = load(STORAGE_KEYS.PRODUCTS, SAMPLE_PRODUCTS);

  /* -------------------------
     Autenticación (registro / login)
  --------------------------*/
  function getUsers(){ return load(STORAGE_KEYS.USERS, []); }
  function saveUsers(users){ save(STORAGE_KEYS.USERS, users); }

  function registerUser({username, email, password}){
    username = username.trim().toLowerCase();
    const users = getUsers();
    if (users.find(u=>u.username === username)) throw new Error('El nombre de usuario ya existe.');
    if (users.find(u=>u.email === email)) throw new Error('El email ya está registrado.');
    users.push({ username, email, password: encodePassword(password), createdAt: new Date().toISOString() });
    saveUsers(users);
    return true;
  }

  function loginUser({username, password}){
    username = username.trim().toLowerCase();
    const users = getUsers();
    const user = users.find(u=>u.username === username);
    if (!user) throw new Error('Usuario no encontrado.');
    if (user.password !== encodePassword(password)) throw new Error('Contraseña incorrecta.');
    const session = { username: user.username, email: user.email, since: new Date().toISOString() };
    save(STORAGE_KEYS.SESSION, session);
    return session;
  }

  function logoutUser(){
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }

  function getSession(){ return load(STORAGE_KEYS.SESSION, null); }

  /* -------------------------
     Carrito (persistente por usuario)
  --------------------------*/
  function cartKeyFor(user){ return `mangastore_cart_${user}`; }
  function ordersKeyFor(user){ return `mangastore_orders_${user}`; }

  function loadCart(user){
    if (!user) return []; // guest
    return load(cartKeyFor(user), []);
  }
  function saveCart(user, cart){
    if (!user) return;
    save(cartKeyFor(user), cart);
  }

  function addToCart(user, productId, qty=1){
    if (!user) throw new Error('Debes iniciar sesión para agregar al carrito.');
    const cart = loadCart(user);
    const p = PRODUCTS.find(x=>x.id===productId);
    if (!p) throw new Error('Producto no encontrado.');
    const found = cart.find(i=>i.id===productId);
    const max = p.stock;
    if (found){
      found.qty = Math.min(max, found.qty + qty);
    } else {
      cart.push({ id: p.id, title: p.title, price: p.price, qty: Math.min(max, qty), img: p.img });
    }
    saveCart(user, cart);
    return cart;
  }

  function updateQty(user, productId, qty){
    if (!user) return;
    const cart = loadCart(user);
    const item = cart.find(i=>i.id===productId);
    if (!item) return;
    const p = PRODUCTS.find(x=>x.id===productId);
    item.qty = Math.max(1, Math.min(qty, p.stock));
    saveCart(user, cart);
  }
  function removeFromCart(user, productId){
    if (!user) return;
    let cart = loadCart(user);
    cart = cart.filter(i=>i.id!==productId);
    saveCart(user, cart);
    return cart;
  }
  function clearCart(user){
    if (!user) return;
    save(cartKeyFor(user), JSON.stringify([])); // safety
    saveCart(user, []);
  }

  /* -------------------------
     Checkout / ordenes
  --------------------------*/
  function finalizePurchase(user){
    if (!user) throw new Error('Inicia sesión para finalizar');
    const cart = loadCart(user);
    if (!cart || cart.length===0) throw new Error('El carrito está vacío.');
    // crear orden: id, date, items, total
    const total = cart.reduce((s,i)=> s + (i.price * i.qty), 0);
    const orderId = 'ORD-' + Date.now().toString(36).toUpperCase();
    const order = {
      id: orderId,
      date: new Date().toISOString(),
      items: cart,
      total: total
    };
    const orders = load(ordersKeyFor(user), []);
    orders.push(order);
    save(ordersKeyFor(user), orders);
    // descontar stock
    order.items.forEach(it=>{
      const p = PRODUCTS.find(x=>x.id===it.id);
      if (p) p.stock = Math.max(0, p.stock - it.qty);
    });
    save(STORAGE_KEYS.PRODUCTS, PRODUCTS);
    // vaciar carrito
    saveCart(user, []);
    return order;
  }

  /* -------------------------
     UI: render catálogo y carrito
  --------------------------*/
  const catalogEl = document.getElementById('catalog');
  const emptyCatalogEl = document.getElementById('emptyCatalog');
  const cartListEl = document.getElementById('cartList');
  const subtotalEl = document.getElementById('subtotal');
  const cartCountEl = document.getElementById('cartCount');
  const sessionUserEl = document.getElementById('sessionUser');

  function formatPrice(n){
    // n in ARS (integer)
    return '$' + n.toLocaleString('es-AR');
  }

  function renderCatalog(products){
    catalogEl.innerHTML = '';
    if (!products || products.length===0){
      emptyCatalogEl.style.display = 'block';
      return;
    }
    emptyCatalogEl.style.display = 'none';
    products.forEach(p=>{
      const card = document.createElement('article');
      card.className = 'card';
      card.innerHTML = `
        <div class="thumb" aria-hidden><img alt="${p.title} portada" src="${p.img}"></div>
        <div class="meta">
          <div class="title">${p.title}</div>
          <div class="subtitle">${p.author} · ${p.editorial}</div>
          <div class="row" style="justify-content:space-between;align-items:center">
            <div>
              <div class="price">${formatPrice(p.price)}</div>
              <div class="stock small-muted">Stock: ${p.stock}</div>
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
              <button class="btn" data-add="${p.id}" ${p.stock===0? 'disabled':''}>Agregar</button>
              <button class="btn secondary" data-view="${p.id}">Ver</button>
            </div>
          </div>
        </div>
      `;
      catalogEl.appendChild(card);
    });
  }

  function renderCartFor(user){
    cartListEl.innerHTML = '';
    const cart = user ? loadCart(user) : [];
    if (!cart || cart.length===0){
      cartListEl.innerHTML = `<div class="empty">Tu carrito está vacío. Agregá mangas desde el catálogo.</div>`;
      subtotalEl.textContent = formatPrice(0);
      cartCountEl.textContent = '0';
      return;
    }
    cart.forEach(item=>{
      const el = document.createElement('div');
      el.className = 'cart-item';
      el.innerHTML = `
        <div class="cart-thumb"><img alt="${item.title} portada" src="${item.img}" /></div>
        <div class="cart-details">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <div>
              <div style="font-weight:700">${item.title}</div>
              <div class="small-muted">${formatPrice(item.price)}</div>
            </div>
            <div class="text-right">
              <div class="small-muted">Subtotal</div>
              <div style="font-weight:800">${formatPrice(item.price * item.qty)}</div>
            </div>
          </div>
          <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
            <div class="qty-controls">
              <button class="btn secondary" data-decrease="${item.id}">-</button>
              <span class="chip" style="min-width:34px;text-align:center">${item.qty}</span>
              <button class="btn secondary" data-increase="${item.id}">+</button>
            </div>
            <div style="flex:1"></div>
            <button class="btn ghost" data-remove="${item.id}">Eliminar</button>
          </div>
        </div>
      `;
      cartListEl.appendChild(el);
    });
    const subtotal = cart.reduce((s,i)=> s + (i.price * i.qty), 0);
    subtotalEl.textContent = formatPrice(subtotal);
    cartCountEl.textContent = cart.reduce((s,i)=> s + i.qty, 0);
  }

  /* -------------------------
     Eventos globales / inicialización
  --------------------------*/
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const btnOpenLogin = document.getElementById('btnOpenLogin');
  const btnOpenRegister = document.getElementById('btnOpenRegister');
  const btnViewCart = document.getElementById('btnViewCart');
  const btnCheckout = document.getElementById('btnCheckout');
  const btnClearCart = document.getElementById('btnClearCart');

  // Modal helpers
  const modalBackdrop = document.getElementById('modalBackdrop');
  const modal = document.getElementById('modal');

  function openModal(contentHtml){
    modal.innerHTML = contentHtml;
    modalBackdrop.style.display = 'flex';
    modalBackdrop.setAttribute('aria-hidden','false');
    // focus first input if exists
    setTimeout(()=> {
      const input = modal.querySelector('input,button,select,textarea');
      if (input) input.focus();
    }, 50);
  }
  function closeModal(){
    modalBackdrop.style.display = 'none';
    modalBackdrop.setAttribute('aria-hidden','true');
    modal.innerHTML = '';
  }

  modalBackdrop.addEventListener('click', (e)=>{
    if (e.target === modalBackdrop) closeModal();
  });

  // Render initially
  renderCatalog(PRODUCTS);
  renderAuthState();

  // Update render when clicking add/view/detail buttons in the catalog
  catalogEl.addEventListener('click', (e)=>{
    const add = e.target.closest('[data-add]');
    const view = e.target.closest('[data-view]');
    if (add){
      const pid = add.getAttribute('data-add');
      const session = getSession();
      if (!session){
        // prompt login modal
        openLoginModal('Necesitás iniciar sesión para agregar al carrito.');
        return;
      }
      try {
        addToCart(session.username, pid, 1);
        renderCartFor(session.username);
        toast('Agregado al carrito');
      } catch(err){
        toast(err.message, true);
      }
      return;
    }
    if (view){
      const pid = view.getAttribute('data-view');
      const p = PRODUCTS.find(x=>x.id===pid);
      openModal(`<h3>${p.title}</h3>
        <div style="display:flex;gap:12px">
          <div style="width:160px"><img alt="${p.title}" src="${p.img}" style="width:100%;border-radius:8px"/></div>
          <div>
            <div class="small-muted">Autor: <strong>${p.author}</strong></div>
            <div class="small-muted">Editorial: <strong>${p.editorial}</strong></div>
            <div style="margin-top:8px;font-weight:800">${formatPrice(p.price)}</div>
            <div class="small-muted">Stock: ${p.stock}</div>
            <div style="margin-top:12px;display:flex;gap:8px">
              <button class="btn" id="vAdd">Agregar al carrito</button>
              <button class="btn secondary" id="vClose">Cerrar</button>
            </div>
          </div>
        </div>
      `);
      // delegate inside modal
      modal.querySelector('#vClose').addEventListener('click', closeModal);
      modal.querySelector('#vAdd').addEventListener('click', ()=>{
        const session = getSession();
        if (!session){ openLoginModal('Necesitás iniciar sesión para agregar al carrito.'); return; }
        try {
          addToCart(session.username, pid, 1);
          renderCartFor(session.username);
          closeModal();
          toast('Agregado al carrito');
        } catch(err){
          toast(err.message, true);
        }
      });
    }
  });

  // Cart controls (increase/decrease/remove) - delegate
  cartListEl.addEventListener('click', e=>{
    const session = getSession();
    if (!session) { toast('Inicia sesión para modificar el carrito', true); return; }
    const inc = e.target.closest('[data-increase]');
    const dec = e.target.closest('[data-decrease]');
    const rem = e.target.closest('[data-remove]');
    if (inc){
      const id = inc.getAttribute('data-increase');
      const cart = loadCart(session.username);
      const item = cart.find(i=>i.id===id);
      updateQty(session.username, id, item.qty + 1);
      renderCartFor(session.username);
    } else if (dec){
      const id = dec.getAttribute('data-decrease');
      const cart = loadCart(session.username);
      const item = cart.find(i=>i.id===id);
      updateQty(session.username, id, item.qty - 1);
      renderCartFor(session.username);
    } else if (rem){
      const id = rem.getAttribute('data-remove');
      removeFromCart(session.username, id);
      renderCartFor(session.username);
    }
  });

  // Search & sort
  function applyFilters(){
    const q = searchInput.value.trim().toLowerCase();
    let list = PRODUCTS.slice();
    if (q){
      list = list.filter(p => p.title.toLowerCase().includes(q) || p.author.toLowerCase().includes(q));
    }
    const sort = sortSelect.value;
    if (sort === 'price-asc') list.sort((a,b)=> a.price - b.price);
    else if (sort === 'price-desc') list.sort((a,b)=> b.price - a.price);
    // popular is default (original order)
    renderCatalog(list);
  }
  searchInput.addEventListener('input', applyFilters);
  sortSelect.addEventListener('change', applyFilters);

  // Auth UI
  btnOpenRegister.addEventListener('click', ()=> openRegisterModal());
  btnOpenLogin.addEventListener('click', ()=> openLoginModal());
  btnViewCart.addEventListener('click', ()=> {
    // toggle scroll to cart / open modal with cart details
    openModal(`<h3>Tu carrito</h3>
      <div id="modalCartContent"></div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button id="mCheckout" class="btn">Finalizar compra</button>
        <button id="mClose" class="btn secondary">Cerrar</button>
      </div>
    `);
    document.getElementById('modalCartContent').appendChild(cartListEl.cloneNode(true));
    document.getElementById('mClose').addEventListener('click', closeModal);
    document.getElementById('mCheckout').addEventListener('click', ()=> {
      closeModal();
      handleCheckout();
    });
  });

  btnClearCart.addEventListener('click', ()=>{
    const s = getSession();
    if (!s) { toast('Inicia sesión para vaciar el carrito', true); return; }
    if (!confirm('¿Vaciar todo el carrito?')) return;
    saveCart(s.username, []);
    renderCartFor(s.username);
    toast('Carrito vaciado');
  });

  btnCheckout.addEventListener('click', handleCheckout);

  function handleCheckout(){
    const s = getSession();
    if (!s){
      openLoginModal('Necesitás iniciar sesión para finalizar la compra.');
      return;
    }
    const cart = loadCart(s.username);
    if (!cart || cart.length===0){ toast('El carrito está vacío', true); return; }
    // show confirmation modal
    const subtotal = cart.reduce((s,i)=> s + (i.price * i.qty), 0);
    openModal(`<h3>Confirmar compra</h3>
      <div class="small-muted">Usuario: <strong>${s.username}</strong></div>
      <div style="margin-top:8px">
        ${cart.map(it=>`<div style="display:flex;justify-content:space-between;margin-bottom:8px"><div>${it.title} × ${it.qty}</div><div>${formatPrice(it.price * it.qty)}</div></div>`).join('')}
      </div>
      <div class="divider"></div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="small-muted">Total</div>
        <div style="font-weight:900">${formatPrice(subtotal)}</div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button id="confirmBuy" class="btn">Pagar</button>
        <button id="cancelBuy" class="btn secondary">Cancelar</button>
      </div>
    `);
    modal.querySelector('#cancelBuy').addEventListener('click', closeModal);
    modal.querySelector('#confirmBuy').addEventListener('click', ()=>{
      try {
        const order = finalizePurchase(s.username);
        closeModal();
        openOrderModal(order);
        renderCatalog(PRODUCTS);
        renderCartFor(s.username);
        renderAuthState(); // update stock and counts
        toast('Compra finalizada', false, 2500);
      } catch(err){
        toast(err.message, true);
      }
    });
  }

  // Order modal (ticket + QR)
  function openOrderModal(order){
    openModal(`<h3>Ticket de compra</h3>
      <div style="display:flex;gap:12px">
        <div style="flex:1">
          <div class="small-muted">ID: <strong>${order.id}</strong></div>
          <div class="small-muted">Fecha: <strong>${new Date(order.date).toLocaleString()}</strong></div>
          <div style="margin-top:12px">
            ${order.items.map(it=>`<div style="display:flex;justify-content:space-between;margin-bottom:6px"><div>${it.title} × ${it.qty}</div><div>${formatPrice(it.price*it.qty)}</div></div>`).join('')}
          </div>
          <div class="divider"></div>
          <div style="display:flex;justify-content:space-between">
            <div class="small-muted">Total</div>
            <div style="font-weight:900">${formatPrice(order.total)}</div>
          </div>
        </div>
        <div style="width:180px;text-align:center">
          <div id="qrcode"></div>
          <div class="small-muted" style="margin-top:8px">Escaneá para ver tu ticket</div>
        </div>
      </div>
      <div style="margin-top:12px;display:flex;gap:8px">
        <button id="closeTicket" class="btn">Cerrar</button>
      </div>
    `);
    // Generate QR with order URL (simulated). We'll encode order info as JSON in the QR.
    const qrContainer = document.getElementById('qrcode');
    qrContainer.innerHTML = '';
    const q = new QRCode(qrContainer, {
      text: JSON.stringify({ id: order.id, date: order.date, total: order.total }),
      width: 160,
      height: 160,
      colorDark : "#000000",
      colorLight : "#ffffff00",
      correctLevel : QRCode.CorrectLevel.H
    });
    document.getElementById('closeTicket').addEventListener('click', closeModal);
  }

  /* -------------------------
     Auth modals
  --------------------------*/
  function openRegisterModal(){
    openModal(`<h3>Registro</h3>
      <div>
        <label>Nombre de usuario</label>
        <input id="regUser" class="field" placeholder="Nombre de Usuario" />
        <label style="margin-top:8px">Email</label>
        <input id="regEmail" class="field" placeholder="tu@correo.com" />
        <label style="margin-top:8px">Contraseña</label>
        <input id="regPass" class="field" type="password" placeholder="********" />
        <div style="margin-top:12px;display:flex;gap:8px">
          <button id="regSubmit" class="btn">Crear cuenta</button>
          <button id="regCancel" class="btn secondary">Cancelar</button>
        </div>
      </div>
    `);
    modal.querySelector('#regCancel').addEventListener('click', closeModal);
    modal.querySelector('#regSubmit').addEventListener('click', ()=>{
      const u = modal.querySelector('#regUser').value;
      const e = modal.querySelector('#regEmail').value;
      const p = modal.querySelector('#regPass').value;
      try {
        if (!u || !e || !p) throw new Error('Completá todos los campos.');
        registerUser({username:u,email:e,password:p});
        toast('Cuenta creada. Ahora podés iniciar sesión.');
        closeModal();
      } catch(err){
        toast(err.message, true);
      }
    });
  }

  function openLoginModal(message){
    openModal(`<h3>Iniciar sesión</h3>
      ${message ? `<div class="small-muted" style="margin-bottom:8px">${message}</div>` : ''}
      <div>
        <label>Nombre de usuario</label>
        <input id="logUser" class="field" placeholder="Nombre de Usuario" />
        <label style="margin-top:8px">Contraseña</label>
        <input id="logPass" class="field" type="password" placeholder="********" />
        <div style="margin-top:12px;display:flex;gap:8px">
          <button id="logSubmit" class="btn">Entrar</button>
          <button id="logCancel" class="btn secondary">Cancelar</button>
        </div>
      </div>
    `);
    modal.querySelector('#logCancel').addEventListener('click', closeModal);
    modal.querySelector('#logSubmit').addEventListener('click', ()=>{
      const u = modal.querySelector('#logUser').value;
      const p = modal.querySelector('#logPass').value;
      try {
        if (!u || !p) throw new Error('Completá todos los campos.');
        const session = loginUser({username:u,password:p});
        toast('Bienvenido, ' + session.username);
        closeModal();
        renderAuthState();
      } catch(err){
        toast(err.message, true);
      }
    });
  }

  // update header/auth UI
  function renderAuthState(){
    const session = getSession();
    if (session){
      sessionUserEl.textContent = session.username;
      // show logout button
      document.getElementById('authArea').innerHTML = `
        <div class="row">
          <div class="small-muted">Hola, <strong>${session.username}</strong></div>
          <button id="btnLogout" class="btn secondary">Cerrar sesión</button>
          <button id="btnViewOrders" class="btn ghost">Mis compras</button>
          <button id="btnViewCart2" class="btn ghost">Carrito 🛒 <span id="cartCount" class="chip">0</span></button>
        </div>
      `;
      document.getElementById('btnLogout').addEventListener('click', ()=>{
        if (!confirm('¿Cerrar sesión?')) return;
        logoutUser();
        renderAuthState();
        renderCartFor(null);
        toast('Sesión cerrada');
      });
      document.getElementById('btnViewOrders').addEventListener('click', ()=>{
        openOrdersModal(session.username);
      });
      document.getElementById('btnViewCart2').addEventListener('click', ()=>{
        renderCartFor(session.username);
        btnViewCart.click(); // reuse existing handler
      });
      // render cart for current user
      renderCartFor(session.username);
    } else {
      // show login/register buttons
      document.getElementById('authArea').innerHTML = `
        <button id="btnOpenLogin" class="btn">Iniciar sesión</button>
        <button id="btnOpenRegister" class="btn secondary">Registrarse</button>
        <button id="btnViewCart" class="btn ghost">Carrito 🛒 <span id="cartCount" class="chip">0</span></button>
      `;
      // restore event listeners (since innerHTML replaced)
      document.getElementById('btnOpenLogin').addEventListener('click', ()=> openLoginModal());
      document.getElementById('btnOpenRegister').addEventListener('click', ()=> openRegisterModal());
      document.getElementById('btnViewCart').addEventListener('click', ()=> { btnViewCart.click() });
      sessionUserEl.textContent = 'Invitado';
      renderCartFor(null);
    }
  }

  function openOrdersModal(username){
    const orders = load(ordersKeyFor(username), []);
    if (!orders || orders.length===0){
      openModal(`<h3>Mis compras</h3><div class="empty">No hay compras registradas.</div><div style="margin-top:12px"><button id="cClose" class="btn">Cerrar</button></div>`);
      modal.querySelector('#cClose').addEventListener('click', closeModal);
      return;
    }
    openModal(`<h3>Mis compras</h3>
      <div>${orders.map(o=>`<div style="padding:8px;border-radius:8px;background:rgba(255,255,255,0.02);margin-bottom:8px">
        <div style="display:flex;justify-content:space-between"><div><strong>${o.id}</strong><div class="small-muted">${new Date(o.date).toLocaleString()}</div></div><div style="font-weight:800">${formatPrice(o.total)}</div></div>
        </div>`).join('')}</div>
      <div style="margin-top:12px"><button id="cClose" class="btn">Cerrar</button></div>
    `);
    modal.querySelector('#cClose').addEventListener('click', closeModal);
  }

  /* -------------------------
     Simple toast notifications
  --------------------------*/
  function toast(msg, isError=false, timeout=1400){
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;right:18px;bottom:18px;padding:12px 16px;border-radius:10px;background:' + (isError? 'rgba(239,68,68,0.92)' : 'rgba(16,185,129,0.92)') + ';color:#021;z-index:9999;font-weight:700';
    document.body.appendChild(t);
    setTimeout(()=> t.style.opacity = '0.0', timeout - 200);
    setTimeout(()=> t.remove(), timeout);
  }

  // initial render of cart counts (for guest is zero)
  renderCatalog(PRODUCTS);
  renderAuthState();

  // Make sure catalog updates when products change elsewhere
  window.addEventListener('storage', (e)=>{
    if (e.key === STORAGE_KEYS.PRODUCTS){
      PRODUCTS = load(STORAGE_KEYS.PRODUCTS);
      renderCatalog(PRODUCTS);
      const s = getSession();
      renderCartFor(s? s.username : null);
    }
  });
