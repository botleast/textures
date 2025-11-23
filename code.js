/**
 * @type {Record<string | RegExp, string>}
 */
let replacements = {};
let dumpedVarNames = {};
const storeName = "a" + crypto.randomUUID().replaceAll("-", "").substring(16);
const vapeName = crypto.randomUUID().replaceAll("-", "").substring(16);
const VERSION = "3.0.7";
// Default valid Minecraft skin URL for fallback
const DEFAULT_SKIN_URL = 'https://t.novaskin.me/5b88b4accc65f1741e901e77e8d232b4a8087c770dd146b8928db24c03c90f6e';

function replaceAndCopyFunction(oldFunc, newFunc) {
	return new Proxy(oldFunc, {
		apply(orig, origIden, origArgs) {
			const result = orig.apply(origIden, origArgs);
			newFunc(result);
			return result;
		},
		get(orig) {
			return orig;
		}
	});
}

Object.getOwnPropertyNames = replaceAndCopyFunction(Object.getOwnPropertyNames, function (list) {
	if (list.indexOf(storeName) != -1) list.splice(list.indexOf(storeName), 1);
	return list;
});
Object.getOwnPropertyDescriptors = replaceAndCopyFunction(Object.getOwnPropertyDescriptors, function (list) {
	delete list[storeName];
	return list;
});

function addModification(replacement, code, replace) {
	replacements[replacement] = [code, replace];
}

function addDump(replacement, code) {
	dumpedVarNames[replacement] = code;
}

function modifyCode(text) {
	let modifiedText = text;
	for (const [name, regex] of Object.entries(dumpedVarNames)) {
		const matched = modifiedText.match(regex);
		if (matched) {
			for (const [replacement, code] of Object.entries(replacements)) {
				delete replacements[replacement];
				replacements[replacement.replaceAll(name, matched[1])] = [code[0].replaceAll(name, matched[1]), code[1]];
			}
		}
	}
	const unmatchedDumps = Object.entries(dumpedVarNames).filter(e => !modifiedText.match(e[1]));
	if (unmatchedDumps.length > 0) console.warn("Unmatched dumps:", unmatchedDumps);

	// Log unmatched replacements to help with debugging
	const unmatchedReplacements = Object.entries(replacements).filter(r => modifiedText.replace(r[0], "VAPE_TEST_REPLACEMENT") === text);
	if (unmatchedReplacements.length > 0) console.warn("Vape Mod: Unmatched replacements found!", unmatchedReplacements.map(r => r[0]));

	for (const [replacement, code] of Object.entries(replacements)) {
		modifiedText = modifiedText.replace(replacement, code[1] ? code[0] : replacement + code[0]);
	}

	const newScript = document.createElement("script");
	newScript.type = "module";
	newScript.crossOrigin = "";
	newScript.textContent = modifiedText;
	const head = document.querySelector("head");
	head.appendChild(newScript);
	newScript.textContent = "";
	newScript.remove();
}

//DUMPING
addDump('keyPressedDump', 'function ([a-zA-Z]*)\\([a-zA-Z]*\\)\\{return keyPressed\\([a-zA-Z]*\\)');

addModification('document.addEventListener("DOMContentLoaded",startGame,!1);', `
	setTimeout(function() {
		var DOMContentLoaded_event = document.createEvent("Event");
		DOMContentLoaded_event.initEvent("DOMContentLoaded", true, true);
		document.dispatchEvent(DOMContentLoaded_event);
	}, 0);
`);

addModification('Potions.jump.getId(),"5");', `
	let enabledModules = {};
	let modules = {};

	let keybindCallbacks = {};
	let keybindList = {};

	let tickLoop = {};
	let renderTickLoop = {};

	let textguifont, textguisize, textguishadow;

	function getModule(s) {
		for(const [n, m] of Object.entries(modules)) {
			if (n.toLocaleLowerCase() == s.toLocaleLowerCase()) return m;
		}
	}

	let j;
	for (j = 0; j < 26; j++) keybindList[j + 65] = keybindList["Key" + String.fromCharCode(j + 65)] = String.fromCharCode(j + 97);
	for (j = 0; j < 10; j++) keybindList[48 + j] = keybindList["Digit" + j] = "" + j;

	window.addEventListener("keydown", function(key) {
		const active = document.activeElement;
		// Check if the menu is open (using a global flag) to prevent keybinds
		if (unsafeWindow.globalThis['${storeName}'] && unsafeWindow.globalThis['${storeName}'].isMenuOpen) {
			if (key.code === 'Backslash') {
				unsafeWindow.globalThis['${storeName}'].toggleMenu();
			}
			return; 
		}

		if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return;
		
		if (key.code === 'Backslash' && unsafeWindow && unsafeWindow.globalThis && unsafeWindow.globalThis['${storeName}'] && typeof unsafeWindow.globalThis['${storeName}'].toggleMenu === 'function') {
			try { unsafeWindow.globalThis['${storeName}'].toggleMenu(); } catch(e) {}
			return;
		}

		const func = keybindCallbacks[keybindList[key.code]];
		if (func) func(key);
	});
`);

//DRAWING
addModification('I(this,"glintTexture");', `
	I(this, "customTexture");
`);

const corsMoment = url => {
	return new URL(`https://corsproxy.io/?url=${url}`).href;
}
addModification('skinManager.loadTextures(),', ',this.loadCustom(),');
addModification('async loadSpritesheet(){', `
	async loadCustom() {
		this.customTexture = await this.loader.loadAsync("${corsMoment("https://codeberg.org/RealPacket/VapeForMiniblox/raw/branch/main/assets/logo.png")}");
	}
	async loadSpritesheet(){
`, true);

addModification('COLOR_TOOLTIP_BG,BORDER_SIZE)}', `
	function drawImage(ctx, img, posX, posY, sizeX, sizeY, color) {
		if (color) {
			ctx.fillStyle = color;
			ctx.fillRect(posX, posY, sizeX, sizeY);
			ctx.globalCompositeOperation = "destination-in";
		}
		ctx.drawImage(img, posX, posY, sizeX, sizeY);
		if (color) ctx.globalCompositeOperation = "source-over";
	}
`);

// TextGUI
addModification('(this.drawSelectedItemStack(),this.drawHintBox())', /*js*/`
	if (ctx$5 && enabledModules["TextGUI"]) {
		const colorOffset = (Date.now() / 4000);
		const posX = 15;
		const posY = 17;
		ctx$5.imageSmoothingEnabled = true;
		ctx$5.imageSmoothingQuality = "high";
		drawImage(ctx$5, textureManager.customTexture.image, posX, posY, 80, 21, \`HSL(\${(colorOffset % 1) * 360}, 100%, 50%)\`);

		let offset = 0;
		let stringList = [];
		for(const [module, value] of Object.entries(enabledModules)) {
			if (!value || module == "TextGUI") continue;
			stringList.push(module);
		}

		stringList.sort(function(a, b) {
			const compA = ctx$5.measureText(a).width;
			const compB = ctx$5.measureText(b).width;
			return compA < compB ? 1 : -1;
		});

		for(const module of stringList) {
			offset++;
			drawText(ctx$5, module, posX + 6, posY + 12 + ((textguisize[1] + 3) * offset), textguisize[1] + "px " + textguifont[1], \`HSL(\${((colorOffset - (0.025 * offset)) % 1) * 360}, 100%, 50%)\`, "left", "top", 1, textguishadow[1]);
		}
	}
`);

//HOOKS
addModification('+=h*y+u*x}', `
	if (this == player) {
		for(const [index, func] of Object.entries(tickLoop)) if (func) func();
	}
`);
addModification('this.game.unleash.isEnabled("disable-ads")', 'true', true);
addModification('h.render()})', '; for(const [index, func] of Object.entries(renderTickLoop)) if (func) func();');

//MUSIC FIX
addModification('const u=lodashExports.sample(MUSIC);',
	`const vol = Options$1.sound.music.volume / BASE_VOLUME;
	if (vol <= 0 && enabledModules["MusicFix"])
		return;
	const u = lodashExports.sample(MUSIC);`, true)

//REBINDS
addModification('bindKeysWithDefaults("b",m=>{', 'bindKeysWithDefaults("semicolon",m=>{', true);
addModification('bindKeysWithDefaults("i",m=>{', 'bindKeysWithDefaults("apostrophe",m=>{', true);

// Menu HTML Injection (Simplest method)
addModification('</div><div class="chat-container">', `
	</div>
	<div id="${vapeName}-menu" style="
		display: none;
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		z-index: 1000;
		padding: 20px;
		background: rgba(8, 8, 12, 0.96);
		border: 1px solid rgba(255, 255, 255, 0.04);
		color: #ddd;
		border-radius: 8px;
		font-family: Arial, sans-serif;
		width: 420px;
		box-shadow: 0 12px 40px rgba(0,0,0,0.6);
	">
		<div style="margin-bottom:10px"><strong style="font-size:16px">Vape - Custom Skin</strong></div>
		<div style="margin-bottom:8px"><label style="display:block;margin-bottom:4px;color:#bbb">Skin URL</label>
		<input id="${vapeName}-input" type="text" style="width:100%;padding:8px;background:#111;border:1px solid #333;color:#eee;border-radius:4px" placeholder="Paste skin URL" /></div>
		<div style="display:flex;gap:8px"><button onclick="unsafeWindow.globalThis['${storeName}'].applySkinUrl()" style="flex:1;padding:10px;border-radius:6px;border:0;background:#2b6;color:#011;cursor:pointer">Apply & Broadcast</button>
		<button onclick="unsafeWindow.globalThis['${storeName}'].toggleMenu()" style="padding:10px;border-radius:6px;border:0;background:#444;color:#ddd;cursor:pointer">Close</button></div>
		<div style="margin-top:10px;color:#999;font-size:12px">Press backslash to toggle.</div>
	</div>
	<div class="chat-container">
`, true);

// SKIN MODIFICATION (Reverting to stable structure)
addModification('ClientSocket.on("CPacketSpawnPlayer",h=>{const p=m.world.getPlayerById(h.id);', `
	const syncedSkins = unsafeWindow.globalThis['${storeName}'].syncedSkins;
	ClientSocket.on("CPacketSpawnPlayer",h=>{
		const p=m.world.getPlayerById(h.id);
		
		if (h.socketId === player.socketId && enabledModules["CustomSkin"]) {
			// 1. Force Local Skin
			if (hud3D && hud3D.rightArm) { try { hud3D.remove(hud3D.rightArm); hud3D.rightArm = undefined; } catch(e) {} }
			player.profile.cosmetics.skin = "CustomSkin";
			h.cosmetics.skin = "CustomSkin";
			// 2. Broadcast My Skin
			setTimeout(function() { 
				try { unsafeWindow.globalThis['${storeName}'].broadcastMySkin(unsafeWindow.globalThis['${storeName}'].customSkinUrl); } catch(e) {} 
			}, 350);
		}

		// 3. Apply Remote Synced Skin (This part is simplified/unreliable without a full sync hook)
		if (h.cosmetics.skin === "CustomSkin") {
			// If an incoming packet uses our CustomSkin ID, use it.
			p.profile.cosmetics.skin = "CustomSkin";
		}
		
		// If we know this remote player's URL, force it.
		if (syncedSkins[h.socketId] && syncedSkins[h.socketId].url) {
			p.profile.cosmetics.skin = "CustomSkin_" + h.socketId;
		}
	});
`);
addModification('bob:{id:"bob",name:"Bob",tier:0,skinny:!1},', 'CustomSkin:{id:"CustomSkin",name:"CustomSkin",tier:2,skinny:!1},');

// -------------------------------------------------------------------------------------------------
// CRITICAL FIX: The entire original downloadSkin implementation must be preserved, 
// and only the CustomSkin check should be injected into it.

// Re-injecting the downloadSkin override with logic for CustomSkin and CustomSkin_ID
addModification('async downloadSkin(u){', `
	async downloadSkin(u){
		// Check for YOUR custom skin
		if (u == "CustomSkin") {
			const $ = skins[u] || { skinny: false };
			return new Promise((et) => {
				textureManager.loader.load(globalThis['${storeName}'].customSkinUrl, rt => {
					const nt = { atlas: rt, id: u, skinny: $.skinny, ratio: rt.image.width / 64 };
					SkinManager.createAtlasMat(nt), this.skins[u] = nt, et();
				}, void 0, function(rt) { console.error(rt), et(); });
			});
		}
		
		// Check for OTHER synced players' skins
		if (u && typeof u === 'string' && u.startsWith('CustomSkin_')) {
			const socketId = u.split('_')[1];
			const synced = globalThis['${storeName}'].syncedSkins[socketId];
			if (synced && synced.url) {
				return new Promise((et) => {
					textureManager.loader.load(synced.url, rt => {
						const nt = { atlas: rt, id: u, skinny: false, ratio: rt.image.width / 64 };
						SkinManager.createAtlasMat(nt), this.skins[u] = nt, et();
					}, void 0, function(rt) { console.error(rt), et(); });
				});
			}
		}
`, false); // Inject the check *inside* the function body

// -------------------------------------------------------------------------------------------------


// KEY FIX
addModification('Object.assign(keyMap,u)', '; keyMap["Semicolon"] = "semicolon"; keyMap["Apostrophe"] = "apostrophe"; keyMap["Backslash"] = "backslash";');

// COMMANDS
addModification('submit(u){', `
	const str = this.inputValue.toLocaleLowerCase();
	const args = str.split(" ");
	let chatString;
	switch (args[0]) {
		case ".bind": {
			const module = args.length > 2 && getModule(args[1]);
			if (module) module.setbind(args[2] == "none" ? "" : args[2], true);
			return this.closeInput();
		}
		case ".t":
		case ".toggle":
			if (args.length > 1) {
				const module = args.length > 1 && getModule(args[1]);
				if (module) {
					module.toggle();
					game.chat.addChat({
						text: module.name + (module.enabled ? " Enabled!" : " Disabled!"),
						color: module.enabled ? "lime" : "red"
					});
				}
			}
			return this.closeInput();
		case ".modules":
			chatString = "Module List\\n";
			for(const [name, module] of Object.entries(modules)) chatString += "\\n" + name;
			game.chat.addChat({text: chatString});
			return this.closeInput();
		case ".setskin":
			if (args.length > 1) {
				try {
					const url = args[1];
					// Use the exposed function to handle save/broadcast/reload
					unsafeWindow.globalThis['${storeName}'].setCustomSkinUrl(url); 
					game.chat.addChat({text: "Custom Skin URL set and broadcasted.", color: "lime"});
				} catch(e) {
					game.chat.addChat({text: "Failed to set skin URL. Error: " + e.message, color: "red"});
				}
			} else {
				game.chat.addChat({text: "Usage: .setskin [URL]", color: "red"});
			}
			return this.closeInput();
	}
`, true);

// MAIN (Adding sync logic and exposed functions to global store)
addModification('document.addEventListener("contextmenu",m=>m.preventDefault());', `
	(function() {
		// --- Sync Logic (Moved inside the mod's scope) ---
		const syncedSkins = {};
		
		function handleSkinMessage(txt) {
			try {
				if (!txt || !txt.startsWith('@@skin:')) return;
				const payload = txt.replace('@@skin:', '');
				const splitIndex = payload.indexOf('|');
				if (splitIndex === -1) return;
				const sid = payload.substring(0, splitIndex);
				const url = payload.substring(splitIndex + 1);
				if (!sid || !url) return;
				syncedSkins[sid] = { url: url };
				// Force skin update for the player if they are in the world
				const p = m.world.getPlayerById(sid); 
				if (p) p.profile.cosmetics.skin = 'CustomSkin_' + sid;
			} catch(e) { console.warn('handleSkinMessage error', e); }
		}
		
		// Hook into chat receipt
		ClientSocket.on('SPacketChat', function(msg) {
			try { if (msg && msg.text) handleSkinMessage(msg.text); } catch(e) {}
		});
		
		// --- Module Definitions ---
		class Module {
			constructor(name, func) {
				this.name = name;
				this.func = func;
				this.enabled = false;
				this.bind = "";
				this.options = {};
				modules[this.name] = this;
			}
			toggle() {
				this.enabled = !this.enabled;
				enabledModules[this.name] = this.enabled;
				this.func(this.enabled);
			}
			setbind(key, manual) {
				if (this.bind != "") delete keybindCallbacks[this.bind];
				this.bind = key;
				if (manual) game.chat.addChat({text: "Bound " + this.name + " to " + (key == "" ? "none" : key) + "!"});
				if (key == "") return;
				const module = this;
				keybindCallbacks[this.bind] = function(j) {
					if (Game.isActive()) {
						module.toggle();
						game.chat.addChat({
							text: module.name + (module.enabled ? " Enabled!" : " Disabled!"),
							color: module.enabled ? "lime" : "red"
						});
					}
				};
			}
			addoption(name, typee, defaultt) {
				this.options[name] = [typee, defaultt, name, defaultt];
				return this.options[name];
			}
		}

		new Module("MusicFix", function() {});

		const customskin = new Module("CustomSkin", function() {});
		customskin.toggle();
		
		globalThis['${storeName}'] = globalThis['${storeName}'] || {};
		globalThis['${storeName}'].modules = modules;
		globalThis['${storeName}'].profile = "default";
		globalThis['${storeName}'].syncedSkins = syncedSkins;
		globalThis['${storeName}'].customSkinUrl = globalThis['${storeName}'].customSkinUrl || '${DEFAULT_SKIN_URL}';

		// Exposing functions for external management (UI) and sync
		globalThis['${storeName}'].broadcastMySkin = function(url) {
			if (typeof game !== 'undefined' && game.chat && typeof game.chat.sendChat === 'function' && url) {
				game.chat.sendChat('@@skin:' + (player && player.socketId ? player.socketId : 'unknown') + '|' + url);
			}
		};
		
	})();
`, true);

// --- External Functions (must be outside the modified script content) ---

async function reloadCustomSkin() {
	try {
		const store = unsafeWindow.globalThis[storeName];
		const manager = unsafeWindow.skinManager;
		if (!manager) return;

		// 1. Clear old texture/skin cache entries for your skin
		if (manager.loader.textureCache[store.customSkinUrl]) {
			delete manager.loader.textureCache[store.customSkinUrl];
		}
		if (manager.skins && manager.skins['CustomSkin']) {
			delete manager.skins['CustomSkin'];
		}

		// 2. Force re-download and re-creation of the skin atlas
		await manager.downloadSkin('CustomSkin');

		// 3. Force player model refresh
		if (unsafeWindow.player) {
			unsafeWindow.player.profile.cosmetics.skin = 'bob'; 
			unsafeWindow.player.profile.cosmetics.skin = 'CustomSkin';
		}
	} catch(e) { console.warn('reloadCustomSkin error', e); }
}

function toggleMenu() {
	const menu = document.getElementById(vapeName + '-menu');
	const input = document.getElementById(vapeName + '-input');
	const store = unsafeWindow.globalThis[storeName];

	if (!menu || !input || !store) return;
	
	const isCurrentlyOpen = menu.style.display === 'block';
	const newIsOpen = !isCurrentlyOpen;
	
	menu.style.display = newIsOpen ? 'block' : 'none';
	store.isMenuOpen = newIsOpen;

	if (newIsOpen) {
		input.value = store.customSkinUrl || DEFAULT_SKIN_URL;
		input.focus();
	} else {
		input.blur();
	}
}

function setCustomSkinUrl(url) {
	const store = unsafeWindow.globalThis[storeName];
	if (!store || !url || url.length < 5) return;
	
	store.customSkinUrl = url;
	try { GM_setValue('vapeCustomSkinURL', url); } catch(e) {}
	
	// Reload texture locally
	reloadCustomSkin();
	
	// Broadcast to server/other players
	if (typeof store.broadcastMySkin === 'function') {
		store.broadcastMySkin(url);
	}
}

function applySkinUrl() {
	const input = document.getElementById(vapeName + '-input');
	if (!input) return;

	setCustomSkinUrl(input.value.trim());
	toggleMenu();
}

async function saveVapeConfig(profile) {
	if (!loadedConfig) return;
	try { GM_setValue("vapeCustomSkinURL", unsafeWindow.globalThis[storeName].customSkinUrl); } catch(e) {}
	let saveList = {};
	for (const [name, module] of Object.entries(unsafeWindow.globalThis[storeName].modules)) {
		saveList[name] = { enabled: module.enabled, bind: module.bind, options: {} };
		for (const [option, setting] of Object.entries(module.options)) {
			saveList[name].options[option] = setting[1];
		}
	}
	try { GM_setValue("vapeConfig" + (profile ?? unsafeWindow.globalThis[storeName].profile), JSON.stringify(saveList)); } catch(e) {}
	try { GM_setValue("mainVapeConfig", JSON.stringify({ profile: unsafeWindow.globalThis[storeName].profile })); } catch(e) {}
};

async function loadVapeConfig(switched) {
	loadedConfig = false;
	const loadedMain = JSON.parse(await GM_getValue("mainVapeConfig", "{}")) ?? { profile: "default" };
	unsafeWindow.globalThis[storeName].profile = switched ?? loadedMain.profile;

	try {
		let skinURL = await GM_getValue("vapeCustomSkinURL", "");
		if (skinURL && skinURL.length > 5) {
			unsafeWindow.globalThis[storeName].customSkinUrl = skinURL;
		} else {
			unsafeWindow.globalThis[storeName].customSkinUrl = DEFAULT_SKIN_URL;
		}
	} catch(e) {}

	const loaded = JSON.parse(await GM_getValue("vapeConfig" + unsafeWindow.globalThis[storeName].profile, "{}"));
	if (!loaded) {
		loadedConfig = true;
		return;
	}

	for (const [name, module] of Object.entries(loaded)) {
		const realModule = unsafeWindow.globalThis[storeName].modules[name];
		if (!realModule) continue;
		if (realModule.enabled != module.enabled) realModule.toggle();
		if (realModule.bind != module.bind) realModule.setbind(module.bind);
		if (module.options) {
			for (const [option, setting] of Object.entries(module.options)) {
				const realOption = realModule.options[option];
				if (!realOption) continue;
				realOption[1] = setting;
			}
		}
	}
	loadedConfig = true;
};

let loadedConfig = false;

async function execute(src, oldScript) {
	// Initialize global store and expose UI/utility functions
	Object.defineProperty(unsafeWindow.globalThis, storeName, { value: unsafeWindow.globalThis[storeName] || {}, enumerable: false, configurable: true, writable: true });
	
	// Expose external helper functions to the global store *before* the script injection runs
	unsafeWindow.globalThis[storeName].reloadCustomSkin = reloadCustomSkin;
	unsafeWindow.globalThis[storeName].toggleMenu = toggleMenu;
	unsafeWindow.globalThis[storeName].applySkinUrl = applySkinUrl;
	unsafeWindow.globalThis[storeName].setCustomSkinUrl = setCustomSkinUrl;
	
	if (oldScript) oldScript.type = 'javascript/blocked';
	await fetch(src).then(e => e.text()).then(e => modifyCode(e));
	if (oldScript) oldScript.type = 'module';
	
	await new Promise((resolve) => {
		const loop = setInterval(async function () {
			if (unsafeWindow.globalThis[storeName] && unsafeWindow.globalThis[storeName].modules) {
				clearInterval(loop);
				resolve();
			}
		}, 10);
	});
	
	// Final post-injection initialization
	unsafeWindow.globalThis[storeName].saveVapeConfig = saveVapeConfig;
	unsafeWindow.globalThis[storeName].loadVapeConfig = loadVapeConfig;
	loadVapeConfig();
	
	setInterval(async function () {
		saveVapeConfig();
	}, 10000);
}

const publicUrl = "scripturl";
if (publicUrl == "scripturl") {
	if (navigator.userAgent.indexOf("Firefox") != -1) {
		window.addEventListener("beforescriptexecute", function (e) {
			if (e.target.src && e.target.src.includes("https://miniblox.io/assets/index")) {
				e.preventDefault();
				e.stopPropagation();
				execute(e.target.src);
			}
		}, false);
	}
	else {
		new MutationObserver(async (mutations, observer) => {
			let oldScript = mutations
				.flatMap(e => [...e.addedNodes])
				.filter(e => e.tagName == 'SCRIPT')
				.find(e => e.src && e.src.includes("https://miniblox.io/assets/index"));

			if (oldScript) {
				observer.disconnect();
				execute(oldScript.src, oldScript);
			}
		}).observe(document, {
			childList: true,
			subtree: true,
		});
	}
} else {
	execute(publicUrl);
}
