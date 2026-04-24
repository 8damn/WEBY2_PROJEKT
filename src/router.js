// autor: Adam Diblik (IR04)
// resi prechody mezi strankami pomoci hashe
import { dispatchAction } from './dispatch.js';

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

export function urlToRoute(url) {
    const hashIndex = url.indexOf("#");
    const path = hashIndex >= 0 ? url.slice(hashIndex + 1) : "";
    return parseUrl(path);
}

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

export function urlToAction(url) {
    const route = urlToRoute(url);
    return routeToAction(route);
}

export function stateToRoute(state) {
    const route = state.ui.currentRoute;

    switch (route) {
        case "login": return { context: "LOGIN" };
        case "dashboard": return { context: "DASHBOARD" };
        case "admin": return { context: "ADMIN" };
        default: return { context: "UNKNOWN" };
    }
}

export function routeToUrl(route) {
    switch (route.context) {
        case "LOGIN": return "#/login";
        case "DASHBOARD": return "#/dashboard";
        case "ADMIN": return "#/admin";
        default: return "#/login";
    }
}

export function stateToUrl(state) {
    const route = stateToRoute(state);
    return routeToUrl(route);
}

export function updateUrl(state) {
    const url = stateToUrl(state);
    if (url !== window.location.hash) {
        window.location.hash = url;
    }
}

export function initRouter() {
    // povesi se na zmenu hashe v url a vzdycky preposle novou url do dispatcheru
    window.addEventListener("hashchange", () => {
        const action = urlToAction(window.location.href);
        dispatchAction(action);
    });

    const initialAction = urlToAction(window.location.href);
    dispatchAction(initialAction);
}