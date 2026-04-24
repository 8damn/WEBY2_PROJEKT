import { assert } from "./assert.js";
import {
    getAvailableItems,
    getUserReservations,
    getUserLoans,
    isAdmin,
    getActiveLoans,
    getAllUsers,
} from "../src/selectors.js";

function makeState({ items = [], loans = [], reservations = [], users = [], currentUser = null, role = "GUEST" } = {}) {
    return {
        auth: { currentUser, role },
        data: { items, loans, reservations, users },
    };
}

console.log("\n── getAvailableItems ──");

{
    const state = makeState({
        items: [
            { id: "item-1", name: "Vrtačka", status: "AVAILABLE" },
            { id: "item-2", name: "Pila", status: "UNAVAILABLE" },
            { id: "item-3", name: "Svářečka", status: "IN_REPAIR" },
            { id: "item-4", name: "Bruska", status: "RESERVED" },
        ],
    });
    const result = getAvailableItems(state);
    assert(result.length === 1, "getAvailableItems: vrátí jen AVAILABLE předměty");
    assert(result[0].id === "item-1", "getAvailableItems: vrátí správný předmět");
}

{
    const state = makeState({ items: [] });
    const result = getAvailableItems(state);
    assert(result.length === 0, "getAvailableItems: prázdný sklad → prázdné pole");
}

{
    const state = makeState({
        items: [
            { id: "item-1", name: "Vrtačka", status: "AVAILABLE" },
            { id: "item-2", name: "Bruska", status: "AVAILABLE" },
        ],
    });
    const result = getAvailableItems(state);
    assert(result.length === 2, "getAvailableItems: vrátí všechny AVAILABLE předměty");
}

console.log("\n── getUserReservations ──");

{
    const user = { id: "u123", email: "novak@test.cz" };
    const state = makeState({
        currentUser: user,
        reservations: [
            { id: "res-1", userId: "u123", itemId: "item-1", status: "PENDING" },
            { id: "res-2", userId: "u999", itemId: "item-2", status: "CONFIRMED" },
        ],
    });
    const result = getUserReservations(state);
    assert(result.length === 1, "getUserReservations: vrátí jen rezervace přihlášeného uživatele");
    assert(result[0].id === "res-1", "getUserReservations: vrátí správnou rezervaci");
}

{
    const state = makeState({ currentUser: null });
    const result = getUserReservations(state);
    assert(result.length === 0, "getUserReservations: nepřihlášený uživatel → prázdné pole");
}

{
    const user = { id: "u123", email: "novak@test.cz" };
    const state = makeState({
        currentUser: user,
        reservations: [
            { id: "res-1", userId: "u123", itemId: "item-1", status: "PENDING" },
            { id: "res-2", userId: "u123", itemId: "item-2", status: "FULFILLED" },
            { id: "res-3", userId: "u123", itemId: "item-3", status: "CANCELLED" },
        ],
    });
    const result = getUserReservations(state);

    assert(result.length === 3, "getUserReservations: vrátí všechny stavy rezervací (filtrování je v pohledu)");
}

console.log("\n── getUserLoans ──");

{
    const user = { id: "u123", email: "novak@test.cz" };
    const state = makeState({
        currentUser: user,
        loans: [
            { id: "loan-1", userId: "u123", itemId: "item-1", status: "ACTIVE",      dueDate: "2026-04-30" },
            { id: "loan-2", userId: "u123", itemId: "item-2", status: "RETURNED_OK",  returnDate: "2026-04-01" },
            { id: "loan-3", userId: "u999", itemId: "item-3", status: "ACTIVE",      dueDate: "2026-04-30" },
        ],
    });
    const result = getUserLoans(state);
    assert(result.length === 1, "getUserLoans: vrátí jen ACTIVE výpůjčky přihlášeného uživatele");
    assert(result[0].id === "loan-1", "getUserLoans: vrátí správnou výpůjčku");
}

{
    const user = { id: "u123", email: "novak@test.cz" };
    const state = makeState({
        currentUser: user,
        loans: [
            { id: "loan-1", userId: "u123", itemId: "item-1", status: "OVERDUE",  dueDate: "2026-01-01" },
        ],
    });
    const result = getUserLoans(state);
    assert(result.length === 1, "getUserLoans: vrátí OVERDUE výpůjčky (zákazník je stále má)");
}

{
    const state = makeState({ currentUser: null });
    const result = getUserLoans(state);
    assert(result.length === 0, "getUserLoans: nepřihlášený uživatel → prázdné pole");
}

console.log("\n── isAdmin ──");

{
    const state = makeState({ role: "ADMIN" });
    assert(isAdmin(state) === true, "isAdmin: ADMIN → true");
}

{
    const state = makeState({ role: "CUSTOMER" });
    assert(isAdmin(state) === false, "isAdmin: CUSTOMER → false");
}

{
    const state = makeState({ role: "GUEST" });
    assert(isAdmin(state) === false, "isAdmin: GUEST → false");
}

console.log("\n── getActiveLoans ──");

{
    const state = makeState({
        loans: [
            { id: "loan-1", userId: "u123", status: "ACTIVE",       dueDate: "2026-04-30" },
            { id: "loan-2", userId: "u123", status: "OVERDUE",      dueDate: "2026-01-01" },
            { id: "loan-3", userId: "u123", status: "RETURNED_OK",  returnDate: "2026-04-01" },
            { id: "loan-4", userId: "u999", status: "ACTIVE",       dueDate: "2026-05-01" },
        ],
    });
    const result = getActiveLoans(state);
    assert(result.length === 3, "getActiveLoans: vrátí ACTIVE a OVERDUE výpůjčky (pro admina)");
    assert(result.every(l => l.status === "ACTIVE" || l.status === "OVERDUE"),
        "getActiveLoans: všechny výsledky jsou ACTIVE nebo OVERDUE");
}

{
    const state = makeState({ loans: [] });
    const result = getActiveLoans(state);
    assert(result.length === 0, "getActiveLoans: žádné výpůjčky → prázdné pole");
}

console.log("\n── getAllUsers ──");

{
    const state = makeState({
        users: [
            { id: "u123", email: "zakaznik@test.cz", role: "CUSTOMER", status: "VERIFIED" },
            { id: "u999", email: "admin@test.cz",    role: "ADMIN",    status: "VERIFIED" },
        ],
    });
    const result = getAllUsers(state);
    assert(result.length === 2, "getAllUsers: vrátí všechny uživatele");
}

{
    const state = makeState({ users: [] });
    const result = getAllUsers(state);
    assert(result.length === 0, "getAllUsers: žádní uživatelé → prázdné pole");
}

{

    const state = makeState({
        users: [
            { id: "u123", email: "zakaznik@test.cz",  role: "CUSTOMER", status: "VERIFIED"  },
            { id: "u456", email: "novy@test.cz",       role: "CUSTOMER", status: "REGISTERED" },
            { id: "u789", email: "problem@test.cz",    role: "CUSTOMER", status: "SUSPENDED"  },
        ],
    });
    const result = getAllUsers(state);
    assert(result.length === 3, "getAllUsers: vrátí uživatele ve všech stavech");
    const statuses = result.map(u => u.status);
    assert(statuses.includes("REGISTERED"), "getAllUsers: vrátí i REGISTERED uživatele");
    assert(statuses.includes("SUSPENDED"),  "getAllUsers: vrátí i SUSPENDED uživatele");
}

console.log("\n── Hotovo ──\n");
