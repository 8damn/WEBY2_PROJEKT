// autor: Jan Hofmann (IR03)
// asynchronni volani, simulace api
import { hashPassword, generateToken } from './auth.js';

function delay(ms = 400) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function isPasswordCorrect(user, password) {
    const hashed = await hashPassword(password);
    return hashed === user.hashedPassword;
}


export function createAuthApi(db) {
    return {

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
            user.token = token;

            return { status: "SUCCESS", role: user.role, userId: user.id, token };
        },

        async logout(token) {
            await delay(200);

            if (!token) {
                return { status: "REJECTED", reason: "Neplatný token." };
            }

            const user = db.users.find(u => u.token === token);
            if (!user) {
                return { status: "REJECTED", reason: "Neplatný token." };
            }
            
            user.token = null;

            return { status: "SUCCESS", userId: user.id };
        },
    };
}

export function fetchReserveItem(itemId) {
    return new Promise(resolve => {
        setTimeout(() => resolve({ success: true, itemId }), 500);
    });
}