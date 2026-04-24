// autor: Jan Hofmann (IR03)
// asynchronni volani, simulace api
// business logika je validovana na strane "serveru" (tady)
import { hashPassword, generateToken } from './auth.js';
import { transitionItemState, transitionLoanState, transitionReservationState, transitionUserState } from './state.js';

function delay(ms = 400) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function isPasswordCorrect(user, password) {
    const hashed = await hashPassword(password);
    return hashed === user.hashedPassword;
}

function today() {
    return new Date().toISOString().split("T")[0];
}

// overi jestli se dva datumove rozsahy prekryvaji
function hasDateOverlap(startA, endA, startB, endB) {
    return startA < endB && endA > startB;
}

function isReservationActive(reservation) {
    return reservation.status !== "CANCELLED"
        && reservation.status !== "EXPIRED"
        && reservation.status !== "FULFILLED";
}

// overi jestli je termin volny pro dany predmet
function hasReservationConflict(reservations, itemId, from, to, ignoreId = null) {
    return reservations
        .filter(r => r.itemId === itemId)
        .filter(r => isReservationActive(r))
        .filter(r => r.id !== ignoreId)
        .some(r => r.requestedFrom && r.requestedTo && hasDateOverlap(from, to, r.requestedFrom, r.requestedTo));
}

// najde uzivatele podle tokenu, vrati null kdyz neni
function authenticateToken(db, token) {
    if (!token) return null;
    return db.users.find(u => u.token === token) || null;
}

export function createApi(db) {
    return {

        async register(payload) {
            await delay();
            const { email, password } = payload ?? {};
            if (!email || !password) return { status: "REJECTED", reason: "Vyplňte e-mail a heslo." };
            if (!email.includes("@")) return { status: "REJECTED", reason: "Zadejte platný e-mail." };
            if (password.length < 4) return { status: "REJECTED", reason: "Heslo musí mít alespoň 4 znaky." };

            if (db.users.find(u => u.email === email)) {
                return { status: "REJECTED", reason: "Uživatel s tímto e-mailem již existuje." };
            }

            const newUser = {
                id: "u-" + crypto.randomUUID(),
                email,
                hashedPassword: await hashPassword(password),
                role: "CUSTOMER",
                status: "REGISTERED",
                token: null,
            };
            db.users.push(newUser);
            return { status: "SUCCESS" };
        },

        async login(payload) {
            await delay();
            const { email, password } = payload ?? {};
            if (!email || !password) return { status: "REJECTED", reason: "Neplatné přihlašovací údaje." };

            const user = db.users.find(u => u.email === email);
            if (!user || !(await isPasswordCorrect(user, password))) {
                return { status: "REJECTED", reason: "Neplatné přihlašovací údaje." };
            }
            if (user.status === "BLOCKED") return { status: "REJECTED", reason: "Účet je trvale zablokován." };
            if (user.status === "REGISTERED") return { status: "REJECTED", reason: "Účet čeká na ověření administrátorem." };
            if (user.status === "SUSPENDED") return { status: "REJECTED", reason: "Účet je pozastaven. Kontaktujte správce." };

            const token = generateToken(user.id);
            user.token = token;
            return { status: "SUCCESS", role: user.role, userId: user.id, token };
        },

        async logout(token) {
            await delay(200);
            const user = authenticateToken(db, token);
            if (!user) return { status: "REJECTED", reason: "Neplatný token." };
            user.token = null;
            return { status: "SUCCESS", userId: user.id };
        },

        // obnova session pri startu aplikace
        async whoAmI(token) {
            await delay(100);
            const user = authenticateToken(db, token);
            if (!user) return { status: "REJECTED", reason: "Neplatný token." };
            if (user.status === "BLOCKED" || user.status === "REGISTERED") {
                return { status: "REJECTED", reason: "Účet není aktivní." };
            }
            return { status: "SUCCESS", user: { id: user.id, email: user.email, role: user.role, status: user.status, token: user.token } };
        },

        // vytvoreni rezervace - vsechna business pravidla jsou tady
        async reserveItem({ token, itemId, from, to }) {
            await delay();
            const user = authenticateToken(db, token);
            if (!user) return { status: "REJECTED", reason: "Nepřihlášen." };
            if (user.status === "SUSPENDED") return { status: "REJECTED", reason: "Účet pozastaven. Nelze provést rezervaci." };

            if (!from || !to) return { status: "REJECTED", reason: "Vyplňte termín Od a Do." };
            if (from < today()) return { status: "REJECTED", reason: "Datum Od nesmí být v minulosti." };
            if (from >= to) return { status: "REJECTED", reason: "Neplatný termín. Datum Od musí být dříve než Do." };

            const item = db.items.find(i => i.id === itemId);
            if (!item || item.status !== "AVAILABLE") return { status: "REJECTED", reason: "Předmět není dostupný." };

            if (hasReservationConflict(db.reservations, itemId, from, to)) {
                return { status: "REJECTED", reason: "Předmět je v tomto termínu již rezervován." };
            }

            // provedeme zmenu stavu
            const idx = db.items.findIndex(i => i.id === itemId);
            db.items[idx] = transitionItemState(db.items[idx], "RESERVE");

            const reservation = {
                id: "res-" + Date.now(),
                itemId, userId: user.id, status: "PENDING",
                requestedFrom: from, requestedTo: to
            };
            db.reservations.push(reservation);

            return { status: "SUCCESS", data: { items: db.items, reservations: db.reservations } };
        },

        // zmena terminu rezervace
        async updateReservationTerm({ token, resId, newFrom, newTo }) {
            await delay(200);
            const user = authenticateToken(db, token);
            if (!user) return { status: "REJECTED", reason: "Nepřihlášen." };

            const res = db.reservations.find(r => r.id === resId);
            if (!res) return { status: "REJECTED", reason: "Rezervace nenalezena." };
            if (res.status !== "PENDING" && res.status !== "CONFIRMED") {
                return { status: "REJECTED", reason: "Termín lze změnit jen u čekající nebo potvrzené rezervace." };
            }
            if (!newFrom || !newTo) return { status: "REJECTED", reason: "Vyplňte termín Od a Do." };
            if (newFrom < today()) return { status: "REJECTED", reason: "Datum Od nesmí být v minulosti." };
            if (newFrom >= newTo) return { status: "REJECTED", reason: "Neplatný termín." };

            if (hasReservationConflict(db.reservations, res.itemId, newFrom, newTo, res.id)) {
                return { status: "REJECTED", reason: "Předmět je v tomto termínu již rezervován." };
            }

            const idx = db.reservations.findIndex(r => r.id === resId);
            db.reservations[idx] = transitionReservationState(
                { ...res, requestedFrom: newFrom, requestedTo: newTo }, "UPDATE_TERM"
            );

            return { status: "SUCCESS", data: { reservations: db.reservations } };
        },

        // zruseni rezervace
        async cancelReservation({ token, resId, itemId }) {
            await delay(200);
            const user = authenticateToken(db, token);
            if (!user) return { status: "REJECTED", reason: "Nepřihlášen." };

            const resIdx = db.reservations.findIndex(r => r.id === resId);
            if (resIdx === -1) return { status: "REJECTED", reason: "Rezervace nenalezena." };

            db.reservations[resIdx] = transitionReservationState(db.reservations[resIdx], "CANCEL");
            const iIdx = db.items.findIndex(i => i.id === itemId);
            if (iIdx > -1) db.items[iIdx] = transitionItemState(db.items[iIdx], "CANCEL_RESERVE");

            return { status: "SUCCESS", data: { items: db.items, reservations: db.reservations } };
        },

        // admin potvrzeni rezervace
        async confirmReservation({ token, resId }) {
            await delay(200);
            const user = authenticateToken(db, token);
            if (!user || user.role !== "ADMIN") return { status: "REJECTED", reason: "Nedostatečná oprávnění." };

            const idx = db.reservations.findIndex(r => r.id === resId);
            if (idx === -1) return { status: "REJECTED", reason: "Rezervace nenalezena." };

            db.reservations[idx] = transitionReservationState(db.reservations[idx], "CONFIRM");
            return { status: "SUCCESS", data: { reservations: db.reservations } };
        },

        // admin vydani predmetu (fulfill) - vytvori loan
        async fulfillReservation({ token, resId }) {
            await delay(200);
            const user = authenticateToken(db, token);
            if (!user || user.role !== "ADMIN") return { status: "REJECTED", reason: "Nedostatečná oprávnění." };

            const rfIdx = db.reservations.findIndex(r => r.id === resId);
            if (rfIdx === -1) return { status: "REJECTED", reason: "Rezervace nenalezena." };

            const res = db.reservations[rfIdx];
            db.reservations[rfIdx] = transitionReservationState(res, "FULFILL");
            const itIdx = db.items.findIndex(i => i.id === res.itemId);
            if (itIdx > -1) db.items[itIdx] = transitionItemState(db.items[itIdx], "FULFILL");

            const loan = {
                id: "loan-" + Date.now(),
                userId: res.userId, itemId: res.itemId,
                status: "ACTIVE", startDate: today(),
                dueDate: res.requestedTo || null,
                returnDate: null, penaltyAmount: 0
            };
            db.loans.push(loan);

            return { status: "SUCCESS", data: { items: db.items, reservations: db.reservations, loans: db.loans } };
        },

        // admin expirace rezervace
        async expireReservation({ token, resId }) {
            await delay(200);
            const user = authenticateToken(db, token);
            if (!user || user.role !== "ADMIN") return { status: "REJECTED", reason: "Nedostatečná oprávnění." };

            const idx = db.reservations.findIndex(r => r.id === resId);
            if (idx === -1) return { status: "REJECTED", reason: "Rezervace nenalezena." };

            const res = db.reservations[idx];
            db.reservations[idx] = transitionReservationState(res, "EXPIRE");
            const itemIdx = db.items.findIndex(i => i.id === res.itemId);
            if (itemIdx > -1) db.items[itemIdx] = transitionItemState(db.items[itemIdx], "CANCEL_RESERVE");

            return { status: "SUCCESS", data: { items: db.items, reservations: db.reservations } };
        },

        // vraceni predmetu (admin)
        async returnItem({ token, loanId, isDamaged }) {
            await delay(200);
            const user = authenticateToken(db, token);
            if (!user || user.role !== "ADMIN") return { status: "REJECTED", reason: "Nedostatečná oprávnění." };

            const lIdx = db.loans.findIndex(l => l.id === loanId);
            if (lIdx === -1) return { status: "REJECTED", reason: "Výpůjčka nenalezena." };

            const loan = db.loans[lIdx];
            const type = isDamaged ? "RETURN_DAMAGED" : "RETURN_OK";
            db.loans[lIdx] = transitionLoanState(loan, type);
            db.loans[lIdx].returnDate = today();

            const itemIdx = db.items.findIndex(i => i.id === loan.itemId);
            if (itemIdx > -1) db.items[itemIdx] = transitionItemState(db.items[itemIdx], type);

            if (isDamaged) {
                const uIdx = db.users.findIndex(u => u.id === loan.userId);
                if (uIdx > -1) db.users[uIdx] = transitionUserState(db.users[uIdx], "SUSPEND");
            }

            return { status: "SUCCESS", data: { items: db.items, loans: db.loans, users: db.users } };
        },

        // nahlaseni ztraty zakaznikem
        async reportLoss({ token, loanId }) {
            await delay(200);
            const user = authenticateToken(db, token);
            if (!user) return { status: "REJECTED", reason: "Nepřihlášen." };

            const lIdx = db.loans.findIndex(l => l.id === loanId);
            if (lIdx === -1) return { status: "REJECTED", reason: "Výpůjčka nenalezena." };

            db.loans[lIdx] = transitionLoanState(db.loans[lIdx], "NOT_RETURNED");
            return { status: "SUCCESS", data: { loans: db.loans } };
        },

        // admin sprava predmetu (oprava, vyrazeni)
        async manageItem({ token, itemId, task }) {
            await delay(200);
            const user = authenticateToken(db, token);
            if (!user || user.role !== "ADMIN") return { status: "REJECTED", reason: "Nedostatečná oprávnění." };

            const idx = db.items.findIndex(i => i.id === itemId);
            if (idx === -1) return { status: "REJECTED", reason: "Předmět nenalezen." };

            db.items[idx] = transitionItemState(db.items[idx], task);
            return { status: "SUCCESS", data: { items: db.items } };
        },

        // admin sprava uzivatelu (overeni, blokovani)
        async manageUser({ token, userId, transition }) {
            await delay(200);
            const user = authenticateToken(db, token);
            if (!user || user.role !== "ADMIN") return { status: "REJECTED", reason: "Nedostatečná oprávnění." };

            const uIdx = db.users.findIndex(u => u.id === userId);
            if (uIdx === -1) return { status: "REJECTED", reason: "Uživatel nenalezen." };

            db.users[uIdx] = transitionUserState(db.users[uIdx], transition);
            return { status: "SUCCESS", data: { users: db.users } };
        },

        // admin vytvoreni noveho predmetu
        async createItem({ token, name }) {
            await delay(200);
            const user = authenticateToken(db, token);
            if (!user || user.role !== "ADMIN") return { status: "REJECTED", reason: "Nedostatečná oprávnění." };
            if (!name || name.trim() === "") return { status: "REJECTED", reason: "Název předmětu nesmí být prázdný." };

            const newItem = {
                id: "item-" + Date.now(),
                name: name.trim(),
                status: "AVAILABLE",
            };
            db.items.push(newItem);
            return { status: "SUCCESS", data: { items: db.items } };
        },

        // zakaznik zmena hesla
        async changePassword({ token, newPassword }) {
            await delay(200);
            const user = authenticateToken(db, token);
            if (!user) return { status: "REJECTED", reason: "Nepřihlášen." };
            if (!newPassword || newPassword.length < 4) {
                return { status: "REJECTED", reason: "Nové heslo musí mít alespoň 4 znaky." };
            }

            user.hashedPassword = await hashPassword(newPassword);
            return { status: "SUCCESS" };
        },

        // systemova kontrola (nahradi cron na backendu)
        systemCheck() {
            const nowDate = today();
            db.loans.forEach((loan, i) => {
                if (loan.status === "ACTIVE" && loan.dueDate && loan.dueDate < nowDate) {
                    db.loans[i] = transitionLoanState(loan, "MARK_OVERDUE");
                }
            });
            db.reservations.forEach((res, i) => {
                if ((res.status === "CONFIRMED" || res.status === "PENDING") && res.requestedTo && res.requestedTo < nowDate) {
                    db.reservations[i] = transitionReservationState(res, "EXPIRE");
                    const itemIdx = db.items.findIndex(it => it.id === res.itemId);
                    if (itemIdx > -1) db.items[itemIdx] = transitionItemState(db.items[itemIdx], "CANCEL_RESERVE");
                }
            });
            return { status: "SUCCESS", data: { items: db.items, loans: db.loans, reservations: db.reservations } };
        },
    };
}

// zpetna kompatibilita s testy
export function createAuthApi(db) {
    const api = createApi(db);
    return { register: api.register, login: api.login, logout: api.logout };
}