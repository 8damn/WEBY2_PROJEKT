// src/auth.js
// Odpovědnost: Adam Diblík (IR08 – Autentizace a technická autorizace)
//
// Tato vrstva řeší TECHNICKÉ uchování identity (token/session).
// Nerozhoduje o právech – to patří do business logiky (selectors, dispatch).
//
// Inspirace: authApi.js z referenčního projektu (Mgr. Daniela Ponce, Ph.D., 2026)

const TOKEN_KEY = "authToken";

// -------------------------------------------------------
// Kryptografické pomocné funkce
// -------------------------------------------------------

// Jednosměrný hash hesla pomocí Web Crypto API (SHA-256).
// Hesla se NIKDY neukládají v plaintextu.
// Funkce je async – crypto.subtle.digest vrací Promise.
export async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest("SHA-256", data);

    const hashArray = Array.from(new Uint8Array(hash));
    const hashHex = hashArray
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");

    return hashHex;
}

// Generuje unikátní token pro přihlášenou session.
// Formát: "{userId}_{UUID}" – identifikátor uživatele + náhodná část.
export function generateToken(userId) {
    return `${userId}_${crypto.randomUUID()}`;
}

// -------------------------------------------------------
// SessionStorage – uchování tokenu přes F5
// -------------------------------------------------------

// Uloží token do SessionStorage (smaže se po zavření záložky).
export function saveAuthToken(token) {
    sessionStorage.setItem(TOKEN_KEY, token);
}

// Vymaže token při odhlášení.
export function clearAuthToken() {
    sessionStorage.removeItem(TOKEN_KEY);
}

// Vrátí uložený token nebo null.
export function getAuthToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

// -------------------------------------------------------
// Obnova session po F5
// -------------------------------------------------------

// Obnoví přihlášeného uživatele ze SessionStorage.
// Hledá uživatele v datech aplikace podle uloženého tokenu.
//
// Technická pravidla:
//   - BLOCKED účet → session se okamžitě zruší (trvalá blokace)
//   - REGISTERED účet → session se zruší (neověřený účet nesmí být obnoven)
//   - SUSPENDED účet → obnova proběhne (omezení řeší business logika)
export function restoreUserFromToken(users) {
    const token = getAuthToken();
    if (!token) return null;

    const user = users.find(u => u.token === token);

    if (!user) {
        clearAuthToken();
        return null;
    }
    if (user.status === "BLOCKED" || user.status === "REGISTERED") {
        clearAuthToken();
        return null;
    }

    return user;
}