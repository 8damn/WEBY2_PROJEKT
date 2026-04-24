// autor: Max Jasinek (IR06)
// vytvareni UI elementu pomoci createElement
// views nepouziva zadne statusove kontroly - vsechno dostava pres capabilities ze selektoru
import { appState } from './state.js';
import { dispatchAction } from './dispatch.js';
import { selectAuthCapabilities, selectCustomerView, selectAdminView, isAdmin } from './selectors.js';
import * as hnd from './handlers.js';

function today() {
    return new Date().toISOString().split("T")[0];
}

// pomocna fce abychom nemuseli vsude psat document.createElement (zakazano innerHTML)
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
        .success { background-color: green; }
        .warning { background-color: orange; }
        @keyframes fadeOut {
            0%   { opacity: 1; }
            70%  { opacity: 1; }
            100% { opacity: 0; }
        }
    `;
    document.head.appendChild(style);
})();

function NotificationComponent(notification) {
    if (!notification) return null;
    const { type, message } = notification;
    const el = document.createElement("div");
    el.className = `notification ${type.toLowerCase()}`;
    el.textContent = message;
    return el;
}

const ITEM_STATUS_LABEL = {
    AVAILABLE: 'Dostupny',
    RESERVED: 'Rezervovan',
    UNAVAILABLE: 'Momentalne pujcen',
    IN_REPAIR: 'V oprave',
    RETIRED: 'Vyrazen',
};

// komponenta pro prihlaseni a registraci - pouziva capabilities
function AuthenticationView({ capabilities, handlers }) {
    const { canLogin, canRegister, canLogout } = capabilities;
    const { onLogin, onRegister, onLogout } = handlers;

    const container = document.createElement("div");

    const title = document.createElement("h2");
    title.textContent = canLogout ? "Přihlášen" : "Přihlášení / Registrace";
    container.appendChild(title);

    if (appState.ui.loading) {
        container.appendChild(document.createElement("progress"));
    }

    if (appState.ui.error) {
        const err = document.createElement("p");
        err.className = "error-message";
        err.textContent = appState.ui.error;
        container.appendChild(err);
    }

    if (canLogout && onLogout) {
        const btn = document.createElement("button");
        btn.textContent = "Odhlásit se";
        btn.addEventListener("click", onLogout);
        container.appendChild(btn);
        return container;
    }

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
        btnLogin.textContent = appState.ui.loading ? "Přihlašuji..." : "Přihlásit se";
        btnLogin.disabled = appState.ui.loading;
        loginForm.appendChild(btnLogin);

        loginForm.addEventListener("submit", onLogin);
        container.appendChild(loginForm);
    }

    if (canRegister && onRegister) {
        container.appendChild(document.createElement("hr"));

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
        btnRegister.textContent = appState.ui.loading ? "Registruji..." : "Zaregistrovat se";
        btnRegister.disabled = appState.ui.loading;
        regForm.appendChild(btnRegister);

        regForm.addEventListener("submit", onRegister);
        container.appendChild(regForm);
    }

    return container;
}

// hlavni pohled pro zakaznika - pouziva capabilities ze selektoru
function renderCustomer() {
    const view = selectCustomerView(appState);

    const errorEl = view.error
        ? h('p', { class: 'error-message' }, view.error)
        : null;
    const loaderEl = view.loading ? h('progress', null) : null;

    return h('div', null,
        errorEl,
        loaderEl,
        h('h3', null, 'Katalog dostupných předmětů'),
        view.availableItems.length === 0
            ? h('p', null, 'Momentálně žádný předmět k dispozici.')
            : h('div', { class: 'grid' }, ...view.availableItems.map(i =>
                h('div', { class: 'card' },
                    h('strong', null, i.name + ' - '),
                    h('small', { class: 'status-available' }, (ITEM_STATUS_LABEL[i.status] || i.status)),
                    h('div', { class: 'date-group' },
                        h('label', { for: 'from-' + i.id }, 'Od'),
                        h('input', { id: 'from-' + i.id, type: 'date', min: today() }),
                        h('label', { for: 'to-' + i.id }, 'Do'),
                        h('input', { id: 'to-' + i.id, type: 'date', min: today() })
                    ),
                    view.canReserve
                        ? h('button', { class: 'outline btn-reserve', onClick: () => hnd.onReserve(i.id) }, 'Rezervovat')
                        : h('small', { class: 'status-muted' }, 'Účet pozastaven')
                )
            )),

        view.unavailableItems.length > 0
            ? h('div', null,
                h('h4', null, 'Momentálně nedostupné předměty'),
                h('div', { class: 'grid' }, ...view.unavailableItems.map(i =>
                    h('div', { class: 'card disabled-card' },
                        h('strong', null, i.name + ' - '),
                        h('small', { class: 'status-muted' }, (ITEM_STATUS_LABEL[i.status] || i.status))
                    )
                ))
            )
            : null,

        h('hr', null),

        h('h4', null, 'Mé rezervace'),
        view.reservations.length === 0
            ? h('p', null, 'Nemáte žádné rezervace.')
            : h('ul', null, ...view.reservations.map(r =>
                h('li', { class: 'list-item-spaced' },
                    r.itemName + ' (Stav: ' + r.status + ') | Termín: ' + (r.requestedFrom || '-') + ' až ' + (r.requestedTo || '-') + ' ',
                    r.canEdit
                        ? h('div', { class: 'term-edit-group' },
                            h('input', { id: 'edit-from-' + r.id, type: 'date', value: r.requestedFrom || '', min: today() }),
                            h('input', { id: 'edit-to-' + r.id, type: 'date', value: r.requestedTo || '', class: 'input-date-gap', min: today() }),
                            h('button', { class: 'btn-action', onClick: () => hnd.onChangeReservationTerm(r.id) }, 'Změnit termín'),
                            r.canCancel
                                ? h('button', { class: 'secondary outline btn-action-alt', onClick: () => hnd.onCancelRes(r.id, r.itemId) }, 'Zrušit')
                                : null
                        )
                        : null
                )
            )),
        h('hr', null),

        h('h4', null, 'Mé výpůjčky'),
        view.loans.length === 0
            ? h('p', null, 'Žádné aktivní výpůjčky.')
            : h('ul', null, ...view.loans.map(l =>
                h('li', { class: 'list-item-spaced' },
                    l.itemName + ' (Stav: ' + l.status + ') | Vrátit do: ' + (l.dueDate || 'neurčeno') + ' ',
                    l.canReportLoss
                        ? h('button', { class: 'secondary btn-action-alt', onClick: () => hnd.onReportLoss(l.id) }, 'Nahlásit ztrátu / odcizení')
                        : null
                )
            ))
    );
}

// pohled pro spravce systemu - pouziva capabilities ze selektoru
function renderAdmin() {
    const view = selectAdminView(appState);

    return h('div', null,
        h('h3', { class: 'admin-heading' }, 'Administrátorský panel'),

        view.pendingUsers.length > 0
            ? h('section', { class: 'card' },
                h('h4', null, '0. Čeká na ověření účtu'),
                h('ul', null, ...view.pendingUsers.map(u =>
                    h('li', { class: 'list-item-spaced' },
                        'Nový uživatel: ' + u.email + ' ',
                        u.canVerify
                            ? h('button', { class: 'btn-action', onClick: () => hnd.onManageUser(u.id, 'VERIFY') }, 'Ověřit účet')
                            : null
                    )
                ))
            ) : null,

        h('section', { class: 'card' },
            h('h4', null, '1. Nové rezervace (Ke schválení)'),
            view.pendingReservations.length === 0
                ? h('p', null, 'Žádné čekající rezervace.')
                : h('ul', null, ...view.pendingReservations.map(r =>
                    h('li', null,
                        r.userEmail + ' → ' + r.itemName + ' | Termín: ' + (r.requestedFrom || '-') + ' až ' + (r.requestedTo || '-') + ' ',
                        r.canConfirm ? h('button', { class: 'btn-action', onClick: () => hnd.onConfirmRes(r.id) }, 'Potvrdit') : null,
                        r.canReject ? h('button', { class: 'secondary outline btn-action-alt', onClick: () => hnd.onCancelRes(r.id, r.itemId) }, 'Odmítnout') : null
                    )
                ))
        ),

        h('section', { class: 'card' },
            h('h4', null, '2. K vydání zákazníkovi (Potvrzené)'),
            view.confirmedReservations.length === 0
                ? h('p', null, 'Žádné rezervace k vydání.')
                : h('ul', null, ...view.confirmedReservations.map(r =>
                    h('li', null,
                        r.itemName + ' pro ' + r.userEmail + ' | Vrátit do: ' + (r.requestedTo || '-') + ' ',
                        r.canFulfill ? h('button', { class: 'btn-action', onClick: () => hnd.onFulfillRes(r) }, 'Vydat (Zahájit výpůjčku)') : null,
                        r.canReject ? h('button', { class: 'secondary outline btn-action-alt', onClick: () => hnd.onCancelRes(r.id, r.itemId) }, 'Odmítnout') : null
                    )
                ))
        ),

        h('section', { class: 'card' },
            h('h4', null, '3. Aktivní výpůjčky (K vrácení)'),
            view.activeLoans.length === 0
                ? h('p', null, 'Žádné aktivní výpůjčky.')
                : h('table', { role: 'grid' },
                    h('thead', null, h('tr', null,
                        h('th', null, 'Předmět'), h('th', null, 'Zákazník'),
                        h('th', null, 'Vrátit do'), h('th', null, 'Stav'), h('th', null, 'Akce')
                    )),
                    h('tbody', null, ...view.activeLoans.map(l =>
                        h('tr', null,
                            h('td', null, l.itemName),
                            h('td', null, l.userEmail),
                            h('td', null, l.dueDate || 'neurčeno'),
                            h('td', null, l.status),
                            h('td', null,
                                l.canReturnOk ? h('button', { class: 'btn-compact', onClick: () => hnd.onReturn(l.id, false) }, 'Vrátit v pořádku') : null,
                                l.canReturnDamaged ? h('button', { class: 'secondary btn-action-alt', onClick: () => hnd.onReturn(l.id, true) }, 'Vrátit poškozené') : null
                            )
                        )
                    ))
                )
        ),

        h('section', { class: 'card' },
            h('h4', null, '4. Přehled skladu'),
            h('table', { role: 'grid' },
                h('thead', null, h('tr', null,
                    h('th', null, 'Název'), h('th', null, 'Stav'), h('th', null, 'Akce')
                )),
                h('tbody', null, ...view.items.map(i =>
                    h('tr', null,
                        h('td', null, i.name),
                        h('td', null,
                            h('span', { class: 'status-badge status-' + i.status.toLowerCase() },
                                ITEM_STATUS_LABEL[i.status] || i.status
                            )
                        ),
                        h('td', null,
                            i.canFix ? h('button', { class: 'btn-action', onClick: () => hnd.onFix(i.id) }, 'Opraveno') : null,
                            i.canRetire ? h('button', { class: 'secondary btn-action-alt', onClick: () => hnd.onRetire(i.id) }, 'Vyřadit') : null
                        )
                    )
                ))
            )
        ),

        h('section', { class: 'card' },
            h('h4', null, '5. Správa uživatelů (Bezpečnost)'),
            h('ul', null, ...view.users.map(u =>
                h('li', { class: 'list-item-spaced' },
                    'Uživatel: ' + u.email + ' (Stav: ' + u.status + ') ',
                    u.canUnblock ? h('button', { class: 'btn-action', onClick: () => hnd.onManageUser(u.id, 'VERIFY') }, 'Odblokovat') : null,
                    u.canBlock ? h('button', { class: 'secondary btn-action-alt', onClick: () => hnd.onManageUser(u.id, 'BLOCK') }, 'Zablokovat') : null
                )
            ))
        ),

        h('section', { class: 'card system-tools-card' },
            h('h4', { class: 'system-tools-title' }, '6. Systémové nástroje'),
            h('p', null, 'Následující akce vymaže všechna uložená data v prohlížeči a vrátí aplikaci do továrního nastavení.'),
            h('button', { class: 'secondary btn-danger', onClick: hnd.onResetApp }, 'Resetovat aplikaci (Smazat všechna data)')
        )
    );
}

// hlavni renderovaci funkce
export function renderApp() {
    // vzdycky smazeme cely stary obsah a vygenerujeme ho znova podle novych dat ze state
    const root = document.getElementById('app');
    while (root.firstChild) root.removeChild(root.firstChild);

    // pokud aplikace jeste neni ready, zobrazime loading
    if (appState.ui.status === "LOADING") {
        root.appendChild(h('div', null, h('progress', null), h('p', null, 'Načítání aplikace...')));
        return;
    }

    if (!appState.auth.currentUser) {
        const capabilities = selectAuthCapabilities(appState);
        const handlers = { onLogin: hnd.onLogin, onRegister: hnd.onRegister, onLogout: hnd.onLogout };
        const authView = AuthenticationView({ capabilities, handlers });

        const article = document.createElement("article");
        article.appendChild(authView);
        root.appendChild(article);
    } else {
        const header = h('nav', { class: 'app-header' },
            h('ul', null, h('li', null, h('strong', null, 'Přihlášen: ' + appState.auth.currentUser.email))),
            h('ul', null, h('li', null, h('button', { onClick: hnd.onLogout, class: 'secondary outline' }, 'Odhlásit')))
        );

        root.appendChild(h('div', null,
            header,
            isAdmin(appState) ? renderAdmin() : renderCustomer()
        ));
    }

    const notificationEl = NotificationComponent(appState.ui.notification);
    if (notificationEl) {
        root.appendChild(notificationEl);
        notificationEl.addEventListener("animationend", () => {
            dispatchAction({ type: "CLEAR_NOTIFICATION" });
        });
    }
}