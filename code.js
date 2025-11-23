(function () {
	'use strict';
	/**
	 * @type {Record<string | RegExp, string>}
	 */
	let replacements = {};
	let dumpedVarNames = {};
	const storeName = "a" + crypto.randomUUID().replaceAll("-", "").substring(16);
	const vapeName = crypto.randomUUID().replaceAll("-", "").substring(16);
	const VERSION = "3.0.7";

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

	//SKIN SYNC
	function makeSkinSyncSnippet(defaultSkinUrlLiteral) {
		return `
		(function() {
			try {
				const syncedSkins = {};
				const defaultCustomSkinURL = "${defaultSkinUrlLiteral}";

				function safeCall(fn) { try { return fn(); } catch(e) { console.warn(e); } }

				function broadcastMySkin(url) {
					if (!url) return;
					try {
						if (typeof game !== 'undefined' && game.chat && typeof game.chat.sendChat === 'function') {
							game.chat.sendChat('@@skin:' + (player && player.socketId ? player.socketId : 'unknown') + '|' + url);
							return;
						}
						if (typeof ClientSocket !== 'undefined' && ClientSocket.emit) {
							ClientSocket.emit('CPacketChat', { text: '@@skin:' + (player && player.socketId ? player.socketId : 'unknown') + '|' + url });
							return;
						}
						if (typeof game !== 'undefined' && game.chat && typeof game.chat.addChat === 'function') {
							game.chat.addChat({ text: '@@skin:' + (player && player.socketId ? player.socketId : 'unknown') + '|' + url, color: 'transparent' });
						}
					} catch(e) { console.warn('broadcastMySkin failed', e); }
				}

				function applyRemoteSkinToPlayer(socketId, url) {
					if (!socketId || !url) return;
					const id = 'CustomSkin_' + socketId;
					try {
						if (window.skins && window.skins[id]) {
							const p = safeCall(() => m.world.getPlayerById(socketId));
							if (p) p.cosmetics.skin = id;
							return;
						}
						textureManager.loader.load(url, rt => {
							const nt = { atlas: rt, id: id, skinny: false, ratio: rt.image.width / 64 };
							SkinManager.createAtlasMat(nt);
							if (!window.skins) window.skins = {};
							window.skins[id] = nt;
							const p = safeCall(() => m.world.getPlayerById(socketId));
							if (p) p.cosmetics.skin = id;
						});
					} catch(e) { console.warn('applyRemoteSkin error', e); }
				}

				//SPAWN HOOK
				if (typeof ClientSocket !== 'undefined' && ClientSocket.on) {
					ClientSocket.on('CPacketSpawnPlayer', function(h) {
						try {
							const p = m.world.getPlayerById(h.id);
							if (h.socketId === player.socketId && enabledModules && enabledModules['CustomSkin']) {
								try { if (hud3D && hud3D.rightArm) { hud3D.remove(hud3D.rightArm); hud3D.rightArm = undefined; } } catch(e) {}
								player.profile.cosmetics.skin = 'CustomSkin';
								h.cosmetics.skin = 'CustomSkin';
								setTimeout(function() { broadcastMySkin(defaultCustomSkinURL); }, 350);
							}
							if (h && h.cosmetics && typeof h.cosmetics.skin === 'string' && h.cosmetics.skin.startsWith('CustomSkin_')) {
								const sid = h.cosmetics.skin.split('_')[1];
								const entry = syncedSkins[sid];
								if (entry && entry.url) applyRemoteSkinToPlayer(sid, entry.url);
							}
						} catch(e) { console.warn(e); }
					});
				}

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
						applyRemoteSkinToPlayer(sid, url);
					} catch(e) { console.warn('handleSkinMessage', e); }
				}

				if (typeof ClientSocket !== 'undefined' && ClientSocket.on) {
					ClientSocket.on('SPacketChat', function(msg) {
						try { if (msg && msg.text) handleSkinMessage(msg.text); } catch(e) {}
					});
				} else if (typeof game !== 'undefined' && game.chat && game.chat.addChat) {
					const oldAddChat = game.chat.addChat.bind(game.chat);
					game.chat.addChat = function(data) {
						try { if (data && data.text) handleSkinMessage(data.text); } catch(e) {}
						return oldAddChat(data);
					};
				}
				
				try {
					const origDownload = SkinManager.prototype.downloadSkin;
					SkinManager.prototype.downloadSkin = async function(u) {
						try {
							if (u === 'CustomSkin') {
								const $ = this.skins[u] || { skinny: false };
								return new Promise((res) => {
									textureManager.loader.load(defaultCustomSkinURL, function(rt) {
										const nt = { atlas: rt, id: u, skinny: $.skinny, ratio: rt.image.width / 64 };
										SkinManager.createAtlasMat(nt);
										this.skins[u] = nt;
										res();
									}.bind(this));
								});
							}
							if (u && typeof u === 'string' && u.startsWith('CustomSkin_')) {
								const socketId = u.split('_')[1];
								const synced = syncedSkins[socketId];
								if (synced && synced.url) {
									return new Promise((res) => {
										textureManager.loader.load(synced.url, function(rt) {
											const nt = { atlas: rt, id: u, skinny: false, ratio: rt.image.width / 64 };
											SkinManager.createAtlasMat(nt);
											this.skins[u] = nt;
											res();
										}.bind(this));
									});
								}
							}
						} catch(e) { console.warn('download override error', e); }
						return origDownload.call(this, u);
					};
				} catch(e) { console.warn('failed to override downloadSkin', e); }
				try {
					if (window && window['${storeName}']) {
						window['${storeName}'].syncedSkins = syncedSkins;
						window['${storeName}'].broadcastMySkin = broadcastMySkin;
						window['${storeName}'].applyRemoteSkinToPlayer = applyRemoteSkinToPlayer;
					}
				} catch(e) {}
			} catch(e) { console.warn('vape skin-sync snippet top-level error', e); }
		})(); 
		`;
	}
	addModification('ClientSocket.on("CPacketSpawnPlayer",h=>{const p=m.world.getPlayerById(h.id);', makeSkinSyncSnippet('/mnt/data/custom-skin.txt'));
	addModification('bob:{id:"bob",name:"Bob",tier:0,skinny:!1},', 'CustomSkin:{id:"CustomSkin",name:"CustomSkin",tier:2,skinny:!1},');
	addModification('async downloadSkin(u){', `async downloadSkin(u){`, false);
	addModification('Object.assign(keyMap,u)', '; keyMap["Semicolon"] = "semicolon"; keyMap["Apostrophe"] = "apostrophe";');
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
						unsafeWindow.globalThis['${storeName}'].customSkinUrl = url;
						try { GM_setValue('vapeCustomSkinURL', url); } catch(e) {}
						try { unsafeWindow.globalThis['${storeName}'].broadcastMySkin(url); } catch(e) {}
						try { if (unsafeWindow.skinManager) unsafeWindow.skinManager.downloadSkin('CustomSkin'); } catch(e) {}
						game.chat.addChat({text: "Custom Skin URL set and broadcasted.", color: "lime"});
					} catch(e) {
						game.chat.addChat({text: "Failed to set skin URL.", color: "red"});
					}
				} else {
					game.chat.addChat({text: "Usage: .setskin [URL]", color: "red"});
				}
				return this.closeInput();
		}
	`, true);

	// MAIN
	addModification('document.addEventListener("contextmenu",m=>m.preventDefault());', `
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

			new Module("MusicFix", function() {});

			const customskin = new Module("CustomSkin", function() {});
			customskin.toggle();
			
			globalThis['${storeName}'] = globalThis['${storeName}'] || {};
			globalThis['${storeName}'].modules = modules;
			globalThis['${storeName}'].profile = "default";
			globalThis['${storeName}'].customSkinUrl = globalThis['${storeName}'].customSkinUrl || '/mnt/data/custom-skin.txt';
		})();
	`, true);

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
		Object.defineProperty(unsafeWindow.globalThis, storeName, { value: unsafeWindow.globalThis[storeName] || {}, enumerable: false, configurable: true, writable: true });
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

	async function whenReadyAndAttachUI() {
		for (let i = 0; i < 200; i++) {
			if (unsafeWindow && unsafeWindow.globalThis && unsafeWindow.globalThis[storeName]) break;
			await new Promise(r => setTimeout(r, 50));
		}
		if (!unsafeWindow || !unsafeWindow.globalThis || !unsafeWindow.globalThis[storeName]) {
			console.warn('Vape store not available; UI attachment aborted.');
			return;
		}
		const store = unsafeWindow.globalThis[storeName];
		store.customSkinUrl = store.customSkinUrl || '/mnt/data/custom-skin.txt';
		store.toggleMenu = function() {
			const menu = document.getElementById(vapeName + '-menu');
			if (!menu) return;
			menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
			if (menu.style.display === 'block') {
				const input = document.getElementById(vapeName + '-input');
				if (input) input.focus();
			}
		};

		store.setCustomSkinUrl = function(url) {
			store.customSkinUrl = url;
			try { GM_setValue('vapeCustomSkinURL', url); } catch(e) {}
			try { if (window && window[storeName] && typeof window[storeName].broadcastMySkin === 'function') window[storeName].broadcastMySkin(url); } catch(e) {}
			try { if (unsafeWindow.skinManager) unsafeWindow.skinManager.downloadSkin('CustomSkin'); } catch(e) {}
		};

		store.reloadCustomSkin = async function() {
			try {
				const manager = unsafeWindow.skinManager;
				if (!manager) { console.warn('skinManager not found'); return; }
				if (manager.skins && manager.skins['CustomSkin']) delete manager.skins['CustomSkin'];
				try { await manager.downloadSkin('CustomSkin'); } catch(e) {}
				try { if (unsafeWindow.player) { unsafeWindow.player.profile.cosmetics.skin = 'bob'; unsafeWindow.player.profile.cosmetics.skin = 'CustomSkin'; } } catch(e) {}
			} catch(e) { console.warn('reloadCustomSkin error', e); }
		};
		
		if (!document.getElementById(vapeName + '-menu')) {
			const menu = document.createElement('div');
			menu.id = vapeName + '-menu';
			menu.style.position = 'absolute';
			menu.style.top = '50%';
			menu.style.left = '50%';
			menu.style.transform = 'translate(-50%,-50%)';
			menu.style.zIndex = '2147483647';
			menu.style.width = '420px';
			menu.style.padding = '14px';
			menu.style.background = 'rgba(8,8,12,0.96)';
			menu.style.border = '1px solid rgba(255,255,255,0.04)';
			menu.style.color = '#ddd';
			menu.style.borderRadius = '8px';
			menu.style.display = 'none';
			menu.style.boxShadow = '0 12px 40px rgba(0,0,0,0.6)';

			menu.innerHTML = '<div style="margin-bottom:10px"><strong style="font-size:16px">Vape - Custom Skin</strong></div>' +
				'<div style="margin-bottom:8px"><label style="display:block;margin-bottom:4px;color:#bbb">Skin URL</label>' +
				'<input id="' + vapeName + '-input" type="text" style="width:100%;padding:8px;background:#111;border:1px solid #333;color:#eee;border-radius:4px" placeholder="Paste skin URL" /></div>' +
				'<div style="display:flex;gap:8px"><button id="' + vapeName + '-apply" style="flex:1;padding:10px;border-radius:6px;border:0;background:#2b6;color:#011;cursor:pointer">Apply & Broadcast</button>' +
				'<button id="' + vapeName + '-close" style="padding:10px;border-radius:6px;border:0;background:#444;color:#ddd;cursor:pointer">Close</button></div>' +
				'<div style="margin-top:10px;color:#999;font-size:12px">Press backslash to toggle. Use <code style="background:#111;padding:2px 6px;border-radius:4px">.setskin &lt;URL&gt;</code> in chat to set quickly.</div>';

			document.body.appendChild(menu);

			const input = document.getElementById(vapeName + '-input');
			const applyBtn = document.getElementById(vapeName + '-apply');
			const closeBtn = document.getElementById(vapeName + '-close');

			if (input) input.value = store.customSkinUrl || '';
			if (applyBtn) applyBtn.addEventListener('click', () => {
				const url = (document.getElementById(vapeName + '-input') || { value: '' }).value.trim();
				if (url && url.length > 5) store.setCustomSkinUrl(url);
				menu.style.display = 'none';
			});
			if (closeBtn) closeBtn.addEventListener('click', () => { menu.style.display = 'none'; });
			store.toggleMenu = function() {
				menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
				if (menu.style.display === 'block') (document.getElementById(vapeName + '-input') || {}).focus();
			};
		}
	}
	setTimeout(whenReadyAndAttachUI, 1200);
	try { window.__VAPE_SKIN_HELPERS = { defaultSkin: '/mnt/data/custom-skin.txt', storeName }; } catch(e) {}

})();
