// src/asyncApi.js
// Odpovědnost: Jan Hofmann (IR03 – Asynchronní operace a side-effects)
//
// Simuluje API volání na backend pomocí Promise + setTimeout.
// Autentizační část (createAuthApi) vychází z referenčního projektu
// učitelky (Mgr. Daniela Ponce, Ph.D., 2026) a používá stejný vzor
// tovární funkce a SUCCESS/REJECTED odpovědí.

import { hashPassword, generateToken } from './auth.js';

function delay(ms = 400) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function isPasswordCorrect(user, password) {
    const hashed = await hashPassword(password);
    return hashed === user.hashedPassword;
}

// -------------------------------------------------------
// createAuthApi – tovární funkce autentizačního API
// -------------------------------------------------------
// Přijímá db = { users: [] } – odkaz na data aplikace.
// Vrací objekt s metodami register, login, logout.
// Každá metoda vrací { status: "SUCCESS" | "REJECTED", ... }.
//
// Inspirováno authApi.js z referenčního projektu učitelky.
export function createAuthApi(db) {
    return {
        // Registrace nového zákazníka.
        // Ověří unikátnost emailu, zahashuje heslo, uloží uživatele.
        async register(payload) {
            await delay();

            const { email, password } = payload ?? {};
            if (!email || !password) {
                return { status: "REJECTED", reason: "Vyplňte e-mail a heslo." };
            }
            if (!email.includes("@")) {
                return { status: "REJECTED", reason: "Zadejte platný e-mail." };
            }
            if (password.length < 4) {
                return { status: "REJECTED", reason: "Heslo musí mít alespoň 4 znaky." };
            }

            const exists = db.users.find(u => u.email === email);
            if (exists) {
                return { status: "REJECTED", reason: "Uživatel s tímto e-mailem již existuje." };
            }

            const newUser = {
                id: "u-" + crypto.randomUUID(),
                email,
                hashedPassword: await hashPassword(password),
                role: "CUSTOMER",
                status: "VERIFIED",
                token: null,
            };

            db.users.push(newUser);

            return { status: "SUCCESS" };
        },

        // Přihlášení uživatele.
        // Ověří existenci účtu a správnost hesla.
        // Při úspěchu vygeneruje token a vrátí role + userId + token.
        //
        // Chybová zpráva je záměrně stejná pro neexistující účet i špatné heslo –
        // útočník by jinak mohl zjistit, zda e-mail v systému existuje.
        async login(payload) {
            await delay();

            const { email, password } = payload ?? {};
            if (!email || !password) {
                return { status: "REJECTED", reason: "Neplatné přihlašovací údaje." };
            }

            const user = db.users.find(u => u.email === email);

            if (!user || !(await isPasswordCorrect(user, password))) {
                return { status: "REJECTED", reason: "Neplatné přihlašovací údaje." };
            }
            if (user.status === "BLOCKED") {
                return { status: "REJECTED", reason: "Účet je trvale zablokován." };
            }
            if (user.status === "REGISTERED") {
                return { status: "REJECTED", reason: "Účet čeká na ověření administrátorem." };
            }
            if (user.status === "SUSPENDED") {
                return { status: "REJECTED", reason: "Účet je pozastaven. Kontaktujte správce." };
            }

            const token = generateToken(user.id);

            return { status: "SUCCESS", role: user.role, userId: user.id, token };
        },

        // Odhlášení uživatele.
        // Ověří platnost tokenu – token musí patřit existujícímu uživateli.
        async logout(token) {
            await delay(200);

            if (!token) {
                return { status: "REJECTED", reason: "Neplatný token." };
            }

            const user = db.users.find(u => u.token === token);
            if (!user) {
                return { status: "REJECTED", reason: "Neplatný token." };
            }

            return { status: "SUCCESS", userId: user.id };
        },
    };
}

// -------------------------------------------------------
// Ostatní API (rezervace předmětů)
// -------------------------------------------------------

// Simulace požadavku na rezervaci předmětu.
export function fetchReserveItem(itemId) {
    return new Promise(resolve => {
        setTimeout(() => resolve({ success: true, itemId }), 500);
    });
}