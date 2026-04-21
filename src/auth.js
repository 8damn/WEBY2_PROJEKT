// src/auth.js

// Uloží ID uživatele do SessionStorage (paměť prohlížeče, která se smaže po zavření záložky)
export function saveAuthToken(userId) {
    sessionStorage.setItem("authToken", userId);
}

// Vymaže ID uživatele při odhlášení
export function clearAuthToken() {
    sessionStorage.removeItem("authToken");
}

// Přečte uložené ID (používá se např. při startu aplikace)
export function getAuthToken() {
    return sessionStorage.getItem("authToken");
}