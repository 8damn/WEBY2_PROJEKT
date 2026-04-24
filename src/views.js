// src/views.js
// Odpovědnost: Max Jasinek (IR06 – Renderovací logika)
import { appState } from './state.js';
import { dispatchAction } from './dispatch.js';
import { getAvailableItems, getUserReservations, getUserLoans, isAdmin, getActiveLoans, getAllUsers } from './selectors.js';
import * as hnd from './handlers.js';

// -------------------------------------------------------
// Pomocná funkce pro tvorbu DOM prvků (žádné innerHTML)
// -------------------------------------------------------
function h(tag, props, ...children) {
    const el = document.createElement(tag);
    if (props) {
        Object.entries(props).forEach(([k, v]) => {
            if (k.startsWith('on') && typeof v === 'function') {
                el.addEventListener(k.toLowerCase().slice(2), v);
            } else {
                el.setAttribute(k, v);
            }
        });
    }
    children.forEach(c => {
        if (c) el.appendChild(typeof c === 'string' || typeof c === 'number'
            ? document.createTextNode(c) : c);
    });
    return el;
}

// -------------------------------------------------------
// NotificationComponent
// Inspirováno NotificationComponent.js z referenčního projektu
// (Mgr. Daniela Ponce, Ph.D., 2026)
// -------------------------------------------------------

// Injektuje CSS styly pro toast notifikace (jednou při načtení modulu).
(function injectNotificationStyles() {
    const style = document.createElement("style");
    style.textContent = `
        .notification {
            animation: fadeOut 3s forwards;
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            border-radius: 6px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            white-space: nowrap;
        }
        .success { background-color: #2e7d32; }
        .warning { background-color: #e65100; }
        @keyframes fadeOut {
            0%   { opacity: 1; }
            70%  { opacity: 1; }
            100% { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
})();

// Vrátí DOM element notifikace nebo null.
// Po skončení CSS animace (3 s) odešle CLEAR_NOTIFICATION a element se odstraní ze stavu.
function NotificationComponent(notification) {
    if (!notification) return null;

    const { type, message } = notification;

    const el = document.createElement("div");
    el.className = `notification ${type.toLowerCase()}`;
    el.textContent = message;

    return el;
}

// -------------------------------------------------------
// AuthenticationView
// Inspirováno AuthenticationView.js z referenčního projektu učitelky.
// Pohled dostane data z selektoru a handlers – nezná dispatch přímo.
// -------------------------------------------------------

function AuthenticationView({ isLoggedIn, capabilities, handlers }) {
    const { canLogin, canRegister, canLogout } = capabilities;
    const { onLogin, onRegister, onLogout } = handlers;

    const container = document.createElement("div");

    const title = document.createElement("h2");
    title.textContent = isLoggedIn ? "Přihlášen" : "Přihlášení / Registrace";
    container.appendChild(title);

    // Loading indikátor viditelný i na přihlašovací stránce
    if (appState.ui.loading) {
        const loader = document.createElement("progress");
        container.appendChild(loader);
    }

    // Chybová zpráva
    if (appState.ui.error) {
        const err = document.createElement("p");
        err.className = "error-message";
        err.style.cssText = "color:#c62828;background:#ffebee;padding:8px 12px;border-radius:4px;margin:8px 0;";
        err.textContent = appState.ui.error;
        container.appendChild(err);
    }

    // Odhlášení
    if (canLogout && onLogout) {
        const btn = document.createElement("button");
        btn.textContent = "Odhlásit se";
        btn.addEventListener("click", onLogout);
        container.appendChild(btn);
        return container;
    }

    // Přihlašovací formulář
    if (canLogin && onLogin) {
        const loginForm = document.createElement("form");

        const emailInput = document.createElement("input");
        emailInput.name = "email";
        emailInput.type = "email";
        emailInput.placeholder = "E-mail";
        emailInput.required = true;
        loginForm.appendChild(emailInput);

        const passwordInput = document.createElement("input");
        passwordInput.name = "password";
        passwordInput.type = "password";
        passwordInput.placeholder = "Heslo";
        passwordInput.required = true;
        loginForm.appendChild(passwordInput);

        const btnLogin = document.createElement("button");
        btnLogin.type = "submit";
        btnLogin.textContent = appState.ui.loading ? "Přihlašuji…" : "Přihlásit se";
        btnLogin.disabled = appState.ui.loading;
        loginForm.appendChild(btnLogin);

        loginForm.addEventListener("submit", onLogin);
        container.appendChild(loginForm);
    }

    // Registrační formulář
    if (canRegister && onRegister) {
        const separator = document.createElement("hr");
        container.appendChild(separator);

        const regTitle = document.createElement("h3");
        regTitle.textContent = "Nový účet";
        container.appendChild(regTitle);

        const regForm = document.createElement("form");

        const regEmailInput = document.createElement("input");
        regEmailInput.name = "regEmail";
        regEmailInput.type = "email";
        regEmailInput.placeholder = "E-mail";
        regEmailInput.required = true;
        regForm.appendChild(regEmailInput);

        const regPasswordInput = document.createElement("input");
        regPasswordInput.name = "regPassword";
        regPasswordInput.type = "password";
        regPasswordInput.placeholder = "Heslo (min. 4 znaky)";
        regPasswordInput.required = true;
        regForm.appendChild(regPasswordInput);

        const btnRegister = document.createElement("button");
        btnRegister.type = "submit";
        btnRegister.textContent = appState.ui.loading ? "Registruji…" : "Zaregistrovat se";
        btnRegister.disabled = appState.ui.loading;
        regForm.appendChild(btnRegister);

        regForm.addEventListener("submit", onRegister);
        container.appendChild(regForm);
    }

    return container;
}

// Selektor pohledu autentizace – vychází ze selectAuthenticationView učitelky.
function selectAuthenticationView(state) {
    const isLoggedIn = state.auth.currentUser !== null;
    return {
        isLoggedIn,
        capabilities: {
            canLogin:    !isLoggedIn,
            canRegister: !isLoggedIn,
            canLogout:   isLoggedIn,
        },
    };
}

// -------------------------------------------------------
// Zákaznický pohled
// -------------------------------------------------------
// Lidsky čitelné popisky stavů předmětů
const ITEM_STATUS_LABEL = {
    AVAILABLE:   'Dostupný',
    RESERVED:    'Rezervován (čeká na schválení)',
    UNAVAILABLE: 'Momentálně půjčen',
    IN_REPAIR:   'V opravě',
    RETIRED:     'Vyřazen',
};

function renderCustomer() {
    const availableItems = getAvailableItems(appState);
    // Nedostupné předměty – zákazník vidí proč katalog není plný
    const unavailableItems = appState.data.items.filter(i =>
        i.status === 'RESERVED' || i.status === 'UNAVAILABLE' || i.status === 'IN_REPAIR'
    );
    const res   = getUserReservations(appState);
    const loans = getUserLoans(appState);

    const errorEl = appState.ui.error
        ? h('p', { style: 'color:#c62828;background:#ffebee;padding:8px 12px;border-radius:4px;margin:8px 0;' }, appState.ui.error)
        : null;
    const loaderEl = appState.ui.loading ? h('progress', null) : null;

    return h('div', null,
        errorEl,
        loaderEl,
        h('h3', null, 'Katalog dostupných předmětů'),
        availableItems.length === 0
            ? h('p', null, 'Momentálně žádný předmět k dispozici.')
            : h('div', { class: 'grid' }, ...availableItems.map(i =>
                h('div', { class: 'card' },
                    h('strong', null, i.name),
                    h('small', { style: 'color:#2e7d32;' }, '✓ ' + (ITEM_STATUS_LABEL[i.status] || i.status)),
                    h('div', { class: 'date-group' },
                        h('label', { for: 'from-' + i.id }, 'Od'),
                        h('input', { id: 'from-' + i.id, type: 'date' }),
                        h('label', { for: 'to-' + i.id }, 'Do'),
                        h('input', { id: 'to-' + i.id, type: 'date' })
                    ),
                    h('button', { class: 'outline btn-reserve', onClick: () => hnd.onReserve(i.id) }, 'Rezervovat')
                )
            )),

        unavailableItems.length > 0
            ? h('div', null,
                h('h4', null, 'Momentálně nedostupné předměty'),
                h('div', { class: 'grid' }, ...unavailableItems.map(i =>
                    h('div', { class: 'card', style: 'opacity:0.55;' },
                        h('strong', null, i.name),
                        h('small', { style: 'color:#888;' }, '✗ ' + (ITEM_STATUS_LABEL[i.status] || i.status))
                    )
                ))
              )
            : null,

        h('hr', null),

        h('h4', null, 'Mé rezervace'),
        res.length === 0
            ? h('p', null, 'Nemáte žádné rezervace.')
            : h('ul', null, ...res.map(r => {
                const itemName = (appState.data.items.find(i => i.id === r.itemId) || {}).name || r.itemId;
                return h('li', { class: 'list-item-spaced' },
                    itemName + ' (Stav: ' + r.status + ') | Termín: ' + (r.requestedFrom || '-') + ' až ' + (r.requestedTo || '-') + ' ',
                    (r.status === 'PENDING' || r.status === 'CONFIRMED')
                        ? h('div', { class: 'term-edit-group' },
                            h('input', { id: 'edit-from-' + r.id, type: 'date', value: r.requestedFrom || '' }),
                            h('input', { id: 'edit-to-' + r.id, type: 'date', value: r.requestedTo || '', class: 'input-date-gap' }),
                            h('button', { class: 'btn-action', onClick: () => hnd.onChangeReservationTerm(r.id) }, 'Změnit termín'),
                            h('button', { class: 'secondary outline btn-action-alt', onClick: () => hnd.onCancelRes(r.id, r.itemId) }, 'Zrušit')
                          )
                        : null
                );
              })),
        h('hr', null),

        h('h4', null, 'Mé výpůjčky'),
        loans.length === 0
            ? h('p', null, 'Žádné aktivní výpůjčky.')
            : h('ul', null, ...loans.map(l => {
                const itemName = (appState.data.items.find(i => i.id === l.itemId) || {}).name || l.itemId;
                return h('li', { class: 'list-item-spaced' },
                    itemName + ' (Stav: ' + l.status + ') | Vrátit do: ' + (l.dueDate || 'neurčeno') + ' ',
                    h('button', { class: 'secondary btn-action-alt', onClick: () => hnd.onReportLoss(l.id) }, 'Nahlásit ztrátu / odcizení')
                );
              }))
    );
}

// -------------------------------------------------------
// Administrátorský pohled
// -------------------------------------------------------
// Barevné odznaky stavů pro admin panel
const ITEM_STATUS_COLOR = {
    AVAILABLE:   '#2e7d32',
    RESERVED:    '#e65100',
    UNAVAILABLE: '#1565c0',
    IN_REPAIR:   '#6a1b9a',
    RETIRED:     '#555',
};

function renderAdmin() {
    const pendingUsers = appState.data.users.filter(u => u.status === 'REGISTERED');

    return h('div', null,
        h('h3', { class: 'admin-heading' }, 'Administrátorský panel'),

        pendingUsers.length > 0
            ? h('section', { class: 'card' },
                h('h4', null, '0. Čeká na ověření účtu'),
                h('ul', null, ...pendingUsers.map(u =>
                    h('li', { class: 'list-item-spaced' },
                        'Nový uživatel: ' + u.email + ' ',
                        h('button', { class: 'btn-action', onClick: () => hnd.onManageUser(u.id, 'VERIFY') }, 'Ověřit účet')
                    )
                ))
            ) : null,

        h('section', { class: 'card' },
            h('h4', null, '1. Nové rezervace (Ke schválení)'),
            appState.data.reservations.filter(r => r.status === 'PENDING').length === 0
                ? h('p', null, 'Žádné čekající rezervace.')
                : h('ul', null, ...appState.data.reservations.filter(r => r.status === 'PENDING').map(r => {
                    const uEmail = (appState.data.users.find(u => u.id === r.userId) || {}).email || r.userId;
                    const iName  = (appState.data.items.find(i => i.id === r.itemId) || {}).name  || r.itemId;
                    return h('li', null,
                        uEmail + ' → ' + iName + ' | Termín: ' + (r.requestedFrom || '-') + ' až ' + (r.requestedTo || '-') + ' ',
                        h('button', { class: 'btn-action', onClick: () => hnd.onConfirmRes(r.id) }, 'Potvrdit'),
                        h('button', { class: 'secondary outline btn-action-alt', onClick: () => hnd.onCancelRes(r.id, r.itemId) }, 'Odmítnout')
                    );
                  }))
        ),

        h('section', { class: 'card' },
            h('h4', null, '2. K vydání zákazníkovi (Potvrzené)'),
            appState.data.reservations.filter(r => r.status === 'CONFIRMED').length === 0
                ? h('p', null, 'Žádné rezervace k vydání.')
                : h('ul', null, ...appState.data.reservations.filter(r => r.status === 'CONFIRMED').map(r => {
                    const uEmail = (appState.data.users.find(u => u.id === r.userId) || {}).email || r.userId;
                    const iName  = (appState.data.items.find(i => i.id === r.itemId) || {}).name  || r.itemId;
                    return h('li', null,
                        iName + ' pro ' + uEmail + ' | Vrátit do: ' + (r.requestedTo || '-') + ' ',
                        h('button', { class: 'btn-action', onClick: () => hnd.onFulfillRes(r) }, 'Vydat (Zahájit výpůjčku)'),
                        h('button', { class: 'secondary outline btn-action-alt', onClick: () => hnd.onCancelRes(r.id, r.itemId) }, 'Odmítnout')
                    );
                  }))
        ),

        h('section', { class: 'card' },
            h('h4', null, '3. Aktivní výpůjčky (K vrácení)'),
            getActiveLoans(appState).length === 0
                ? h('p', null, 'Žádné aktivní výpůjčky.')
                : h('table', { role: 'grid' },
                    h('thead', null, h('tr', null,
                        h('th', null, 'Předmět'), h('th', null, 'Zákazník'),
                        h('th', null, 'Vrátit do'), h('th', null, 'Stav'), h('th', null, 'Akce')
                    )),
                    h('tbody', null, ...getActiveLoans(appState).map(l => {
                        const uEmail = (appState.data.users.find(u => u.id === l.userId) || {}).email || l.userId;
                        const iName  = (appState.data.items.find(i => i.id === l.itemId) || {}).name  || l.itemId;
                        return h('tr', null,
                            h('td', null, iName),
                            h('td', null, uEmail),
                            h('td', null, l.dueDate || 'neurčeno'),
                            h('td', null, l.status),
                            h('td', null,
                                h('button', { class: 'btn-compact', onClick: () => hnd.onReturn(l.id, false) }, 'Vrátit v pořádku'),
                                h('button', { class: 'secondary btn-action-alt', onClick: () => hnd.onReturn(l.id, true) }, 'Vrátit poškozené')
                            )
                        );
                    }))
                )
        ),

        h('section', { class: 'card' },
            h('h4', null, '4. Přehled skladu'),
            h('table', { role: 'grid' },
                h('thead', null, h('tr', null,
                    h('th', null, 'Název'), h('th', null, 'Stav'), h('th', null, 'Akce')
                )),
                h('tbody', null, ...appState.data.items
                    .filter(i => i.status !== 'RETIRED')
                    .map(i => h('tr', null,
                        h('td', null, i.name),
                        h('td', null,
                            h('span', { style: 'color:' + (ITEM_STATUS_COLOR[i.status] || '#333') + ';font-weight:bold;' },
                                ITEM_STATUS_LABEL[i.status] || i.status
                            )
                        ),
                        h('td', null,
                            i.status === 'IN_REPAIR'
                                ? h('button', { class: 'btn-action', onClick: () => hnd.onFix(i.id) }, 'Opraveno')
                                : null,
                            // Vyřadit lze z AVAILABLE, RESERVED nebo IN_REPAIR – dle stavového automatu (* → RETIRED)
                            i.status !== 'UNAVAILABLE'
                                ? h('button', { class: 'secondary btn-action-alt', onClick: () => hnd.onRetire(i.id) }, 'Vyřadit')
                                : null
                        )
                    ))
                )
            )
        ),

        h('section', { class: 'card' },
            h('h4', null, '5. Správa uživatelů (Bezpečnost)'),
            h('ul', null, ...getAllUsers(appState).filter(u => u.status !== 'REGISTERED').map(u =>
                h('li', { class: 'list-item-spaced' },
                    'Uživatel: ' + u.email + ' (Stav: ' + u.status + ') ',
                    (u.status === 'SUSPENDED' || u.status === 'BLOCKED')
                        ? h('button', { class: 'btn-action', onClick: () => hnd.onManageUser(u.id, 'VERIFY') }, 'Odblokovat')
                        : null,
                    (u.status !== 'BLOCKED' && u.role !== 'ADMIN')
                        ? h('button', { class: 'secondary btn-action-alt', onClick: () => hnd.onManageUser(u.id, 'BLOCK') }, 'Zablokovat')
                        : null
                )
            ))
        )
    );
}

// -------------------------------------------------------
// Hlavní render funkce – odběratel store
// -------------------------------------------------------
export function renderApp() {
    const root = document.getElementById('app');
    while (root.firstChild) root.removeChild(root.firstChild);

    if (!appState.auth.currentUser) {
        // Sestavíme viewState a handlers pro AuthenticationView (vzor učitelky)
        const viewState = selectAuthenticationView(appState);
        const handlers  = { onLogin: hnd.onLogin, onRegister: hnd.onRegister, onLogout: hnd.onLogout };
        const authView  = AuthenticationView({ ...viewState, handlers });

        const article = document.createElement("article");
        article.appendChild(authView);
        root.appendChild(article);
    } else {
        const header = h('nav', { class: 'app-header' },
            h('ul', null, h('li', null, h('strong', null, 'Přihlášen: ' + appState.auth.currentUser.email))),
            h('ul', null, h('li', null, h('button', { onClick: hnd.onLogout, class: 'secondary outline' }, 'Odhlásit')))
        );
        // Chyba a loader jsou renderovány uvnitř každého pohledu zvlášť – zde je NEOPAKUJEME.
        root.appendChild(h('div', null,
            header,
            isAdmin(appState) ? renderAdmin() : renderCustomer()
        ));
    }

    // Notifikace jako toast komponenta (vzor učitelky – cv11 Blok 4)
    const notificationEl = NotificationComponent(appState.ui.notification);
    if (notificationEl) {
        root.appendChild(notificationEl);
        // Po skončení CSS animace smažeme notifikaci ze stavu
        notificationEl.addEventListener("animationend", () => {
            dispatchAction({ type: "CLEAR_NOTIFICATION" });
        });
    }
}