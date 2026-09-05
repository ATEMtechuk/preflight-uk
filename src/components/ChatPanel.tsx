"use client";
import { useRef, useState } from "react";
import { Send, Mic, Volume2, Bot } from "lucide-react";

type Msg = { role: "user" | "ai"; text: string };

export type BriefState = {
  routeEdited: boolean;
  loadDeclared: boolean;
  weatherReady: boolean;
  notamsReady: boolean;
  checksDone: number;
  checksTotal: number;
};

export default function ChatPanel({ getContext, briefState }: { getContext: () => object; briefState: BriefState }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: "Tell me your aircraft, load, fuel and route - e.g. “C172, 2 POB, 100L, EGTK to EGKA”. I can also listen if you tap the mic. Your briefing progress shows at the top as we go." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [mentionedRoute, setMentionedRoute] = useState(false);
  const [mentionedLoad, setMentionedLoad] = useState(false);
  const recRef = useRef<{ stop: () => void } | null>(null);

  const steps = [
    { label: "Route", done: briefState.routeEdited || mentionedRoute },
    { label: "Load", done: briefState.loadDeclared || mentionedLoad },
    { label: "Weather", done: briefState.weatherReady },
    { label: "NOTAMs", done: briefState.notamsReady },
    { label: "Checks", done: briefState.checksTotal > 0 && briefState.checksDone >= briefState.checksTotal },
    { label: "Chat", done: sentCount > 0 },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const complete = doneCount >= steps.length;

  function speak(text: string) {
    try {
      const clean = text.replace(/[*#•]/g, "").slice(0, 600);
      speechSynthesis.cancel();
      speechSynthesis.speak(new SpeechSynthesisUtterance(clean));
    } catch {}
  }

  type Rec = { start: () => void; stop: () => void; lang: string; interimResults: boolean; onresult: ((e: { results: { transcript: string }[][] }) => void) | null; onend: (() => void) | null };
  function toggleMic() {
    const w = window as unknown as { webkitSpeechRecognition?: new () => Rec; SpeechRecognition?: new () => Rec };
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      setMsgs((m) => [...m, { role: "ai", text: "Voice input isn't supported in this browser - type instead." }]);
      return;
    }
    if (recRef.current) {
      recRef.current.stop();
      recRef.current = null;
      return;
    }
    const rec = new SR();
    rec.lang = "en-GB";
    rec.interimResults = false;
    rec.onresult = (e: { results: { transcript: string }[][] }) => {
      const t = e.results[0][0].transcript;
      setInput(t);
      recRef.current = null;
    };
    rec.onend = () => { recRef.current = null; };
    recRef.current = rec;
    rec.start();
  }

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    setInput("");
    const lower = message.toLowerCase();
    if (/\beg[a-z]{2}\b/.test(lower)) setMentionedRoute(true);
    if (/(kg|fuel|litre|liter|\bpax\b|passenger|c152|c172|pa-?28|da40|dr400|cessna|piper|diamond|tob|bath)/.test(lower)) setMentionedLoad(true);
    setSentCount((n) => n + 1);
    setMsgs((m) => [...m, { role: "user", text: message }]);
    setBusy(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, context: getContext() }),
      });
      const data = await r.json();
      const reply = String(data.reply ?? "Sorry - try again.");
      setMsgs((m) => [...m, { role: "ai", text: reply }]);
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: "Briefing service unreachable. Check connection and retry." }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card flex h-full min-h-0 flex-col gap-2 overflow-hidden p-4">
      <div className="mb-1 flex items-center gap-2">
        <Bot size={18} />
        <h2 className="text-sm font-semibold tracking-tight">AI co-pilot</h2>
        <span className="ml-auto text-xs opacity-60">text + voice</span>
      </div>
      <div className={`rounded-xl px-3 py-2 ${complete ? "bg-emerald-500/15" : "bg-black/5 dark:bg-white/10"}`}>
        <div className="flex items-center text-[11px] font-medium">
          <span>{complete ? "Brief complete - verify official PIB, then fly safe" : `Brief completeness ${doneCount}/${steps.length}`}</span>
          <span className="ml-auto flex gap-1">
            {steps.map((s) => (
              <span
                key={s.label}
                title={s.label}
                className={`h-1.5 w-4 rounded-full ${s.done ? "bg-emerald-500" : "bg-black/15 dark:bg-white/20"}`}
              />
            ))}
          </span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
          <div
            className={`h-full rounded-full transition-all ${complete ? "bg-emerald-500" : "bg-black dark:bg-white"}`}
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>
        <div className="mt-1 flex flex-wrap gap-x-2 text-[10px] opacity-60">
          {steps.map((s) => (
            <span key={s.label} className={s.done ? "line-through" : ""}>
              {s.done ? "✓" : "○"} {s.label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overflow-x-hidden">
        {msgs.map((m, i) => (
          <div
            key={i}
            className={`max-w-[90%] break-words whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-6 ${
              m.role === "user" ? "self-end bg-black text-white dark:bg-white dark:text-black" : "self-start bg-black/5 dark:bg-white/10"
            }`}
          >
            {m.text}
            {m.role === "ai" && (
              <button onClick={() => speak(m.text)} className="ml-2 inline-flex align-middle opacity-50 hover:opacity-100" aria-label="Read aloud">
                <Volume2 size={14} />
              </button>
            )}
          </div>
        ))}
        {busy && <div className="text-xs opacity-50">Thinking…</div>}
      </div>
      <div className="mt-1 flex shrink-0 gap-2">
        <button onClick={toggleMic} className="shrink-0 rounded-xl border border-black/10 px-3 dark:border-white/15" aria-label="Voice input">
          <Mic size={16} />
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Aircraft, load, fuel, route..."
          className="w-full min-w-0 rounded-xl border border-black/10 bg-transparent px-3 py-2 text-sm outline-none dark:border-white/15"
        />
        <button onClick={() => send()} className="shrink-0 rounded-xl bg-black px-3 text-white dark:bg-white dark:text-black" aria-label="Send">
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
