// autor: Adam Diblik (IR04)
// testovani logiky pro zpracovani a prechody url
import { assert } from "./assert.js";
import {
    parseUrl,
    urlToRoute,
    routeToAction,
    urlToAction,
    stateToRoute,
    routeToUrl,
    stateToUrl,
} from "../src/router.js";

console.log("\n── parseUrl ──");

{
    const route = parseUrl("/login");
    assert(route.context === "LOGIN", "parseUrl /login: context je LOGIN");
}

{
    const route = parseUrl("/dashboard");
    assert(route.context === "DASHBOARD", "parseUrl /dashboard: context je DASHBOARD");
}

{
    const route = parseUrl("/admin");
    assert(route.context === "ADMIN", "parseUrl /admin: context je ADMIN");
}

{
    const route = parseUrl("/neznama-cesta");
    assert(route.context === "UNKNOWN", "parseUrl neznámá cesta: context je UNKNOWN");
}

{
    const route = parseUrl("");
    assert(route.context === "UNKNOWN", "parseUrl prázdná cesta: context je UNKNOWN");
}

{
    const route = parseUrl("/");
    assert(route.context === "UNKNOWN", "parseUrl jen lomítko: context je UNKNOWN");
}

console.log("\n── urlToRoute ──");

{
    const route = urlToRoute("http://localhost:5500/index.html#/login");
    assert(route.context === "LOGIN", "urlToRoute #/login: context je LOGIN");
}

{
    const route = urlToRoute("http://localhost:5500/index.html#/dashboard");
    assert(route.context === "DASHBOARD", "urlToRoute #/dashboard: context je DASHBOARD");
}

{
    const route = urlToRoute("http://localhost:5500/index.html#/admin");
    assert(route.context === "ADMIN", "urlToRoute #/admin: context je ADMIN");
}

{

    const route = urlToRoute("http://localhost:5500/index.html");
    assert(route.context === "UNKNOWN", "urlToRoute bez hashe: context je UNKNOWN");
}

console.log("\n── routeToAction ──");

{
    const action = routeToAction({ context: "LOGIN" });
    assert(action.type === "ENTER_LOGIN", "routeToAction LOGIN: type je ENTER_LOGIN");
}

{
    const action = routeToAction({ context: "DASHBOARD" });
    assert(action.type === "ENTER_DASHBOARD", "routeToAction DASHBOARD: type je ENTER_DASHBOARD");
}

{
    const action = routeToAction({ context: "ADMIN" });
    assert(action.type === "ENTER_ADMIN", "routeToAction ADMIN: type je ENTER_ADMIN");
}

{

    const action = routeToAction({ context: "UNKNOWN" });
    assert(action.type === "ENTER_LOGIN", "routeToAction UNKNOWN: type je ENTER_LOGIN (bezpečný fallback)");
}

console.log("\n── urlToAction ──");

{
    const action = urlToAction("http://localhost:5500/index.html#/login");
    assert(action.type === "ENTER_LOGIN", "urlToAction #/login: type je ENTER_LOGIN");
}

{
    const action = urlToAction("http://localhost:5500/index.html#/dashboard");
    assert(action.type === "ENTER_DASHBOARD", "urlToAction #/dashboard: type je ENTER_DASHBOARD");
}

{
    const action = urlToAction("http://localhost:5500/index.html#/admin");
    assert(action.type === "ENTER_ADMIN", "urlToAction #/admin: type je ENTER_ADMIN");
}

{
    const action = urlToAction("http://localhost:5500/index.html");
    assert(action.type === "ENTER_LOGIN", "urlToAction bez hashe: type je ENTER_LOGIN (fallback)");
}

console.log("\n── stateToRoute ──");

{
    const state = { ui: { currentRoute: "login" } };
    const route = stateToRoute(state);
    assert(route.context === "LOGIN", "stateToRoute login: context je LOGIN");
}

{
    const state = { ui: { currentRoute: "dashboard" } };
    const route = stateToRoute(state);
    assert(route.context === "DASHBOARD", "stateToRoute dashboard: context je DASHBOARD");
}

{
    const state = { ui: { currentRoute: "admin" } };
    const route = stateToRoute(state);
    assert(route.context === "ADMIN", "stateToRoute admin: context je ADMIN");
}

{
    const state = { ui: { currentRoute: "unknown" } };
    const route = stateToRoute(state);
    assert(route.context === "UNKNOWN", "stateToRoute neznámá route: context je UNKNOWN");
}

console.log("\n── routeToUrl ──");

{
    const url = routeToUrl({ context: "LOGIN" });
    assert(url === "#/login", "routeToUrl LOGIN: url je #/login");
}

{
    const url = routeToUrl({ context: "DASHBOARD" });
    assert(url === "#/dashboard", "routeToUrl DASHBOARD: url je #/dashboard");
}

{
    const url = routeToUrl({ context: "ADMIN" });
    assert(url === "#/admin", "routeToUrl ADMIN: url je #/admin");
}

{
    const url = routeToUrl({ context: "UNKNOWN" });
    assert(url === "#/login", "routeToUrl UNKNOWN: url je #/login (bezpečný fallback)");
}

console.log("\n── stateToUrl ──");

{
    const state = { ui: { currentRoute: "login" } };
    const url = stateToUrl(state);
    assert(url === "#/login", "stateToUrl login: url je #/login");
}

{
    const state = { ui: { currentRoute: "dashboard" } };
    const url = stateToUrl(state);
    assert(url === "#/dashboard", "stateToUrl dashboard: url je #/dashboard");
}

{
    const state = { ui: { currentRoute: "admin" } };
    const url = stateToUrl(state);
    assert(url === "#/admin", "stateToUrl admin: url je #/admin");
}

{

    const state = { ui: { currentRoute: "xyz" } };
    const url = stateToUrl(state);
    assert(url === "#/login", "stateToUrl neznámá route: url je #/login (fallback)");
}

console.log("\n── round-trip konzistence ──");

{
    const inputUrl = "http://localhost:5500/index.html#/login";
    const action = urlToAction(inputUrl);

    const fakeState = { ui: { currentRoute: action.type === "ENTER_LOGIN" ? "login" : "?" } };
    const outputUrl = stateToUrl(fakeState);
    assert(outputUrl === "#/login", "round-trip: #/login → ENTER_LOGIN → stateToUrl → #/login");
}

{
    const inputUrl = "http://localhost:5500/index.html#/dashboard";
    const action = urlToAction(inputUrl);
    const fakeState = { ui: { currentRoute: action.type === "ENTER_DASHBOARD" ? "dashboard" : "?" } };
    const outputUrl = stateToUrl(fakeState);
    assert(outputUrl === "#/dashboard", "round-trip: #/dashboard → ENTER_DASHBOARD → stateToUrl → #/dashboard");
}

{
    const inputUrl = "http://localhost:5500/index.html#/admin";
    const action = urlToAction(inputUrl);
    const fakeState = { ui: { currentRoute: action.type === "ENTER_ADMIN" ? "admin" : "?" } };
    const outputUrl = stateToUrl(fakeState);
    assert(outputUrl === "#/admin", "round-trip: #/admin → ENTER_ADMIN → stateToUrl → #/admin");
}

console.log("\n── Hotovo ──\n");
