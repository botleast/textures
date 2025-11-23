/**
 * @type {Record<string | RegExp, string>}
 */
let replacements = {};
let dumpedVarNames = {};
const storeName = "a" + crypto.randomUUID().replaceAll("-", "").substring(16);
const vapeName = crypto.randomUUID().replaceAll("-", "").substring(16);
const VERSION = "3.0.7";

// ANTICHEAT HOOK
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

/**
 *
 * @param {string} replacement
 * @param {string} code
 * @param {boolean} replace
 */
function addModification(replacement, code, replace) {
	replacements[replacement] = [code, replace];
}

function addDump(replacement, code) {
	dumpedVarNames[replacement] = code;
}

/**
 *
 * @param {string} text
 */
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

	const unmatchedReplacements = Object.entries(replacements).filter(r => modifiedText.replace(r[0]) === text);
	if (unmatchedReplacements.length > 0) console.warn("Unmatched replacements:", unmatchedReplacements);

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

(function () {
	'use strict';

	// DUMPING - 基本的なダンプのみ保持
	addDump('keyPressedDump', 'function ([a-zA-Z]*)\\([a-zA-Z]*\\)\{return keyPressed\\([a-zA-Z]*\\)');

	// PRE
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
			const func = keybindCallbacks[keybindList[key.code]];
			if (func) func(key);
		});
	`);

	// ブランディング表示を削除
	addModification('VERSION$1," | ",', `""," | ",`);

	// DRAWING SETUP - テクスチャ名を変更
	addModification('I(this,"glintTexture");', `
		I(this, "customTexture");
	`);
	/**
	 * @param {string} url
	 * @returns
	 */
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

	// TEXT GUI
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

	// HOOKS
	addModification('+=h*y+u*x}', `
		if (this == player) {
			for(const [index, func] of Object.entries(tickLoop)) if (func) func();
		}
	`);
	addModification('this.game.unleash.isEnabled("disable-ads")', 'true', true);
	addModification('h.render()})', '; for(const [index, func] of Object.entries(renderTickLoop)) if (func) func();');

	// MUSIC FIX
	addModification('const u=lodashExports.sample(MUSIC);',
		`const vol = Options$1.sound.music.volume / BASE_VOLUME;
		if (vol <= 0 && enabledModules["MusicFix"])
			return;
		const u = lodashExports.sample(MUSIC);`, true)

	// REBIND
	addModification('bindKeysWithDefaults("b",m=>{', 'bindKeysWithDefaults("semicolon",m=>{', true);
	addModification('bindKeysWithDefaults("i",m=>{', 'bindKeysWithDefaults("apostrophe",m=>{', true);

	// SKIN MODIFICATION - 手の部分も含めた慎重なカスタムスキン実装
	addModification('ClientSocket.on("CPacketSpawnPlayer",h=>{const p=m.world.getPlayerById(h.id);', `
		if (h.socketId === player.socketId && enabledModules["CustomSkin"]) {
			// 既存の手のメッシュを安全に削除
			if (hud3D && hud3D.rightArm) {
				try {
					hud3D.remove(hud3D.rightArm);
					hud3D.rightArm = undefined;
				} catch(e) {
					console.warn("Hand removal failed:", e);
				}
			}
			player.profile.cosmetics.skin = "CustomSkin";
			h.cosmetics.skin = "CustomSkin";
		}
	`);
	addModification('bob:{id:"bob",name:"Bob",tier:0,skinny:!1},', 'CustomSkin:{id:"CustomSkin",name:"CustomSkin",tier:2,skinny:!1},');
	addModification('async downloadSkin(u){', `
		if (u == "CustomSkin") {
			const $ = skins[u];
			return new Promise((et, tt) => {
				textureManager.loader.load("https://t.novaskin.me/1f769e7a3b71e95c9fd291dfe9979aebccbffbbe37d22126e9f187060ac99484", rt => {
					const nt = {
						atlas: rt,
						id: u,
						skinny: $.skinny,
						ratio: rt.image.width / 64
					};
					SkinManager.createAtlasMat(nt), this.skins[u] = nt, et();
				}, void 0, function(rt) {
					console.error(rt), et();
				});
			});
		}
	`);

	// KEY FIX
	addModification('Object.assign(keyMap,u)', '; keyMap["Semicolon"] = "semicolon"; keyMap["Apostrophe"] = "apostrophe";');

	// COMMANDS - 基本的なコマンドのみ保持
	addModification('submit(u){', /*js*/`
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
		}
	`);

	// MAIN - 基本機能のみ保持（ブランディング削除）
	addModification('document.addEventListener("contextmenu",m=>m.preventDefault());', /*js*/`
		(function() {
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

			// 基本的なモジュールのみ
			new Module("MusicFix", function() {});

			const customskin = new Module("CustomSkin", function() {});
			customskin.toggle();

			globalThis.${storeName}.modules = modules;
			globalThis.${storeName}.profile = "default";
		})();
	`);

	async function saveVapeConfig(profile) {
		if (!loadedConfig) return;
		let saveList = {};
		for (const [name, module] of Object.entries(unsafeWindow.globalThis[storeName].modules)) {
			saveList[name] = { enabled: module.enabled, bind: module.bind, options: {} };
			for (const [option, setting] of Object.entries(module.options)) {
				saveList[name].options[option] = setting[1];
			}
		}
		GM_setValue("vapeConfig" + (profile ?? unsafeWindow.globalThis[storeName].profile), JSON.stringify(saveList));
		GM_setValue("mainVapeConfig", JSON.stringify({ profile: unsafeWindow.globalThis[storeName].profile }));
	};

	async function loadVapeConfig(switched) {
		loadedConfig = false;
		const loadedMain = JSON.parse(await GM_getValue("mainVapeConfig", "{}")) ?? { profile: "default" };
		unsafeWindow.globalThis[storeName].profile = switched ?? loadedMain.profile;
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
		Object.defineProperty(unsafeWindow.globalThis, storeName, { value: {}, enumerable: false });
		if (oldScript) oldScript.type = 'javascript/blocked';
		await fetch(src).then(e => e.text()).then(e => modifyCode(e));
		if (oldScript) oldScript.type = 'module';
		await new Promise((resolve) => {
			const loop = setInterval(async function () {
				if (unsafeWindow.globalThis[storeName].modules) {
					clearInterval(loop);
					resolve();
				}
			}, 10);
		});
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
				if (e.target.src.includes("https://miniblox.io/assets/index")) {
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
					.find(e => e.src.includes("https://miniblox.io/assets/index"));

				if (oldScript) {
					observer.disconnect();
					execute(oldScript.src, oldScript);
				}
			}).observe(document, {
				childList: true,
				subtree: true,
			});
		}
	}
	else {
		execute(publicUrl);
	}
})();
