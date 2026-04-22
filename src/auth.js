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

// Obnoví přihlášeného uživatele po F5, ale nepustí zablokovaný účet
export function restoreUserFromToken(users) {
    const userId = getAuthToken();
    if (!userId) return null;

    const user = users.find(u => u.id === userId);
    if (!user || user.status === "BLOCKED") {
        clearAuthToken();
        return null;
    }

    return user;
}
