import { assert } from "./assert.js";
import { createAuthApi } from "../src/asyncApi.js";

console.log("\n── register ──");

{
    const db = { users: [] };
    const result = await createAuthApi(db).register({
        email:    "novak@test.cz",
        password: "heslo123",
    });
    assert(result.status === "SUCCESS", "register – úspěšná registrace zákazníka");
    assert(db.users.length === 1, "register – uživatel je přidán do db");
    assert(db.users[0].email === "novak@test.cz", "register – email je správně uložen");
    assert(db.users[0].role === "CUSTOMER", "register – role je CUSTOMER");
    assert(db.users[0].status === "REGISTERED", "register – status je REGISTERED (čeká na schválení)");
    assert(db.users[0].token === null, "register – token je null po registraci");
    assert(typeof db.users[0].hashedPassword === "string", "register – heslo je uloženo jako hash");
    assert(db.users[0].hashedPassword !== "heslo123", "register – heslo není uloženo v čitelné podobě");
}

{
    const db = { users: [] };
    const result = await createAuthApi(db).register({ password: "heslo123" });
    assert(result.status === "REJECTED", "register – chybějící email → REJECTED");
    assert(db.users.length === 0, "register – uživatel není přidán při chybějícím emailu");
}

{
    const db = { users: [] };
    const result = await createAuthApi(db).register({ email: "novak@test.cz" });
    assert(result.status === "REJECTED", "register – chybějící heslo → REJECTED");
}

{
    const db = { users: [] };
    const result = await createAuthApi(db).register({
        email:    "neplatnyemail",
        password: "heslo123",
    });
    assert(result.status === "REJECTED", "register – neplatný email → REJECTED");
    assert(db.users.length === 0, "register – uživatel není přidán při neplatném emailu");
}

{
    const db = { users: [] };
    const result = await createAuthApi(db).register({
        email:    "novak@test.cz",
        password: "ab",
    });
    assert(result.status === "REJECTED", "register – krátké heslo (< 4 znaky) → REJECTED");
}

{
    const db = { users: [] };
    await createAuthApi(db).register({ email: "novak@test.cz", password: "heslo123" });
    const result = await createAuthApi(db).register({ email: "novak@test.cz", password: "jine-heslo" });
    assert(result.status === "REJECTED", "register – duplicitní email → REJECTED");
    assert(db.users.length === 1, "register – duplicitní email: do db přidán pouze jeden uživatel");
}

console.log("\n── login ──");

{
    const db = { users: [] };
    await createAuthApi(db).register({ email: "novak@test.cz", password: "heslo123" });
    db.users[0].status = "VERIFIED";

    const result = await createAuthApi(db).login({ email: "novak@test.cz", password: "heslo123" });
    assert(result.status === "SUCCESS", "login – úspěšné přihlášení");
    assert(result.role === "CUSTOMER", "login – vrátí roli CUSTOMER");
    assert(typeof result.userId === "string", "login – vrátí userId");
    assert(typeof result.token === "string", "login – vrátí token (string)");
    assert(result.token !== null, "login – token není null");
    assert(db.users[0].token === result.token, "login – token je uložen u uživatele v db");
}

{
    const db = { users: [] };
    const result = await createAuthApi(db).login({ password: "heslo123" });
    assert(result.status === "REJECTED", "login – chybějící email → REJECTED");
}

{
    const db = { users: [] };
    const result = await createAuthApi(db).login({ email: "novak@test.cz" });
    assert(result.status === "REJECTED", "login – chybějící heslo → REJECTED");
}

{
    const db = { users: [] };
    const result = await createAuthApi(db).login({ email: "neexistuje@test.cz", password: "heslo123" });
    assert(result.status === "REJECTED", "login – neexistující uživatel → REJECTED");
}

{
    const db = { users: [] };
    await createAuthApi(db).register({ email: "novak@test.cz", password: "heslo123" });
    const result = await createAuthApi(db).login({ email: "novak@test.cz", password: "spatne-heslo" });
    assert(result.status === "REJECTED", "login – špatné heslo → REJECTED");
}

{
    const db = { users: [] };
    await createAuthApi(db).register({ email: "novak@test.cz", password: "heslo123" });

    const r1 = await createAuthApi(db).login({ email: "neexistuje@test.cz", password: "heslo123" });
    const r2 = await createAuthApi(db).login({ email: "novak@test.cz", password: "spatne" });

    assert(r1.status === "REJECTED", "login bezpečnost – neexistující účet: REJECTED");
    assert(r2.status === "REJECTED", "login bezpečnost – špatné heslo: REJECTED");
    assert(r1.reason === r2.reason, "login bezpečnost – stejná chybová zpráva (brání odhalení existence emailu)");
}

{
    const db = { users: [] };
    await createAuthApi(db).register({ email: "novak@test.cz", password: "heslo123" });
    db.users[0].status = "SUSPENDED";

    const result = await createAuthApi(db).login({ email: "novak@test.cz", password: "heslo123" });
    assert(result.status === "REJECTED", "login – SUSPENDED účet → REJECTED");
}

{
    const db = { users: [] };
    await createAuthApi(db).register({ email: "novak@test.cz", password: "heslo123" });
    db.users[0].status = "BLOCKED";

    const result = await createAuthApi(db).login({ email: "novak@test.cz", password: "heslo123" });
    assert(result.status === "REJECTED", "login – BLOCKED účet → REJECTED");
}

{
    const db = { users: [] };
    await createAuthApi(db).register({ email: "novak@test.cz", password: "heslo123" });
    db.users[0].status = "VERIFIED";

    const r1 = await createAuthApi(db).login({ email: "novak@test.cz", password: "heslo123" });
    const r2 = await createAuthApi(db).login({ email: "novak@test.cz", password: "heslo123" });

    assert(r1.status === "SUCCESS", "login opakované – první SUCCESS");
    assert(r2.status === "SUCCESS", "login opakované – druhé SUCCESS");
    assert(r1.token !== r2.token, "login opakované – každý login generuje nový token");
    assert(db.users[0].token === r2.token, "login opakované – db uchovává nejaktuálnější token");
}

console.log("\n── logout ──");

{
    const db = { users: [] };
    await createAuthApi(db).register({ email: "novak@test.cz", password: "heslo123" });
    db.users[0].status = "VERIFIED";
    const loginResult = await createAuthApi(db).login({ email: "novak@test.cz", password: "heslo123" });

    const result = await createAuthApi(db).logout(loginResult.token);
    assert(result.status === "SUCCESS", "logout – úspěšné odhlášení");
}

{
    const db = { users: [] };
    const result = await createAuthApi(db).logout(null);
    assert(result.status === "REJECTED", "logout – chybějící token → REJECTED");
}

{
    const db = { users: [] };
    await createAuthApi(db).register({ email: "novak@test.cz", password: "heslo123" });
    db.users[0].status = "VERIFIED";
    await createAuthApi(db).login({ email: "novak@test.cz", password: "heslo123" });

    const result = await createAuthApi(db).logout("spatny-token-xyz");
    assert(result.status === "REJECTED", "logout – neplatný token → REJECTED");
}

{
    const db = { users: [] };
    await createAuthApi(db).register({ email: "novak@test.cz", password: "heslo123" });
    db.users[0].status = "VERIFIED";
    const loginResult = await createAuthApi(db).login({ email: "novak@test.cz", password: "heslo123" });
    const token = loginResult.token;

    assert(db.users[0].token === token, "logout příprava – token je uložen v db");

    await createAuthApi(db).logout(token);

    const result2 = await createAuthApi(db).logout(token);
    assert(result2.status === "REJECTED", "logout – po odhlášení token již neplatí");
}

console.log("\n── Hotovo ──\n");
