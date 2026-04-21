import { renderApp } from './src/views.js';
import { subscribe } from './src/dispatch.js';
import { initRouter } from './src/router.js';

// 1. Zaregistrujeme překreslení UI při jakékoliv změně stavu
subscribe(renderApp);

// 2. Inicializujeme router (to vyvolá první akci NAVIGATE a následně první render)
initRouter();