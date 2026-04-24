globalThis.localStorage = {
    _store: {},
    getItem(k)    { return this._store[k] ?? null; },
    setItem(k, v) { this._store[k] = String(v); },
    removeItem(k) { delete this._store[k]; },
    clear()       { this._store = {}; },
};
globalThis.sessionStorage = {
    _store: {},
    getItem(k)    { return this._store[k] ?? null; },
    setItem(k, v) { this._store[k] = String(v); },
    removeItem(k) { delete this._store[k]; },
};

// autor: Martin Teply (IR01)
// testovani prechodu vsech stavovych automatu a validace povolenych akci
import { assert } from "./assert.js";

const {
    transitionItemState,
    transitionLoanState,
    transitionReservationState,
    transitionUserState,
} = await import("../src/state.js");

console.log("\n── transitionItemState ──");

{
    const item = { id: "item-1", name: "Vrtačka", status: "AVAILABLE" };
    const result = transitionItemState(item, "RESERVE");
    assert(result.status === "RESERVED", "AVAILABLE → RESERVE → RESERVED");
    assert(item.status === "AVAILABLE", "RESERVE: původní objekt se nemění (immutable)");
}

{
    const item = { id: "item-1", name: "Vrtačka", status: "RESERVED" };
    const result = transitionItemState(item, "CANCEL_RESERVE");
    assert(result.status === "AVAILABLE", "RESERVED → CANCEL_RESERVE → AVAILABLE");
}

{
    const item = { id: "item-1", name: "Vrtačka", status: "RESERVED" };
    const result = transitionItemState(item, "FULFILL");
    assert(result.status === "UNAVAILABLE", "RESERVED → FULFILL → UNAVAILABLE");
}

{
    const item = { id: "item-1", name: "Vrtačka", status: "UNAVAILABLE" };
    const result = transitionItemState(item, "RETURN_OK");
    assert(result.status === "AVAILABLE", "UNAVAILABLE → RETURN_OK → AVAILABLE");
}

{
    const item = { id: "item-1", name: "Vrtačka", status: "UNAVAILABLE" };
    const result = transitionItemState(item, "RETURN_DAMAGED");
    assert(result.status === "IN_REPAIR", "UNAVAILABLE → RETURN_DAMAGED → IN_REPAIR");
}

{
    const item = { id: "item-1", name: "Vrtačka", status: "IN_REPAIR" };
    const result = transitionItemState(item, "FIX");
    assert(result.status === "AVAILABLE", "IN_REPAIR → FIX → AVAILABLE");
}

{
    const item = { id: "item-1", name: "Vrtačka", status: "NEW" };
    const result = transitionItemState(item, "STOCK");
    assert(result.status === "AVAILABLE", "NEW → STOCK → AVAILABLE");
}

{
    const item = { id: "item-1", name: "Vrtačka", status: "AVAILABLE" };
    const result = transitionItemState(item, "RETIRE");
    assert(result.status === "RETIRED", "AVAILABLE → RETIRE → RETIRED");
}

{

    const item = { id: "item-1", name: "Vrtačka", status: "UNAVAILABLE" };
    const result = transitionItemState(item, "RESERVE");
    assert(result.status === "UNAVAILABLE", "UNAVAILABLE → RESERVE: stav se nezmění (nepovolený přechod)");
}

{

    const item = { id: "item-1", name: "Vrtačka", status: "IN_REPAIR" };
    const result = transitionItemState(item, "RETURN_OK");
    assert(result.status === "IN_REPAIR", "IN_REPAIR → RETURN_OK: stav se nezmění (nepovolený přechod)");
}

console.log("\n── transitionLoanState ──");

{
    const loan = { id: "loan-1", status: "ACTIVE", dueDate: "2026-04-30" };
    const result = transitionLoanState(loan, "RETURN_OK");
    assert(result.status === "RETURNED_OK", "ACTIVE → RETURN_OK → RETURNED_OK");
    assert(loan.status === "ACTIVE", "RETURN_OK: původní objekt se nemění (immutable)");
}

{
    const loan = { id: "loan-1", status: "ACTIVE", dueDate: "2026-04-30" };
    const result = transitionLoanState(loan, "RETURN_DAMAGED");
    assert(result.status === "RETURNED_DAMAGED", "ACTIVE → RETURN_DAMAGED → RETURNED_DAMAGED");
}

{
    const loan = { id: "loan-1", status: "ACTIVE", dueDate: "2026-01-01" };
    const result = transitionLoanState(loan, "MARK_OVERDUE");
    assert(result.status === "OVERDUE", "ACTIVE → MARK_OVERDUE → OVERDUE");
}

{
    const loan = { id: "loan-1", status: "OVERDUE", dueDate: "2026-01-01" };
    const result = transitionLoanState(loan, "RETURN_OK");
    assert(result.status === "RETURNED_OK", "OVERDUE → RETURN_OK → RETURNED_OK");
}

{
    const loan = { id: "loan-1", status: "OVERDUE", dueDate: "2026-01-01" };
    const result = transitionLoanState(loan, "RETURN_DAMAGED");
    assert(result.status === "RETURNED_DAMAGED", "OVERDUE → RETURN_DAMAGED → RETURNED_DAMAGED");
}

{
    const loan = { id: "loan-1", status: "ACTIVE", dueDate: "2026-04-30" };
    const result = transitionLoanState(loan, "NOT_RETURNED");
    assert(result.status === "NOT_RETURNED", "ACTIVE → NOT_RETURNED → NOT_RETURNED");
}

{
    const loan = { id: "loan-1", status: "OVERDUE", dueDate: "2026-01-01" };
    const result = transitionLoanState(loan, "NOT_RETURNED");
    assert(result.status === "NOT_RETURNED", "OVERDUE → NOT_RETURNED → NOT_RETURNED");
}

{

    const loan = { id: "loan-1", status: "RETURNED_OK" };
    const result = transitionLoanState(loan, "RETURN_OK");
    assert(result.status === "RETURNED_OK", "RETURNED_OK → RETURN_OK: stav se nezmění (nepovolený přechod)");
}

console.log("\n── transitionReservationState ──");

{
    const res = { id: "res-1", status: "PENDING" };
    const result = transitionReservationState(res, "CONFIRM");
    assert(result.status === "CONFIRMED", "PENDING → CONFIRM → CONFIRMED");
    assert(res.status === "PENDING", "CONFIRM: původní objekt se nemění (immutable)");
}

{
    const res = { id: "res-1", status: "CONFIRMED" };
    const result = transitionReservationState(res, "FULFILL");
    assert(result.status === "FULFILLED", "CONFIRMED → FULFILL → FULFILLED");
}

{
    const res = { id: "res-1", status: "CONFIRMED" };
    const result = transitionReservationState(res, "EXPIRE");
    assert(result.status === "EXPIRED", "CONFIRMED → EXPIRE → EXPIRED");
}

{
    const res = { id: "res-1", status: "PENDING" };
    const result = transitionReservationState(res, "EXPIRE");
    assert(result.status === "EXPIRED", "PENDING → EXPIRE → EXPIRED");
}

{
    const res = { id: "res-1", status: "CONFIRMED" };
    const result = transitionReservationState(res, "UPDATE_TERM");
    assert(result.status === "PENDING", "CONFIRMED → UPDATE_TERM → PENDING");
}

{
    const res = { id: "res-1", status: "PENDING" };
    const result = transitionReservationState(res, "CANCEL");
    assert(result.status === "CANCELLED", "PENDING → CANCEL → CANCELLED");
}

{
    const res = { id: "res-1", status: "CONFIRMED" };
    const result = transitionReservationState(res, "CANCEL");
    assert(result.status === "CANCELLED", "CONFIRMED → CANCEL → CANCELLED");
}

{

    const res = { id: "res-1", status: "FULFILLED" };
    const result = transitionReservationState(res, "FULFILL");
    assert(result.status === "FULFILLED", "FULFILLED → FULFILL: stav se nezmění (nepovolený přechod)");
}

{

    const res = { id: "res-1", status: "EXPIRED" };
    const result = transitionReservationState(res, "CONFIRM");
    assert(result.status === "EXPIRED", "EXPIRED → CONFIRM: stav se nezmění (nepovolený přechod)");
}

{

    const res = { id: "res-1", status: "CANCELLED" };
    const result = transitionReservationState(res, "CONFIRM");
    assert(result.status === "CANCELLED", "CANCELLED → CONFIRM: stav se nezmění (nepovolený přechod)");
}

{

    const res = { id: "res-1", status: "PENDING" };
    const result = transitionReservationState(res, "UPDATE_TERM");
    assert(result.status === "PENDING", "PENDING → UPDATE_TERM: stav se nezmění (UPDATE_TERM je jen pro CONFIRMED)");
}

console.log("\n── transitionUserState ──");

{
    const user = { id: "u-1", email: "novak@test.cz", status: "REGISTERED" };
    const result = transitionUserState(user, "VERIFY");
    assert(result.status === "VERIFIED", "REGISTERED → VERIFY → VERIFIED");
    assert(user.status === "REGISTERED", "VERIFY: původní objekt se nemění (immutable)");
}

{
    const user = { id: "u-1", email: "novak@test.cz", status: "VERIFIED" };
    const result = transitionUserState(user, "SUSPEND");
    assert(result.status === "SUSPENDED", "VERIFIED → SUSPEND → SUSPENDED");
}

{
    const user = { id: "u-1", email: "novak@test.cz", status: "SUSPENDED" };
    const result = transitionUserState(user, "VERIFY");
    assert(result.status === "VERIFIED", "SUSPENDED → VERIFY → VERIFIED");
}

{
    const user = { id: "u-1", email: "novak@test.cz", status: "VERIFIED" };
    const result = transitionUserState(user, "BLOCK");
    assert(result.status === "BLOCKED", "VERIFIED → BLOCK → BLOCKED");
}

{

    const user = { id: "u-1", email: "novak@test.cz", status: "SUSPENDED" };
    const result = transitionUserState(user, "BLOCK");
    assert(result.status === "BLOCKED", "SUSPENDED → BLOCK → BLOCKED (z jakéhokoliv stavu)");
}

{
    const user = { id: "u-1", email: "novak@test.cz", status: "BLOCKED" };
    const result = transitionUserState(user, "VERIFY");
    assert(result.status === "VERIFIED", "BLOCKED → VERIFY → VERIFIED (admin rehabilitace)");
}

{

    const user = { id: "u-1", email: "novak@test.cz", status: "SUSPENDED" };
    const result = transitionUserState(user, "SUSPEND");
    assert(result.status === "SUSPENDED", "SUSPENDED → SUSPEND: stav se nezmění (nepovolený přechod)");
}

console.log("\n── Hotovo ──\n");
