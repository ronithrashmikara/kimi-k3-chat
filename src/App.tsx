import { FormEvent, KeyboardEvent, useMemo, useState } from "react";

type Role = "user" | "assistant";
type Message = { id: number; role: Role; content: string; time: string };

const starter: Message[] = [
  {
    id: 1,
    role: "assistant",
    content: "Hey — I’m Kimi K3. What are we working on today?",
    time: "09:41",
  },
];

function now() {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date());
}

function markdownToHtml(source: string) {
  const escape = (value: string) => value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] || character));
  const lines = source.split("\n");
  const output: string[] = [];
  let inCode = false;
  let code = "";
  for (const line of lines) {
    if (line.trim().startsWith("```")) {
      if (inCode) { output.push(`<pre><code>${code.replace(/\n$/, "")}</code></pre>`); code = ""; }
      inCode = !inCode;
      continue;
    }
    if (inCode) { code += `${line}\n`; continue; }
    if (/^\s*[-*]\s+/.test(line)) output.push(`<li>${line.replace(/^\s*[-*]\s+/, "")}</li>`);
    else if (/^\s*\d+\.\s+/.test(line)) output.push(`<li>${line.replace(/^\s*\d+\.\s+/, "")}</li>`);
    else if (/^###\s+/.test(line)) output.push(`<h4>${line.replace(/^###\s+/, "")}</h4>`);
    else if (/^##\s+/.test(line)) output.push(`<h3>${line.replace(/^##\s+/, "")}</h3>`);
    else if (/^#\s+/.test(line)) output.push(`<h2>${line.replace(/^#\s+/, "")}</h2>`);
    else if (line.trim()) output.push(`<p>${line}</p>`);
    else output.push("");
  }
  let html = output.join("\n").replace(/(<li>.*<\/li>\n?)+/g, (list) => `<ul>${list}</ul>`);
  html = escape(html)
    .replace(/&lt;(\/??(?:h[234]|p|ul|li|pre|code))&gt;/g, "<$1>")
    .replace(/&lt;\/((?:h[234]|p|ul|li|pre|code))&gt;/g, "</$1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\n\n+/g, "\n");
  return html;
}

export function App() {
  const [messages, setMessages] = useState<Message[]>(starter);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [temperature, setTemperature] = useState(0.3);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [reasoningEnabled, setReasoningEnabled] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("You are a concise technical assistant.");
  const [darkMode, setDarkMode] = useState(() => new URLSearchParams(window.location.search).get("theme") === "dark" || window.localStorage.getItem("kimi-theme") === "dark");

  const promptCount = useMemo(() => messages.filter((message) => message.role === "user").length, [messages]);

  async function sendMessage(event?: FormEvent) {
    event?.preventDefault();
    const content = draft.trim();
    if (!content || busy) return;
    const userMessage: Message = { id: Date.now(), role: "user", content, time: now() };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setDraft("");
    setError("");
    setBusy(true);
    try {
      const response = await fetch("/kimi-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "moonshotai/kimi-k3-free",
          messages: [
            { role: "system", content: systemPrompt.trim() || "You are a concise technical assistant." },
            ...nextMessages.map(({ role, content: text }) => ({ role, content: text })),
          ],
          temperature,
          max_tokens: maxTokens,
          top_p: 0.95,
          stream: false,
          reasoning_effort: reasoningEnabled ? "high" : "low",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const providerMessage = typeof payload?.error === "string" ? payload.error : payload?.error?.message;
        throw new Error(providerMessage || payload?.message || `Request failed (${response.status})`);
      }
      const reply = payload?.choices?.[0]?.message?.content;
      if (!reply) throw new Error("Kimi returned an empty response.");
      setMessages((current) => [...current, { id: Date.now() + 1, role: "assistant", content: reply, time: now() }]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to reach Kimi K3.");
    } finally {
      setBusy(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <div className={`shell ${darkMode ? "theme-dark" : "theme-light"}`}>
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">K</span><span>KIMI<span className="brand-accent"> K3</span></span></div>
        <button className="new-chat" onClick={() => { setMessages(starter); setError(""); }}><span>＋</span> New chat <kbd>⌘ K</kbd></button>
        <div className="side-label">Workspace</div>
        <nav>
          <button className="side-item active"><span>◈</span> Chat</button>
          <button className="side-item"><span>⌁</span> Library</button>
        </nav>
        <div className="side-label recent-label">Recent</div>
        <button className="history-item active-history">Low latency for LLMs <small>now</small></button>
        <button className="history-item">Untitled conversation <small>yesterday</small></button>
        <div className="sidebar-spacer" />
        <div className="connection"><span className="status-dot" /> Connected to TokenRouter</div>
        <button className="account"><span className="avatar">R</span><span><b>Ronith</b><small>Personal workspace</small></span><span className="more">•••</span></button>
      </aside>

      <main className="main-pane">
        <header className="topbar">
          <div className="model-title"><span className="model-dot" /> <b>Kimi K3</b><span className={`model-tag ${reasoningEnabled ? "reasoning-on" : ""}`}>{reasoningEnabled ? "REASONING ON" : "REASONING OFF"}</span></div>
          <div className="top-actions"><span className="latency">API · TokenRouter</span><button className="theme-button" onClick={() => { const next = !darkMode; setDarkMode(next); window.localStorage.setItem("kimi-theme", next ? "dark" : "light"); }} title={darkMode ? "Switch to light mode" : "Switch to dark mode"}>{darkMode ? "☼" : "☾"}</button><button className="icon-button" title="Share">↗</button><button className="icon-button" title="More">•••</button></div>
        </header>

        <section className="conversation">
          <div className="conversation-inner">
            <div className="date-divider"><span>Today</span></div>
            {messages.map((message) => <article key={message.id} className={`message ${message.role}`}>
              {message.role === "assistant" && <div className="message-avatar">K</div>}
              <div className="message-body"><div className="message-meta"><b>{message.role === "assistant" ? "Kimi K3" : "You"}</b><time>{message.time}</time></div><div className="message-text markdown" dangerouslySetInnerHTML={{ __html: markdownToHtml(message.content) }} />
                {message.role === "assistant" && message.id !== 1 && <div className="message-actions"><button onClick={() => navigator.clipboard?.writeText(message.content)}>Copy</button><button>↻ Regenerate</button></div>}
              </div>
            </article>)}
            {busy && <article className="message assistant"><div className="message-avatar">K</div><div className="message-body"><div className="message-meta"><b>Kimi K3</b><time>typing</time></div><div className="typing"><i /><i /><i /></div></div></article>}
            {error && <div className="error-banner">Couldn’t complete that request. {error}</div>}
          </div>
        </section>

        <div className="composer-wrap"><form className="composer" onSubmit={sendMessage}><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={handleKeyDown} placeholder="Message Kimi K3…" rows={1} disabled={busy} /><div className="composer-footer"><span className="composer-hint">Enter to send · Shift + Enter for new line</span><div className="composer-tools"><button type="button" className="tool-button">＋</button><button className="send-button" disabled={busy || !draft.trim()} aria-label="Send message">↑</button></div></div></form><div className="composer-note">Kimi K3 can make mistakes. Check important information.</div></div>
      </main>

      <aside className="inspector"><div className="inspector-header"><b>Session settings</b><button className="icon-button">×</button></div><div className="setting-group"><label>Model</label><div className="select-like">Kimi K3 <span>⌄</span></div></div><div className="setting-group"><label>System prompt</label><textarea className="system-prompt" value={systemPrompt} onChange={(event) => setSystemPrompt(event.target.value)} placeholder="Tell Kimi how to behave…" /></div><div className="setting-group"><label>Reasoning</label><button className={`reasoning-toggle ${reasoningEnabled ? "enabled" : ""}`} onClick={() => setReasoningEnabled((current) => !current)}><span className="toggle-track"><span /></span><span><b>{reasoningEnabled ? "On" : "Off"}</b><small>{reasoningEnabled ? "Deeper responses" : "Fast responses"}</small></span></button></div><div className="setting-group"><label>Temperature <output>{temperature.toFixed(1)}</output></label><input type="range" min="0" max="1" step="0.1" value={temperature} onChange={(event) => setTemperature(Number(event.target.value))} /></div><div className="setting-group"><label>Max output tokens <output>{maxTokens.toLocaleString()}</output></label><input type="range" min="512" max="4096" step="256" value={maxTokens} onChange={(event) => setMaxTokens(Number(event.target.value))} /></div><div className="setting-divider" /><div className="setting-group"><label>Endpoint</label><p className="endpoint"><span className="status-dot" /> TokenRouter<br /><code>api.tokenrouter.com/v1</code></p></div><div className="setting-divider" /><div className="usage"><span>Messages</span><b>{promptCount}</b></div><button className="clear-button" onClick={() => setMessages(starter)}>Clear conversation</button></aside>
    </div>
  );
}



