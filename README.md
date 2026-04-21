# Půjčovna vybavení — SPA Dokumentace projektu

> **Výstup 2 — Dokumentace** dle zadání „Architektura SPA"  
> Tým: Martin Teplý · Jan Hofmann · Adam Diblík · Max Jasinek

---

## Obsah

1. [Architektura aplikace](#1-architektura-aplikace)
2. [Stav, akce a dispatch mechanismus](#2-stav-akce-a-dispatch-mechanismus)
3. [Business entity a stavové automaty](#3-business-entity-a-stavové-automaty)
4. [Rozdělení práce v týmu](#4-rozdělení-práce-v-týmu)
5. [Testovací scénáře](#5-testovací-scénáře)
6. [Podklady k obhajobě — individuální sekce](#6-podklady-k-obhajobě--individuální-sekce)

---

## 1. Architektura aplikace

Aplikace je implementována jako **Single-Page Application (SPA)** bez použití jakéhokoliv frameworku. Celá architektura je postavena na principu **jednosměrného toku dat (Unidirectional Data Flow)**:

```
Uživatel → Handler → Dispatcher → State → Selektor → View → (zpět na Uživatele)
```

### Vrstvová struktura

| Vrstva | Soubor | Popis |
|---|---|---|
| **Stav** | `src/state.js` | Centrální datový model (Single Source of Truth), stavové automaty |
| **Akce** | (v `dispatch.js`) | Pojmenované záměry uživatele nebo systému (objekty `{ type, payload }`) |
| **Dispatcher** | `src/dispatch.js` | Centrální interpretace akcí, koordinace synchronních i asynchronních operací |
| **Selektory** | `src/selectors.js` | Výběr a transformace dat ze stavu pro pohledy |
| **Pohledy** | `src/views.js` | Projekce stavu do DOM struktury pomocí čistých funkcí |
| **Handlery** | `src/handlers.js` | Převod uživatelských interakcí na akce |
| **Async API** | `src/asyncApi.js` | Simulace komunikace se serverem (Promise-based) |
| **Router** | `src/router.js` | Hash-based routing, synchronizace URL ↔ stav aplikace |
| **Autentizace** | `src/auth.js` | Správa identity uživatele přes SessionStorage |

### Klíčové architektonické principy

- **Žádný `innerHTML`** — UI vzniká výhradně přes `document.createElement` a skládání DOM stromu pomocí helper funkce `h()` v `views.js`.
- **Stav je neměnný** — každá změna stavu vytvoří hlubokou kopii (`JSON.parse(JSON.stringify(appState))`), původní stav se nikdy nepřepisuje přímo.
- **Business logika mimo UI** — stavové automaty a autorizační kontroly jsou v `state.js` a `dispatch.js`, pohledy dostávají hotová data přes selektory.
- **Zakázané technologie nejsou použity** — žádný React, Vue, Angular, Redux ani jiný framework nebo state management.

---

## 2. Stav, akce a dispatch mechanismus

### Struktura globálního stavu (`appState`)

```js
{
  ui: {
    loading: false,      // příznak probíhajícího async požadavku
    error: null,         // chybová zpráva pro UI
    currentRoute: "login"  // aktivní stránka
  },
  auth: {
    currentUser: null,   // přihlášený uživatel (objekt nebo null)
    role: "GUEST"        // GUEST | CUSTOMER | ADMIN
  },
  data: {
    items: [...],        // předměty půjčovny
    loans: [...],        // výpůjčky
    reservations: [...], // rezervace
    users: [...]         // uživatelé systému
  }
}
```

### Přehled akcí

| Akce | Spouští | Popis |
|---|---|---|
| `NAVIGATE` | Router | Přepnutí pohledu dle URL |
| `LOGIN_START` | Handler | Spustí async přihlášení, nastaví `loading: true` |
| `LOGIN_SUCCESS` | Async | Uloží přihlášeného uživatele do stavu |
| `LOGIN_ERROR` | Async | Zobrazí chybovou hlášku |
| `LOGOUT` | Handler | Smaže auth stav, přesměruje na login |
| `RESERVE_START` | Handler | Ověří status uživatele, spustí async rezervaci |
| `RESERVE_SUCCESS` | Async | Změní stav předmětu na RESERVED, vytvoří rezervaci |
| `RESERVE_ERROR` | Async | Zobrazí chybovou hlášku |
| `CANCEL_RESERVATION` | Handler | Zruší rezervaci, vrátí předmět do AVAILABLE |
| `CONFIRM_RESERVATION` | Handler | Správce potvrdí rezervaci (PENDING → CONFIRMED) |
| `FULFILL_RESERVATION` | Handler | Správce vydá předmět, vytvoří výpůjčku (CONFIRMED → FULFILLED) |
| `RETURN_ITEM` | Handler | Vrácení předmětu v pořádku nebo poškozeného |
| `MANAGE_ITEM` | Handler | Správce spravuje předmět (oprava, vyřazení) |

### Jak funguje Dispatcher

1. Dispatcher přijme akci `{ type, payload }`.
2. Vytvoří **hlubokou kopii** aktuálního stavu a vynuluje `ui.error`.
3. Pomocí `switch` rozhodne, jak kopii stavu upravit.
4. Asynchronní akce (LOGIN_START, RESERVE_START) spustí Promise a dispatchují výsledek jako novou akci (SUCCESS nebo ERROR).
5. Zavolá `setState(newState)` — uloží nový stav.
6. Oznámí všem registrovaným listenerům (`subscribe`), že se stav změnil → spustí se `renderApp()`.

---

## 3. Business entity a stavové automaty

### 3.1 Item (Předmět) — odpovědnost: Martin Teplý

Fyzický objekt v půjčovně. Jeho stavový automat řídí dostupnost předmětu pro zákazníky.

**Stavy:** `NEW` · `AVAILABLE` · `RESERVED` · `UNAVAILABLE` · `IN_REPAIR` · `RETIRED`

```
NEW ──(STOCK)──► AVAILABLE
                    │
           (RESERVE)│            (CANCEL_RESERVE)
                    ▼ ◄──────────────────────────
                RESERVED
                    │
            (FULFILL)│
                    ▼
              UNAVAILABLE ──(RETURN_DAMAGED)──► IN_REPAIR
                    │                               │
          (RETURN_OK)│                       (FIX)  │
                    ▼ ◄─────────────────────────────┘
                AVAILABLE
                    
  * ──(RETIRE)──► RETIRED
```

**Business pravidla:**
- Zákazník vidí pouze předměty ve stavu `AVAILABLE`.
- Přechod do `RETIRED` je možný z jakéhokoliv stavu (ztráta, trvalé vyřazení).
- Stav mění výhradně Dispatcher na základě akcí s entitami Reservation a Loan.

---

### 3.2 Loan (Výpůjčka) — odpovědnost: Jan Hofmann

Časově omezený kontrakt o zapůjčení předmětu. Vzniká ve chvíli fyzického vydání předmětu zákazníkovi.

**Atributy:** `id` · `userId` · `itemId` · `startDate` · `dueDate` · `returnDate` · `penaltyAmount` · `status`

**Stavy:** `DRAFT_LOAN` · `ACTIVE` · `OVERDUE` · `RETURNED_OK` · `RETURNED_DAMAGED` · `NOT_RETURNED`

```
DRAFT_LOAN ──(ACTIVATE)──► ACTIVE
                               │
              ┌────────────────┼──────────────────┐
              │                │                  │
       (RETURN_OK)     (MARK_OVERDUE)     (NOT_RETURNED)
              │                │
              ▼                ▼
        RETURNED_OK         OVERDUE
                               │
              ┌────────────────┼──────────────────┐
              │                │                  │
       (RETURN_OK)    (RETURN_DAMAGED)     (NOT_RETURNED)
              │                │
              ▼                ▼
        RETURNED_OK   RETURNED_DAMAGED
```

**Business pravidla:**
- Zákazník vidí pouze své vlastní výpůjčky.
- Správce zadává vrácení a definuje výši penále.
- Poškozené vrácení (`RETURNED_DAMAGED`) automaticky přepne uživatele do stavu `SUSPENDED`.

---

### 3.3 Reservation (Rezervace) — odpovědnost: Adam Diblík

Blokace předmětu před fyzickým vyzvednutím. Propojuje zákazníka s předmětem a navazuje na entitu Loan.

**Atributy:** `id` · `userId` · `itemId` · `requestedFrom` · `requestedTo` · `status`

**Stavy:** `PENDING` · `CONFIRMED` · `FULFILLED` · `EXPIRED` · `CANCELLED`

```
PENDING ──(CONFIRM)──► CONFIRMED ──(FULFILL)──► FULFILLED
   │                       │
   │                       ├──(EXPIRE)──► EXPIRED
   │                       │
   │                       ├──(REOPEN)──► PENDING (úprava termínu)
   │                       │
   └──(CANCEL)──► CANCELLED ◄──(CANCEL)──┘
```

**Business pravidla:**
- Zákazník může vytvořit, upravit termín nebo zrušit pouze **své vlastní** rezervace.
- Správce může měnit stavy libovolné rezervace a vydáním předmětu přesouvá rezervaci do `FULFILLED`.
- `EXPIRED` rezervace brání dalšímu přechodu (nelze `FULFILL` expirovanou rezervaci).

---

### 3.4 UserAccount (Uživatel) — odpovědnost: Max Jasinek

Správa identity, oprávnění a reputace uživatele v systému.

**Atributy:** `id` · `email` · `role` · `status`

**Stavy:** `REGISTERED` · `VERIFIED` · `SUSPENDED` · `BLOCKED`

```
REGISTERED ──(VERIFY)──► VERIFIED
                              │
                    (SUSPEND) │ (VERIFY — po splacení dluhu)
                              ▼
                          SUSPENDED
                          
  * ──(BLOCK)──► BLOCKED  (z jakéhokoliv stavu, trvalá blokace)
```

**Business pravidla:**
- Uživatel ve stavu `SUSPENDED` nebo `BLOCKED` **nesmí** vytvářet rezervace.
- Zákazník nesmí sám měnit svou roli ani status.
- Správce může manuálně přepínat stavy uživatelů.

---

## 4. Rozdělení práce v týmu

Rozdělení vychází ze závazného dokumentu **Výstup 1 (HofmannJan.docx)** a zůstává beze změny.

| Student | Business entita | Infrastrukturní role | Soubory |
|---|---|---|---|
| **Martin Teplý** | Item | IR01 – State Management, IR02 – Dispatcher | `src/state.js`, `src/dispatch.js` |
| **Jan Hofmann** | Loan | IR03 – Async operace, IR05 – Selektory | `src/asyncApi.js`, `src/selectors.js` |
| **Adam Diblík** | Reservation | IR04 – Router, IR08 – Autentizace | `src/router.js`, `src/auth.js` |
| **Max Jasinek** | UserAccount | IR06 – View composition, IR07 – Handlery | `src/views.js`, `src/handlers.js` |

### Tok dat mezi částmi systému

```
Max (UI/Handlery)
    │  vytvoří akci { type, payload }
    ▼
Martin (Dispatcher)
    │  koordinuje, volá async vrstvu
    ▼
Jan (Async API)
    │  vrátí SUCCESS/ERROR jako novou akci
    ▼
Martin (Dispatcher → State)
    │  aplikuje stavový automat, uloží nový stav
    ▼
Jan (Selektory)
    │  připraví data pro pohled
    ▼
Max (View)
    │  překreslí DOM
    ▼
  Uživatel
```

---

## 5. Testovací scénáře

Každý student připravil testovací scénář dle šablony zadání (GIVEN / WHEN / THEN). Testy jsou izolované — nevyžadují funkční UI a prokazují funkčnost dané části nezávisle.

### Martin Teplý — `tests/student_martin_tests.js`

**Scénář: Vytvoření rezervace (`testScenario_reserveItem`)**
- **GIVEN:** Předmět `item-1` ve stavu `AVAILABLE`, přihlášený zákazník `u123`, prázdný seznam rezervací.
- **WHEN:** Dispatcher zpracuje akci `RESERVE_SUCCESS` pro `item-1`.
- **THEN:** Předmět změní stav na `RESERVED` a vznikne 1 nová rezervace.
- **Pokrývá:** IR01 (State), IR02 (Dispatcher), stavový automat Item.

---

### Jan Hofmann — `tests/student_jan_tests.js`

**Scénář 1: Stavový automat Výpůjčky (`testScenario_loanTransitions`)**
- **GIVEN:** Výpůjčka ve stavu `DRAFT_LOAN`.
- **WHEN:** Zavolána `transitionLoanState` s akcí `ACTIVATE`, poté `RETURN_OK`.
- **THEN:** Stav přechází `DRAFT_LOAN → ACTIVE → RETURNED_OK`.
- **Pokrývá:** IR01 (část Loan), business entita Loan.

**Scénář 2: Selektor aktivních výpůjček (`testScenario_activeLoansSelector`)**
- **GIVEN:** Mock stav se třemi výpůjčkami: `ACTIVE`, `RETURNED_OK`, `OVERDUE`.
- **WHEN:** Zavolán selektor `getActiveLoans`.
- **THEN:** Vrátí přesně 2 výpůjčky (`ACTIVE` + `OVERDUE`), `RETURNED_OK` filtruje.
- **Pokrývá:** IR05 (Selektory).

---

### Adam Diblík — `tests/student_adam_tests.js`

**Scénář: Expirace rezervace (`testScenario_reservationExpiration`)**
- **GIVEN:** Rezervace ve stavu `CONFIRMED`.
- **WHEN:** Zavolána `transitionReservationState` s akcí `EXPIRE`.
- **THEN:** Stav změní na `EXPIRED`. Následný pokus o `FULFILL` expirovanou rezervaci je odmítnut — stav zůstane `EXPIRED`.
- **Pokrývá:** IR01 (část Reservation), business entita Reservation, ochrana proti neplatným přechodům.

---

### Max Jasinek — `tests/student_max_tests.js`

**Scénář: SUSPENDED uživatel nemůže rezervovat (`testScenario_suspendedUserCannotReserve`)**
- **GIVEN:** Přihlášený uživatel `u-bad` se statusem `SUSPENDED` v `data.users`, předmět `item-1` ve stavu `AVAILABLE`.
- **WHEN:** Dispatcher zpracuje akci `RESERVE_START`.
- **THEN:** `ui.error` není `null` (chybová zpráva), předmět zůstane `AVAILABLE` (rezervace byla odmítnuta).
- **Pokrývá:** IR06/IR07 (View/Handlery), business pravidlo autorizace UserAccount.

---

## 6. Podklady k obhajobě — individuální sekce

---

### 🔵 Martin Teplý

**Moje odpovědnosti:**
- Business entita **Item** — stavový automat, přechody, validace invariantů.
- **IR01** — definice struktury `appState`, `setState()`, konzistence počátečního stavu.
- **IR02** — `dispatchAction()`, interpretace všech akcí, koordinace async/sync toků.

**Klíčové části kódu (co budu obhajovat):**

`src/state.js` — funkce `transitionItemState()`:
```js
// Každý přechod je explicitně podmíněn aktuálním stavem.
// Předmět nelze přidat do nabídky přímo z IN_REPAIR — musí projít FIX.
case "RETURN_OK":  if (item.status === "UNAVAILABLE") newItem.status = "AVAILABLE"; break;
case "FIX":        if (item.status === "IN_REPAIR")   newItem.status = "AVAILABLE"; break;
```

`src/dispatch.js` — `setState(newState)` vždy pracuje s hlubokou kopií:
```js
let newState = JSON.parse(JSON.stringify(appState)); // nikdy neměním stav přímo
```

`src/dispatch.js` — asynchronní tok:
```js
case "LOGIN_START":
    newState.ui.loading = true;
    fetchLogin(action.payload.email)
        .then(u => dispatchAction({ type: "LOGIN_SUCCESS", payload: u }))
        .catch(e => dispatchAction({ type: "LOGIN_ERROR", payload: e.message }));
    break;
// Výsledek async operace se vrací jako nová akce — Dispatcher ji zpracuje standardně.
```

**Možné otázky a odpovědi:**

> *Proč je `setState` oddělená funkce a ne přímý přepis?*  
> Aby byl přístup ke stavu řízenou operací — jakákoliv změna prochází jedním místem. To umožňuje kdykoli doplnit logování, validaci nebo time-travel debugging.

> *Proč `JSON.parse(JSON.stringify(...))`?*  
> Garantuje hlubokou kopii bez externích závislostí. Každá akce pracuje s izolovanou kopií — původní stav zůstane nedotčen, dokud se `setState` explicitně nezavolá.

> *Kde jsou business pravidla vs. kde je infrastruktura?*  
> Přechody stavů (co smí následovat po čem) jsou business pravidla — jsou v `transitionItemState`. Dispatch je infrastruktura — koordinuje, kdo a kdy přechod zavolá, ale sám nerozhoduje o jeho platnosti.

---

### 🟢 Jan Hofmann

**Moje odpovědnosti:**
- Business entita **Loan** — stavový automat výpůjčky, logika přechodů, atributy `startDate`, `dueDate`, `returnDate`, `penaltyAmount`.
- **IR03** — `src/asyncApi.js`, simulace serverové komunikace přes Promise, zpracování loading/error stavů.
- **IR05** — `src/selectors.js`, čisté funkce pro výběr dat ze stavu pro pohledy.

**Klíčové části kódu (co budu obhajovat):**

`src/state.js` — funkce `transitionLoanState()`:
```js
// Přechod ACTIVATE je možný pouze z DRAFT_LOAN — nelze "aktivovat" již aktivní výpůjčku.
case "ACTIVATE": if (loan.status === "DRAFT_LOAN") newLoan.status = "ACTIVE"; break;
// RETURN_OK je povolen jak z ACTIVE, tak z OVERDUE — zákazník může vrátit i po termínu.
case "RETURN_OK": if (loan.status === "ACTIVE" || loan.status === "OVERDUE") newLoan.status = "RETURNED_OK"; break;
```

`src/asyncApi.js` — simulace sítě:
```js
export function fetchLogin(email) {
    return new Promise((resolve, reject) => {
        setTimeout(() => { ... }, 800); // simulované zpoždění
    });
}
// Async vrstva nerozhoduje o platnosti dat — to patří business logice v Dispatcheru.
```

`src/selectors.js` — čisté funkce bez vedlejších efektů:
```js
export function getActiveLoans(state) {
    // Selektor nemodifikuje stav — pouze čte a filtruje.
    return state.data.loans.filter(loan => loan.status === "ACTIVE" || loan.status === "OVERDUE");
}
```

**Možné otázky a odpovědi:**

> *Proč selektory dostávají `state` jako argument místo aby četly `appState` přímo?*  
> Čisté funkce závisí pouze na svých vstupech. Díky tomu jsou testovatelné s libovolným mock stavem — viz `testScenario_activeLoansSelector`, kde předáváme vlastní objekt bez potřeby měnit globální stav.

> *Proč má Loan stav `DRAFT_LOAN`?*  
> Odpovídá reálnému procesu: správce nejprve **připraví** výpůjčku a teprve fyzickým předáním předmětu ji **aktivuje**. Toto oddělení umožňuje zachytit moment, kdy zákazník ještě předmět fyzicky nemá.

> *Co dělá async vrstva při chybě?*  
> Zavolá `reject(new Error(...))`, Dispatcher to zachytí v `.catch()` a dispatchuje `LOGIN_ERROR` nebo `RESERVE_ERROR`. Async vrstva sama stav nikdy nemění.

---

### 🟡 Adam Diblík

**Moje odpovědnosti:**
- Business entita **Reservation** — stavový automat, kontrola dostupnosti kapacity, propojení s entitou Loan.
- **IR04** — `src/router.js`, hash-based routing, synchronizace URL ↔ stav, route guard.
- **IR08** — `src/auth.js`, SessionStorage token, správa relace uživatele.

**Klíčové části kódu (co budu obhajovat):**

`src/state.js` — funkce `transitionReservationState()`:
```js
// EXPIRE je povolen z CONFIRMED i PENDING — rezervace může expirovat před i po schválení.
case "EXPIRE": if (res.status === "CONFIRMED" || res.status === "PENDING") newRes.status = "EXPIRED"; break;
// FULFILL je povolen POUZE z CONFIRMED — nelze vydat nevyzvednutou/expirovanou rezervaci.
case "FULFILL": if (res.status === "CONFIRMED") newRes.status = "FULFILLED"; break;
```

`src/router.js` — route guard a převod URL na akci:
```js
function handleHashChange() {
    let hash = window.location.hash.replace("#", "") || "login";
    // Route Guard: nepřihlášený uživatel nemůže na dashboard
    if (hash === "dashboard" && appState.auth.currentUser === null) {
        window.location.hash = "#login";
        return;
    }
    // Router sám nekreslí UI — pouze dispatchuje NAVIGATE akci
    dispatchAction({ type: "NAVIGATE", payload: hash });
}
```

`src/auth.js` — technická správa identity (SessionStorage):
```js
// Autentizace = kde je uložen token (infrastruktura)
// Autorizace = co smí uživatel dělat (business logika v Dispatcheru)
export function saveAuthToken(userId) { sessionStorage.setItem("authToken", userId); }
export function clearAuthToken()      { sessionStorage.removeItem("authToken"); }
```

**Možné otázky a odpovědi:**

> *Proč router dispatchuje `NAVIGATE` místo aby přímo měnil stav?*  
> Router je infrastruktura — jeho jediná odpovědnost je převést URL na záměr (akci). Rozhodnutí co se tím záměrem stane patří Dispatcheru. Díky tomu lze navigaci testovat stejně jako jakoukoliv jinou akci.

> *Jaký je rozdíl mezi autentizací a autorizací v projektu?*  
> Autentizace (IR08) řeší *kdo uživatel je* — uložení a čtení tokenu v SessionStorage. Autorizace řeší *co smí udělat* — to je business logika v Dispatcheru (kontrola `status === "SUSPENDED"`, `role === "ADMIN"` apod.).

> *Proč SessionStorage a ne LocalStorage?*  
> SessionStorage se automaticky smaže po zavření záložky — simuluje chování skutečné relace (session). LocalStorage by přihlášení zachoval i po restartu prohlížeče, což není pro tento typ aplikace žádoucí.

---

### 🔴 Max Jasinek

**Moje odpovědnosti:**
- Business entita **UserAccount** — stavový automat uživatele, oprávnění, stavová pravidla.
- **IR06** — `src/views.js`, renderovací logika pomocí `document.createElement`, žádný `innerHTML`.
- **IR07** — `src/handlers.js`, vazba UI interakcí na akce, izolace UI od business logiky.

**Klíčové části kódu (co budu obhajovat):**

`src/state.js` — funkce `transitionUserState()`:
```js
// VERIFY pracuje pro oba validní zdroje — nový uživatel i rehabilitovaný zákazník.
case "VERIFY":  if (user.status === "REGISTERED" || user.status === "SUSPENDED") newUser.status = "VERIFIED"; break;
// BLOCK je možný z jakéhokoliv stavu — trvalá sankce bez podmínky.
case "BLOCK":   newUser.status = "BLOCKED"; break;
```

`src/views.js` — helper `h()` místo `innerHTML`:
```js
function h(tag, props, ...children) {
    const el = document.createElement(tag); // žádný innerHTML
    if (props) {
        Object.entries(props).forEach(([k, v]) => {
            if (k.startsWith('on') && typeof v === 'function') {
                el.addEventListener(k.toLowerCase().slice(2), v); // bezpečné připojení eventů
            } else {
                el.setAttribute(k, v);
            }
        });
    }
    // ...
}
```

`src/handlers.js` — handlery jsou tenká vrstva, neobsahují logiku:
```js
// Handler pouze "přeloží" interakci na akci — nerozhoduje o ničem sám.
export const onReserve = (itemId) => dispatchAction({ type: "RESERVE_START", payload: { itemId } });
export const onReturn  = (loanId, isDamaged) => dispatchAction({ type: "RETURN_ITEM", payload: { loanId, isDamaged } });
```

`src/views.js` — pohled dostává data přes selektor, ne přímo ze stavu:
```js
function renderCustomer() {
    const items = getAvailableItems(appState); // přes selektor
    const res   = getUserReservations(appState); // přes selektor
    // View pouze zobrazuje — nerozhoduje o business logice
}
```

**Možné otázky a odpovědi:**

> *Proč je zakázán `innerHTML`?*  
> `innerHTML` míchá data se strukturou, obchází bezpečnostní model DOMu (XSS) a znemožňuje kontrolu nad vznikem UI. `document.createElement` zajistí, že každý prvek vznikne explicitně a kontrolovaně.

> *Proč jsou handlery v samostatném souboru?*  
> Handlery jsou vrstva, která převádí uživatelské interakce na akce — to je jejich jediná odpovědnost (IR07). Pokud by byly přímo ve View, View by vědělo o struktuře akcí a Dispatcheru, čímž by porušilo oddělení vrstev.

> *Jak funguje re-render?*  
> `renderApp()` je registrována jako listener v Dispatcheru (`subscribe(renderApp)`). Po každé změně stavu Dispatcher zavolá všechny listenery → `renderApp` smaže obsah `#app` a vykreslí celý strom znovu z aktuálního stavu.

---

