// src/router.js
// Odpovědnost: Adam Diblík (IR04 – Router / Navigační logika)
//
// Router pracuje s LOGICKOU CESTOU aplikace, nikoli celou URL.
//
// Navigační kontexty:
//   #/login      ... přihlášení a registrace
//   #/dashboard  ... zákaznický přehled
//   #/admin      ... administrátorský panel
//
// Router je obousměrný:
//   URL → akce  (hashchange → dispatch)
//   stav → URL  (updateUrl jako odběratel store)
//
// Inspirováno router.js z referenčního projektu (Mgr. Daniela Ponce, Ph.D., 2026)

import { dispatchAction } from './dispatch.js';

// -------------------------------------------------------
// URL → route objekt
// -------------------------------------------------------

// Parsuje logickou cestu na route objekt s kontextem.
export function parseUrl(path) {
    const parts = path.split("/").filter(Boolean);

    if (parts.length === 1 && parts[0] === "login") {
        return { context: "LOGIN" };
    }
    if (parts.length === 1 && parts[0] === "dashboard") {
        return { context: "DASHBOARD" };
    }
    if (parts.length === 1 && parts[0] === "admin") {
        return { context: "ADMIN" };
    }

    return { context: "UNKNOWN" };
}

// Extrahuje logickou cestu z celé URL (za znakem #).
export function urlToRoute(url) {
    const hashIndex = url.indexOf("#");
    const path = hashIndex >= 0 ? url.slice(hashIndex + 1) : "";
    return parseUrl(path);
}

// Převede route objekt na navigační akci pro dispatcher.
export function routeToAction(route) {
    switch (route.context) {
        case "LOGIN":
            return { type: "ENTER_LOGIN" };
        case "DASHBOARD":
            return { type: "ENTER_DASHBOARD" };
        case "ADMIN":
            return { type: "ENTER_ADMIN" };
        case "UNKNOWN":
        default:
            return { type: "ENTER_LOGIN" };
    }
}

// Složená funkce: URL → akce (urlToRoute + routeToAction).
export function urlToAction(url) {
    const route = urlToRoute(url);
    return routeToAction(route);
}

// -------------------------------------------------------
// stav → URL
// -------------------------------------------------------

// Sestaví route objekt ze stavu aplikace.
export function stateToRoute(state) {
    const route = state.ui.currentRoute;

    switch (route) {
        case "login":     return { context: "LOGIN" };
        case "dashboard": return { context: "DASHBOARD" };
        case "admin":     return { context: "ADMIN" };
        default:          return { context: "UNKNOWN" };
    }
}

// Sestaví hash cestu z route objektu.
export function routeToUrl(route) {
    switch (route.context) {
        case "LOGIN":     return "#/login";
        case "DASHBOARD": return "#/dashboard";
        case "ADMIN":     return "#/admin";
        default:          return "#/login";
    }
}

// Složená funkce: stav → URL (stateToRoute + routeToUrl).
export function stateToUrl(state) {
    const route = stateToRoute(state);
    return routeToUrl(route);
}

// Aktualizuje URL v adresním řádku podle stavu aplikace.
// Zapisuje pouze při změně – bez toho by každá aktualizace notifikace
// přidávala zbytečný záznam do historie prohlížeče.
// Přihlášen jako odběratel store vedle renderApp.
export function updateUrl(state) {
    const url = stateToUrl(state);
    if (url !== window.location.hash) {
        window.location.hash = url;
    }
}

// -------------------------------------------------------
// Inicializace routeru
// -------------------------------------------------------

// Spustí se jednou při startu aplikace v main.js.
// Přihlásí posluchač změn URL a zpracuje aktuální adresu.
export function initRouter() {
    // Při kliknutí na Zpět/Vpřed v prohlížeči nebo ručním zadání URL
    window.addEventListener("hashchange", () => {
        const action = urlToAction(window.location.href);
        dispatchAction(action);
    });

    // Zpracování URL při prvním načtení stránky
    const initialAction = urlToAction(window.location.href);
    dispatchAction(initialAction);
}