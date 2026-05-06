// autor: Adam Diblik (IR08)
// ukladani a cteni session tokenu
const TOKEN_KEY = "authToken";

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

export function generateToken(userId) {
    return `${userId}_${crypto.randomUUID()}`;
}

export function saveAuthToken(token) {
    sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken() {
    sessionStorage.removeItem(TOKEN_KEY);
}

export function getAuthToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}