(() => {
    const cfgScript = document.currentScript;
    const ENDPOINT = cfgScript.getAttribute("data-endpoint") || "/api/chat/stream";
    const TITLE = cfgScript.getAttribute("data-title") || "Chat";
    const POSITION = (cfgScript.getAttribute("data-position") || "right").toLowerCase();
    const ACCENT = cfgScript.getAttribute("data-accent") || "#2563eb";

    // Create container with Shadow DOM to avoid CSS collisions
    const host = document.createElement("div");
    host.id = "rag-chat-widget-host";
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });

    // Basic styles (scoped by shadow DOM)
    const style = document.createElement("style");
    style.textContent = `
    :host { all: initial; }
    .launcher {
      position: fixed; ${POSITION === "left" ? "left: 24px;" : "right: 24px;"} bottom: 24px;
      width: 84px; height: 84px; border-radius: 50%; background: #000000;
      color: white; display: grid; place-items: center; cursor: pointer; box-shadow: 0 10px 30px rgba(0,0,0,.2);
      font: 14px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif; z-index: 2147483647;
    }
    .panel {
      position: fixed; ${POSITION === "left" ? "left: 24px;" : "right: 24px;"} bottom: 92px;
      width: min(380px, calc(100vw - 48px)); height: 520px; background: #fff; border-radius: 16px;
      box-shadow: 0 24px 80px rgba(0,0,0,.25); display: none; overflow: hidden; z-index: 2147483647;
      border: 1px solid rgba(0,0,0,.08);
      font: 14px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    }
    .panel.open { display: grid; grid-template-rows: 52px 1fr auto; }
    .head {
      background: ${ACCENT}; color: white; display: flex; align-items: center; justify-content: space-between;
      padding: 0 12px; font-weight: 600;
    }
    .close { background: transparent; border: 0; color: inherit; font-size: 18px; cursor: pointer; }
    .msgs {
      padding: 12px; overflow: auto; background: #f8fafc;
      display: flex; flex-direction: column; gap: 8px;
    }
    .bubble { padding: 10px 12px; border-radius: 12px; max-width: 85%; white-space: pre-wrap; }
    .me { align-self: flex-end; background: #e0e7ff; }
    .ai { align-self: flex-start; background: #ffffff; border: 1px solid #e5e7eb; }
    .cite { font-size: 12px; opacity: .7; margin-top: 4px; }
    .input {
      border-top: 1px solid #e5e7eb; padding: 10px; background: #fff; display: grid; grid-template-columns: 1fr auto auto; gap: 8px;
    }
    textarea {
      resize: none; outline: none; border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; min-height: 44px; max-height: 120px;
      font: inherit; width: 100%; background: #fff;
    }
    button {
      border: 0; border-radius: 10px; padding: 10px 12px; cursor: pointer; font-weight: 600;
    }
    .send { background: ${ACCENT}; color: #fff; }
    .stop { background: #f3f4f6; color: #111827; }
    .hint { font-size: 12px; color: #6b7280; padding: 6px 12px 0; }
    /* 🔥 Mobile: extra large floating popup */
    @media (max-width: 1768px) {
      .launcher {
        bottom: 20px;
        ${POSITION === "left" ? "left: 20px;" : "right: 20px;"}
        width: 70px;
        height: 70px;
      }
    
      .panel {
        /* nearly full screen but still floating a little */
        width: min(98vw, 640px);
        height: min(92vh, 820px);
        bottom: 8px;
        ${POSITION === "left" ? "left: 1vw;" : "right: 1vw;"}
        border-radius: 22px;
        border: 1px solid rgba(0,0,0,.08);
        box-shadow: 0 24px 100px rgba(0,0,0,.35);
      }
    
      .head {
        height: 60px;
        padding: 0 20px;
        font-size: 17px;
      }
    
      .msgs {
        font-size: 16px;
        padding: 18px;
      }
    
      textarea {
        font-size: 16px;
        min-height: 56px;
      }
    
      .input {
        grid-template-columns: 1fr auto auto;
        gap: 8px;
      }
    
      .send, .stop {
        padding: 12px 16px;
        font-size: 15px;
      }
    }
  `;
    shadow.appendChild(style);

    // DOM
    const panel = document.createElement("div");
    panel.className = "panel";

    const head = document.createElement("div");
    head.className = "head";
    head.innerHTML = `<div>${TITLE}</div>`;
    const closeBtn = document.createElement("button");
    closeBtn.className = "close";
    closeBtn.setAttribute("aria-label", "Close chat");
    closeBtn.textContent = "×";
    head.appendChild(closeBtn);

    const msgs = document.createElement("div");
    msgs.className = "msgs";

    const hint = document.createElement("div");
    hint.className = "hint";
    hint.textContent = "...Hỏi bằng tiếng Việt hoặc tiếng Anh…";

    const input = document.createElement("div");
    input.className = "input";
    const ta = document.createElement("textarea");
    ta.placeholder = "Gửi câu hỏi…";
    const send = document.createElement("button");
    send.className = "send";
    send.textContent = "Gửi";
    const stop = document.createElement("button");
    stop.className = "stop";
    stop.textContent = "Dừng";

    input.appendChild(ta);
    input.appendChild(send);
    input.appendChild(stop);

    panel.appendChild(head);
    panel.appendChild(msgs);
    panel.appendChild(hint);
    panel.appendChild(input);

    const launcher = document.createElement("div");
    launcher.className = "launcher";
    launcher.title = "Chat";
    // launcher.innerHTML = "💬";
    launcher.innerHTML = `<img src="/icon.png" alt="Chat" style="width:50%; height:72%; object-fit:contain;" />`;

    shadow.appendChild(panel);
    shadow.appendChild(launcher);

    function generateUUID() {
        // Fallback (RFC4122-ish random v4 UUID)
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }
    // Helpers
    const sessionKey = "rag_widget_session_id";
    let sessionId = localStorage.getItem(sessionKey);
    if (!sessionId) { sessionId = generateUUID(); localStorage.setItem(sessionKey, sessionId); }

    let controller = null;

    function addBubble(text, who = "ai") {
        const b = document.createElement("div");
        b.className = `bubble ${who === "me" ? "me" : "ai"}`;
        b.textContent = text || "";
        msgs.appendChild(b);
        msgs.scrollTop = msgs.scrollHeight;
        return b;
    }
    function addCitations(cites) {
        if (!cites?.length) return;
        const c = document.createElement("div");
        c.className = "cite";
        c.textContent = "Sources: " + cites.map(x => x?.file?.filename || x?.url || "source").join(", ");
        msgs.appendChild(c);
        msgs.scrollTop = msgs.scrollHeight;
    }

    async function sendMessage(text) {
        if (!text) return;
        addBubble(text, "me");
        const ai = addBubble("", "ai");
        ta.value = "";

        controller = new AbortController();
        try {
            const resp = await fetch(ENDPOINT, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userMessage: text, sessionId }),
                signal: controller.signal,
            });

            // Stream SSE lines from fetch(body)
            const reader = resp.body.getReader();
            const decoder = new TextDecoder();
            let running = true;

            while (running) {
                const { value, done } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n\n").filter(Boolean);
                for (const line of lines) {
                    if (!line.startsWith("data:")) continue;
                    const payload = JSON.parse(line.slice(5));
                    if (payload.type === "delta") {
                        ai.textContent += payload.data;
                        msgs.scrollTop = msgs.scrollHeight;
                    } else if (payload.type === "citations") {
                        addCitations(payload.data);
                    } else if (payload.type === "done") {
                        running = false;
                        break;
                    } else if (payload.type === "error") {
                        ai.textContent += `\n[error] ${payload.data}`;
                        running = false;
                        break;
                    }
                }
            }
        } catch (e) {
            addBubble("[network error] " + (e?.message || e), "ai");
        }
    }

    // Events
    launcher.addEventListener("click", () => panel.classList.toggle("open"));
    closeBtn.addEventListener("click", () => panel.classList.remove("open"));

    send.addEventListener("click", () => sendMessage(ta.value.trim()));
    ta.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage(ta.value.trim());
        }
    });
    stop.addEventListener("click", () => controller?.abort());
})();
