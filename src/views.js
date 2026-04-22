// src/views.js
import { appState } from './state.js';
import { getAvailableItems, getUserReservations, isAdmin, getActiveLoans, getAllUsers } from './selectors.js';
import * as hnd from './handlers.js';

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
        if (c) el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(c) : c);
    });
    return el;
}

function renderLogin() {
    return h('article', null, 
        h('h2', null, 'Přihlášení'), 
        appState.ui.error ? h('p', { class: 'error-message' }, appState.ui.error) : null,
        h('form', { onSubmit: hnd.onLogin }, 
            h('input', { name: 'email', placeholder: 'Email', required: 'true' }), 
            h('button', { type: 'submit' }, 'Vstoupit')
        )
    );
}

function renderCustomer() {
    const items = getAvailableItems(appState);
    const res = getUserReservations(appState);
    
    return h('div', null, 
        h('h3', null, 'Katalog dostupných předmětů'), 
        h('div', { class: 'grid' }, ...items.map(i => 
            h('div', { class: 'card' }, 
                h('strong', null, i.name), 
                h('button', { class: 'outline', style: 'margin-top:10px;', onClick: () => hnd.onReserve(i.id) }, 'Rezervovat')
            )
        )),
        h('hr', null),
        h('h4', null, 'Mé rezervace'), 
        h('ul', null, ...res.map(r => 
            h('li', { style: 'margin-bottom:10px;' }, 
                `Předmět ID: ${r.itemId} (Stav: ${r.status}) `, 
                (r.status === 'PENDING' || r.status === 'CONFIRMED') 
                    ? h('button', { class: 'secondary outline', style: 'padding: 2px 10px; margin-left: 10px;', onClick: () => hnd.onCancelRes(r.id, r.itemId) }, 'Zrušit') 
                    : null
            )
        ))
    );
}

function renderAdmin() {
    return h('div', null, 
        h('h3', { style: 'color: var(--form-element-invalid-active-border-color);' }, 'Administrátorský panel'),
        
        h('section', { class: 'card' }, 
            h('h4', null, '1. Nové rezervace (Ke schválení)'), 
            h('ul', null, ...appState.data.reservations.filter(r => r.status === 'PENDING').map(r => 
                h('li', null, `Zákazník ${r.userId} chce předmět ${r.itemId} `, 
                    h('button', { style: 'padding: 2px 10px; margin-left: 10px;', onClick: () => hnd.onConfirmRes(r.id) }, 'Potvrdit'),
                    h('button', { class: 'secondary outline', style: 'padding: 2px 10px; margin-left: 5px;', onClick: () => hnd.onExpireReservation(r.id) }, 'Propadlo')
                )
            ))
        ),
        
        h('section', { class: 'card' }, 
            h('h4', null, '2. K vydání zákazníkovi (Potvrzené)'), 
            h('ul', null, ...appState.data.reservations.filter(r => r.status === 'CONFIRMED').map(r => 
                h('li', null, `Předmět ${r.itemId} pro ${r.userId} `, 
                    h('button', { style: 'padding: 2px 10px; margin-left: 10px;', onClick: () => hnd.onFulfillRes(r) }, 'Vydat (Zahájit výpůjčku)'),
                    h('button', { class: 'secondary outline', style: 'padding: 2px 10px; margin-left: 5px;', onClick: () => hnd.onExpireReservation(r.id) }, 'Propadlo')
                )
            ))
        ),  

        h('section', { class: 'card' }, 
            h('h4', null, '3. Aktivní výpůjčky (K vrácení)'), 
            h('table', { role: 'grid' }, 
                h('thead', null, h('tr', null, h('th', null, 'Předmět'), h('th', null, 'Zákazník'), h('th', null, 'Akce'))),
                h('tbody', null, ...getActiveLoans(appState).map(l => 
                    h('tr', null, 
                        h('td', null, l.itemId), 
                        h('td', null, l.userId), 
                        h('td', null, 
                            h('button', { style: 'padding: 2px 10px;', onClick: () => hnd.onReturn(l.id, false) }, 'Vrátit v pořádku'),
                            h('button', { class: 'secondary', style: 'padding: 2px 10px; margin-left: 5px;', onClick: () => hnd.onReturn(l.id, true) }, 'Vrátit poškozené')
                        )
                    )
                ))
            )
        ),
        
        h('section', { class: 'card' }, 
            h('h4', null, '4. Sklad a údržba'), 
            h('ul', null, ...appState.data.items.filter(i => i.status === 'IN_REPAIR').map(i => 
                h('li', null, `Poškozeno: ${i.name} `, h('button', { style: 'padding: 2px 10px; margin-left: 10px;', onClick: () => hnd.onFix(i.id) }, 'Opraveno (Vrátit do nabídky)'))
            ))
        ),

        h('section', { class: 'card' }, 
            h('h4', null, '5. Správa uživatelů (Bezpečnost)'), 
            h('ul', null, ...getAllUsers(appState).map(u => 
                h('li', { style: 'margin-bottom: 10px;' }, 
                    `Uživatel: ${u.email} (Stav: ${u.status}) `,
                    
                    // Tlačítko na odblokování (zobrazí se jen pro SUSPENDED a BLOCKED)
                    (u.status === 'SUSPENDED' || u.status === 'BLOCKED') 
                        ? h('button', { style: 'padding: 2px 10px; margin-left: 10px;', onClick: () => hnd.onManageUser(u.id, 'VERIFY') }, 'Odblokovat') 
                        : null,
                        
                    // Tlačítko na zablokování (zobrazí se všem kromě už zablokovaných a admina)
                    (u.status !== 'BLOCKED' && u.role !== 'ADMIN')
                        ? h('button', { class: 'secondary', style: 'padding: 2px 10px; margin-left: 5px;', onClick: () => hnd.onManageUser(u.id, 'BLOCK') }, 'Zablokovat') 
                        : null
                )
            ))
        )
    );
}

export function renderApp() {
    const root = document.getElementById('app');
    while (root.firstChild) root.removeChild(root.firstChild);
    
    if (appState.ui.currentRoute === "login" || !appState.auth.currentUser) {
        root.appendChild(renderLogin());
    } else {
        const header = h('nav', { style: 'margin-bottom: 2rem; border-bottom: 1px solid #ccc; padding-bottom: 1rem;' }, 
            h('ul', null, h('li', null, h('strong', null, `Přihlášen: ${appState.auth.currentUser.email}`))), 
            h('ul', null, h('li', null, h('button', { onClick: hnd.onLogout, class: 'secondary outline' }, 'Odhlásit')))
        );
        const errorMsg = appState.ui.error ? h('article', { class: 'error-message' }, appState.ui.error) : null;
        const loader = appState.ui.loading ? h('progress', null) : null;
        
        root.appendChild(h('div', null, header, errorMsg, loader, isAdmin(appState) ? renderAdmin() : renderCustomer()));
    }
}