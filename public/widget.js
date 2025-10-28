(() => {
    // ---- Config from script tag ----
    const cfg = document.currentScript;
    const ENDPOINT = cfg.getAttribute("data-endpoint") || "/api/chat/stream";
    const TITLE = cfg.getAttribute("data-title") || "Chat";
    const POSITION = (cfg.getAttribute("data-position") || "right").toLowerCase();
    const ACCENT = cfg.getAttribute("data-accent") || "#2563eb";
    const ICON_URL = cfg.getAttribute("data-icon") || "";   // optional launcher image
    const LAUNCHER_SIZE = parseInt(cfg.getAttribute("data-launcher-size") || "84", 10);

    // ---- Shadow host ----
    const host = document.createElement("div");
    host.id = "rag-chat-widget-host";
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });

    // ---- Styles ----
    const style = document.createElement("style");
    style.textContent = `
    :host { all: initial; }

    .launcher {
      position: fixed; ${POSITION === "left" ? "left: 24px;" : "right: 24px;"} bottom: 24px;
      width: 84px; height: 84px; border-radius: 50%; background: #000000;
      color: white; display: grid; place-items: center; cursor: pointer; box-shadow: 0 10px 30px rgba(0,0,0,.2);
      font: 14px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; z-index: 2147483647;
    }
    .launcher img { width: 70%; height: 70%; object-fit: contain; }
    .launcher .emoji { font-size: ${Math.round(LAUNCHER_SIZE * 0.45)}px; line-height: 1; }

    .panel {
      position: fixed; ${POSITION === "left" ? "left: 24px;" : "right: 24px;"} bottom: ${LAUNCHER_SIZE + 36}px;
      width: min(800px, calc(800vw - 48px));
      height: 720px;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 24px 80px rgba(0,0,0,.25);
      display: none;
      overflow: hidden;
      z-index: 2147483647;
      border: 1px solid rgba(0,0,0,.08);
      font: 24px/1.45 system-ui,-apple-system,Segoe UI,Roboto,Inter,Arial,sans-serif;
    }
    .panel.open { display: grid; grid-template-rows: 52px 1fr auto; }

    .head {
      background: ${ACCENT};
      color: white;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 12px; font-weight: 600;
    }
    .head .title { display:flex; align-items:center; gap:8px; }
    .head .dot {
      width: 8px; height:8px; border-radius: 50%; background: #fff; opacity:.9;
      box-shadow: 0 0 0 2px rgba(255,255,255,.2) inset;
    }
    .close {
      background: transparent; border: 0; color: inherit; font-size: 18px; cursor: pointer;
    }

    .msgs {
      padding: 16px;
      overflow-y: auto;
      background: #f7f8fa;
      display: flex; flex-direction: column;
      gap: 12px;
    }

    .row { display: flex; gap: 10px; align-items: flex-start; }
    .row.me { justify-content: flex-end; }
    .avatar {
      flex: 0 0 28px; width: 28px; height: 28px; border-radius: 50%;
      display: grid; place-items: center; font-size: 16px; user-select: none;
      background: #eef2ff; color: #4338ca;
    }
    .avatar.ai { background: #ecfeff; color: #0ea5e9; }
    .avatar img {
      width: 200%;
      height: 100%;
      border-radius: 50%;
      object-fit: cover;
    }

    .bubble {
      border-radius: 14px;
      padding: 12px 14px;
      line-height: 1.55;
      max-width: 85%;
      word-wrap: break-word;
      background: #ffffff;
      border: 1px solid #e5e7eb;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
      animation: fadeIn .25s ease;
    }
    .me .bubble {
      background: #dcf8c6;
      border: 1px solid #bfefac;
      box-shadow: none;
    }

    .bubble :is(p, ul, ol) { margin: .4em 0; }
    .bubble pre { padding: 10px; border-radius: 10px; background: #0b1020; color: #eaf2ff; overflow:auto; }
    .bubble code { background: #f1f5f9; padding: 2px 5px; border-radius: 6px; }

    .typing {
      font-size: 13px; color: #6b7280; padding: 20px 6px 0;
    }
    .typing .dots::after {
      content: "…"; animation: blink 1.2s infinite steps(4);
    }

    .footer {
      border-top: 1px solid #e5e7eb; padding: 10px; background: #fff;
      display: grid; grid-template-columns: 1fr auto auto; gap: 8px;
    }
    textarea {
      resize: none; outline: none; border: 1px solid #e5e7eb; border-radius: 10px;
      padding: 10px; min-height: 44px; max-height: 120px; font: inherit; width: 100%;
      background: #fff;
    }
    button {
      border: 0; border-radius: 10px; padding: 10px 12px; cursor: pointer; font-weight: 600;
    }
    .send { background: ${ACCENT}; color: #fff; }
    .stop { background: #f3f4f6; color: #111827; }

    .hint { font-size: 12px; color: #6b7280; padding: 0 16px; }

    @keyframes fadeIn { from { opacity: 0; transform: translateY(4px);} to {opacity:1; transform:translateY(0);} }
    @keyframes blink { 0% { opacity: .2 } 50% { opacity: 1 } 100% { opacity: .2 } }

    @media (max-width: 420px) {
      .panel { height: 70vh; }
    }
  `;
    shadow.appendChild(style);

    // ---- DOM structure ----
    const panel = document.createElement("div");
    panel.className = "panel";

    const head = document.createElement("div");
    head.className = "head";
    head.innerHTML = `<div class="title"><span class="dot"></span> ${TITLE}</div>`;
    const closeBtn = document.createElement("button");
    closeBtn.className = "close";
    closeBtn.setAttribute("aria-label", "Close chat");
    closeBtn.textContent = "×";
    head.appendChild(closeBtn);

    const msgs = document.createElement("div");
    msgs.className = "msgs";

    const hint = document.createElement("div");
    hint.className = "hint";
    // hint.textContent = "...Ask me about Papa Banh bao, hỏi tôi về Papa Banh Bao…";

    const footer = document.createElement("div");
    footer.className = "footer";
    const ta = document.createElement("textarea");
    ta.placeholder = "Ask me…";
    const send = document.createElement("button");
    send.className = "send";
    send.textContent = "Send";
    const stop = document.createElement("button");
    stop.className = "stop";
    stop.textContent = "Stop";
    footer.appendChild(ta);
    footer.appendChild(send);
    footer.appendChild(stop);

    panel.appendChild(head);
    panel.appendChild(msgs);
    panel.appendChild(hint);
    panel.appendChild(footer);

    const launcher = document.createElement("div");
    launcher.className = "launcher";
    launcher.title = "Chat";
    if (ICON_URL) {
        launcher.innerHTML = `<img src="${ICON_URL}" alt="Chat" />`;
    } else {
        const em = document.createElement("div");
        em.className = "emoji";
        em.textContent = "💬";
        launcher.appendChild(em);
    }

    shadow.appendChild(panel);
    shadow.appendChild(launcher);

    // ---- Helpers ----
    function generateUUID() {
        if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
    const sessionKey = "rag_widget_session_id";
    let sessionId = localStorage.getItem(sessionKey);
    if (!sessionId) { sessionId = generateUUID(); localStorage.setItem(sessionKey, sessionId); }

    let controller = null;

    // Markdown support via Marked.js (auto-inject)
    let markedReady = false;
    function ensureMarked(cb) {
        if (markedReady || window.marked) { markedReady = true; cb(); return; }
        const s = document.createElement("script");
        s.src = "https://cdn.jsdelivr.net/npm/marked/marked.min.js";
        s.onload = () => { markedReady = true; cb(); };
        shadow.appendChild(s);
    }

    function scrollToBottom() {
        msgs.scrollTo({ top: msgs.scrollHeight, behavior: "smooth" });
    }

    function row(who = "ai") {
        const r = document.createElement("div");
        r.className = "row " + (who === "me" ? "me" : "ai");
        const av = document.createElement("div");
        av.className = "avatar " + (who === "me" ? "me" : "ai");
        // av.textContent = who === "me" ? "🧑" : "🤖";
        if (who === "me") {
            // av.innerHTML = `<img src="/icon.png" alt="You" />`;     // your own user icon
        } else {
            av.innerHTML = `<img src="/AI-icon.png" alt="AI" />`;    // your own bot icon
        }
        const b = document.createElement("div");
        b.className = "bubble";
        if (who === "me") { r.appendChild(b); r.appendChild(av); } else { r.appendChild(av); r.appendChild(b); }
        msgs.appendChild(r);
        return b;
    }

    function setMarkdown(el, mdText) {
        if (markedReady && window.marked) {
            el.innerHTML = window.marked.parse(mdText);
        } else {
            el.textContent = mdText;
        }
    }

    function addTyping() {
        const t = document.createElement("div");
        t.className = "typing";
        t.innerHTML = `<span class="dots">AI is typing</span>`;
        msgs.appendChild(t);
        scrollToBottom();
        return t;
    }

    // ---- Send message flow ----
    async function sendMessage(text) {
        if (!text) return;

        // user bubble
        const me = row("me");
        setMarkdown(me, text);
        scrollToBottom();

        // ai bubble + typing
        const ai = row("ai");
        setMarkdown(ai, "");
        const typing = addTyping();

        controller = new AbortController();
        try {
            const resp = await fetch(ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userMessage: text, sessionId }),
                signal: controller.signal,
            });

            // stream SSE
            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let running = true;
            let acc = "";  // accumulate text to re-render markdown nicely

            // ensure marked is available before streaming (non-blocking)
            await new Promise(resolve => ensureMarked(resolve));

            // once first token arrives, remove typing
            let gotFirstToken = false;

            while (running) {
                const { value, done } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n\n").filter(Boolean);
                for (const line of lines) {
                    if (!line.startsWith("data:")) continue;
                    const payload = JSON.parse(line.slice(5));

                    if (payload.type === "delta") {
                        if (!gotFirstToken) { typing.remove(); gotFirstToken = true; }
                        acc += payload.data;
                        setMarkdown(ai, acc);
                        scrollToBottom();
                    } else if (payload.type === "citations") {
                        // Optional: append a small sources line
                        const cites = payload.data || [];
                        if (cites.length) {
                            const src = "\n\n**Sources:** " + cites.map(c => c?.file?.filename || c?.url || "source").join(", ");
                            acc += src;
                            setMarkdown(ai, acc);
                        }
                    } else if (payload.type === "done") {
                        running = false;
                        break;
                    } else if (payload.type === "error") {
                        if (!gotFirstToken) { typing.remove(); gotFirstToken = true; }
                        acc += `\n\n> **Error:** ${payload.data || "Unknown error"}`;
                        setMarkdown(ai, acc);
                        running = false;
                        break;
                    }
                }
            }
        } catch (e) {
            try { typing.remove(); } catch {}
            const err = row("ai");
            setMarkdown(err, `**Network error**: ${e?.message || e}`);
        }
    }

    // ---- UI events ----
    launcher.addEventListener("click", () => panel.classList.toggle("open"));
    closeBtn.addEventListener("click", () => panel.classList.remove("open"));

    send.addEventListener("click", () => {
        const text = ta.value.trim();
        if (!text) return;
        ta.value = "";
        sendMessage(text);
    });

    ta.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            const text = ta.value.trim();
            if (!text) return;
            ta.value = "";
            sendMessage(text);
        }
    });

    stop.addEventListener("click", () => controller?.abort());

    // Optional welcome message
    const welcome = row("ai");
    setMarkdown(welcome, `Hi! Welcome to Papa Banh Bao chatAI. Xin chào đến với Papa Banh Bao chatAI.`);
    scrollToBottom();
})();
