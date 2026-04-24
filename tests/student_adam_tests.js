// tests/student_adam_tests.js
// Odpovědnost: Adam Diblík
// Pokrývá: IR08 (Autentizace), IR04 (Router), Business entita Reservation

import { transitionReservationState } from '../src/state.js';
import { saveAuthToken, getAuthToken, clearAuthToken, restoreUserFromToken } from '../src/auth.js';
import { handleRoute, getDefaultRouteForUser } from '../src/router.js';

// ─── Pomocné funkce pro testy ────────────────────────────────────────────────

function assert(condition, label) {
    if (condition) {
        console.log(`  ✅ PASS: ${label}`);
    } else {
        console.error(`  ❌ FAIL: ${label}`);
    }
}

function section(title) {
    console.log(`\n=== ${title} ===`);
}

// ─── TESTY IR08: AUTENTIZACE ─────────────────────────────────────────────────

function testAuthTokenStorage() {
    section("IR08 – Uložení a obnova auth tokenu");

    // GIVEN: čistý stav
    clearAuthToken();

    // WHEN: uložíme token s userId a rolí
    saveAuthToken("u-test-1", "CUSTOMER");

    // THEN: getAuthToken() vrátí správné hodnoty
    const session = getAuthToken();
    assert(session !== null, "Token existuje po saveAuthToken");
    assert(session.userId === "u-test-1", "Token obsahuje správné userId");
    assert(session.role === "CUSTOMER", "Token obsahuje správnou roli");

    // WHEN: odhlásíme
    clearAuthToken();

    // THEN: token je pryč
    assert(getAuthToken() === null, "Token je null po clearAuthToken");
}

function testRestoreUserFromToken() {
    section("IR08 – Obnova uživatele po F5 (restoreUserFromToken)");

    const users = [
        { id: "u1", email: "verified@test.cz", role: "CUSTOMER", status: "VERIFIED" },
        { id: "u2", email: "blocked@test.cz",  role: "CUSTOMER", status: "BLOCKED" },
        { id: "u3", email: "new@test.cz",      role: "CUSTOMER", status: "REGISTERED" },
        { id: "u4", email: "susp@test.cz",     role: "CUSTOMER", status: "SUSPENDED" },
    ];

    // Test 1: VERIFIED uživatel se obnoví
    saveAuthToken("u1", "CUSTOMER");
    const restored = restoreUserFromToken(users);
    assert(restored !== null, "VERIFIED uživatel je obnoven");
    assert(restored.id === "u1", "Obnoven správný uživatel");
    clearAuthToken();

    // Test 2: BLOCKED uživatel se NESMÍ obnovit
    saveAuthToken("u2", "CUSTOMER");
    const blockedRestore = restoreUserFromToken(users);
    assert(blockedRestore === null, "BLOCKED uživatel není obnoven");
    assert(getAuthToken() === null, "Token BLOCKED uživatele byl vymazán");

    // Test 3: REGISTERED (neověřený) uživatel se NESMÍ obnovit
    saveAuthToken("u3", "CUSTOMER");
    const registeredRestore = restoreUserFromToken(users);
    assert(registeredRestore === null, "REGISTERED (neověřený) uživatel není obnoven");
    assert(getAuthToken() === null, "Token REGISTERED uživatele byl vymazán");

    // Test 4: SUSPENDED uživatel SE obnoví (jen s omezeními v business logice)
    saveAuthToken("u4", "CUSTOMER");
    const suspendedRestore = restoreUserFromToken(users);
    assert(suspendedRestore !== null, "SUSPENDED uživatel je obnoven (omezení řeší business logika)");
    clearAuthToken();

    // Test 5: Uživatel neexistuje v datech → token vymazán
    saveAuthToken("u-neexistuje", "CUSTOMER");
    const missingRestore = restoreUserFromToken(users);
    assert(missingRestore === null, "Neexistující uživatel není obnoven");
    assert(getAuthToken() === null, "Token neexistujícího uživatele byl vymazán");
}

// ─── TESTY IR04: ROUTER ──────────────────────────────────────────────────────

function makeState(user) {
    return {
        auth: {
            currentUser: user,
            role: user ? user.role : "GUEST"
        }
    };
}

function testRouterGuards() {
    section("IR04 – Route guards");

    const guestState    = makeState(null);
    const customerState = makeState({ id: "u1", role: "CUSTOMER" });
    const adminState    = makeState({ id: "u999", role: "ADMIN" });

    // Test 1: Nepřihlášený → dashboard → redirect na login
    const r1 = handleRoute("dashboard", guestState);
    assert(r1.redirect === "login", "Nepřihlášený uživatel na 'dashboard' → redirect na 'login'");

    // Test 2: Nepřihlášený → admin → redirect na login
    const r2 = handleRoute("admin", guestState);
    assert(r2.redirect === "login", "Nepřihlášený uživatel na 'admin' → redirect na 'login'");

    // Test 3: CUSTOMER → admin → redirect na dashboard (role guard)
    const r3 = handleRoute("admin", customerState);
    assert(r3.redirect === "dashboard", "CUSTOMER na 'admin' → redirect na 'dashboard'");

    // Test 4: ADMIN → admin → povoleno
    const r4 = handleRoute("admin", adminState);
    assert(r4.navigate === "admin", "ADMIN na 'admin' → navigace povolena");

    // Test 5: CUSTOMER → dashboard → povoleno
    const r5 = handleRoute("dashboard", customerState);
    assert(r5.navigate === "dashboard", "CUSTOMER na 'dashboard' → navigace povolena");

    // Test 6: Přihlášený uživatel → login → redirect (nesmí vidět login)
    const r6 = handleRoute("login", customerState);
    assert(r6.redirect === "dashboard", "Přihlášený CUSTOMER na 'login' → redirect na 'dashboard'");

    // Test 7: Neznámá routa → přesměrování na výchozí
    const r7 = handleRoute("neexistujici-routa", guestState);
    assert(r7.redirect === "login", "Neznámá routa pro hosta → redirect na 'login'");

    const r8 = handleRoute("neznama", adminState);
    assert(r8.redirect === "admin", "Neznámá routa pro admina → redirect na 'admin'");
}

function testDefaultRouteForUser() {
    section("IR04 – Výchozí routy dle přihlášení");

    assert(getDefaultRouteForUser(makeState(null)) === "login",
        "Host → výchozí routa je 'login'");
    assert(getDefaultRouteForUser(makeState({ role: "CUSTOMER" })) === "dashboard",
        "CUSTOMER → výchozí routa je 'dashboard'");
    assert(getDefaultRouteForUser(makeState({ role: "ADMIN" })) === "admin",
        "ADMIN → výchozí routa je 'admin'");
}

// ─── TESTY BUSINESS ENTITY: RESERVATION ──────────────────────────────────────

function testReservationStateMachine() {
    section("Reservation – stavový automat");

    const res = { id: "res-1", itemId: "item-5", status: "CONFIRMED" };

    // Test 1: Expirace
    const expired = transitionReservationState(res, "EXPIRE");
    assert(expired.status === "EXPIRED", "CONFIRMED → EXPIRE → EXPIRED");

    // Test 2: EXPIRED nelze FULFILL
    const invalid = transitionReservationState(expired, "FULFILL");
    assert(invalid.status === "EXPIRED", "EXPIRED nesmí přejít do FULFILLED");

    // Test 3: CONFIRMED → FULFILLED
    const fulfilled = transitionReservationState(res, "FULFILL");
    assert(fulfilled.status === "FULFILLED", "CONFIRMED → FULFILL → FULFILLED");

    // Test 4: PENDING → CONFIRMED
    const pending = { ...res, status: "PENDING" };
    const confirmed = transitionReservationState(pending, "CONFIRM");
    assert(confirmed.status === "CONFIRMED", "PENDING → CONFIRM → CONFIRMED");

    // Test 5: CONFIRMED → CANCELLED
    const cancelled = transitionReservationState(res, "CANCEL");
    assert(cancelled.status === "CANCELLED", "CONFIRMED → CANCEL → CANCELLED");

    // Test 6: CONFIRMED → UPDATE_TERM → PENDING (zákazník změnil termín)
    const backToPending = transitionReservationState(res, "UPDATE_TERM");
    assert(backToPending.status === "PENDING", "CONFIRMED → UPDATE_TERM → PENDING");

    // Test 7: FULFILLED nelze CANCEL (ochrana invariantu)
    const cantCancelFulfilled = transitionReservationState(fulfilled, "CANCEL");
    assert(cantCancelFulfilled.status === "FULFILLED", "FULFILLED nelze CANCEL");
}

// ─── SPUŠTĚNÍ VŠECH TESTŮ ────────────────────────────────────────────────────

console.log("╔════════════════════════════════════════╗");
console.log("║  Testy: Adam Diblík (IR08, IR04, Res)  ║");
console.log("╚════════════════════════════════════════╝");

testAuthTokenStorage();
testRestoreUserFromToken();
testRouterGuards();
testDefaultRouteForUser();
testReservationStateMachine();

console.log("\n✅ Všechny testy dokončeny. Zkontrolujte výstup výše.\n");