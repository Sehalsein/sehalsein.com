"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { useOSStore } from "../components/Window/store";

type Role = "user" | "assistant";

type ChatMessage = {
	id: string;
	role: Role;
	text: string;
};

type Row =
	| { kind: "system"; id: string; text: string }
	| { kind: "message"; msg: ChatMessage }
	| { kind: "thinking"; id: string }
	| { kind: "error"; id: string; text: string };

function renderInline(text: string): React.ReactNode {
	const parts: React.ReactNode[] = [];
	const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
	let last = 0;
	let key = 0;
	let match = re.exec(text);
	while (match !== null) {
		const start = match.index;
		if (start > last) parts.push(text.slice(last, start));
		const token = match[0];
		if (token.startsWith("**")) {
			parts.push(<b key={key++}>{token.slice(2, -2)}</b>);
		} else {
			parts.push(<code key={key++}>{token.slice(1, -1)}</code>);
		}
		last = start + token.length;
		match = re.exec(text);
	}
	if (last < text.length) parts.push(text.slice(last));
	return parts.map((p, idx) => <Fragment key={idx}>{p}</Fragment>);
}

type Props = { instanceId: string };

export default function AI({ instanceId }: Props) {
	const closeWindow = useOSStore((s) => s.closeWindow);

	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [history, setHistory] = useState<string[]>([]);
	const [historyIdx, setHistoryIdx] = useState(0);
	const [isLoading, setIsLoading] = useState(false);
	const [isStreaming, setIsStreaming] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);

	const inputRef = useRef<HTMLInputElement>(null);
	const scrollRef = useRef<HTMLDivElement>(null);
	const abortRef = useRef<AbortController | null>(null);
	const messagesRef = useRef<ChatMessage[]>([]);
	messagesRef.current = messages;

	useEffect(() => {
		setTimeout(() => inputRef.current?.focus(), 200);
	}, []);

	useEffect(() => {
		if (!isLoading) inputRef.current?.focus();
	}, [isLoading]);

	useEffect(() => {
		const el = scrollRef.current;
		if (el) el.scrollTop = el.scrollHeight;
	}, [messages, isLoading, isStreaming, errorMsg]);

	const sendMessage = useCallback(async (text: string) => {
		const userMsgId = crypto.randomUUID();
		const assistantMsgId = crypto.randomUUID();

		setMessages((prev) => [
			...prev,
			{ id: userMsgId, role: "user", text },
		]);
		setIsLoading(true);
		setIsStreaming(false);
		setErrorMsg(null);

		const apiMessages = [
			...messagesRef.current.map((m) => ({ role: m.role, content: m.text })),
			{ role: "user" as const, content: text },
		];

		const controller = new AbortController();
		abortRef.current = controller;

		try {
			const res = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messages: apiMessages }),
				signal: controller.signal,
			});

			if (!res.ok) {
				const errorText = await res.text();
				let parsed: string;
				try {
					const json = JSON.parse(errorText);
					parsed = json.error || errorText;
				} catch {
					parsed = errorText;
				}
				setErrorMsg(parsed || `request failed (${res.status})`);
				setIsLoading(false);
				return;
			}

			if (!res.body) {
				setErrorMsg("no response body received.");
				setIsLoading(false);
				return;
			}

			setMessages((prev) => [
				...prev,
				{ id: assistantMsgId, role: "assistant", text: "" },
			]);
			setIsStreaming(true);

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let accumulated = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				accumulated += decoder.decode(value, { stream: true });
				const current = accumulated;
				setMessages((prev) =>
					prev.map((m) =>
						m.id === assistantMsgId ? { ...m, text: current } : m,
					),
				);
			}

			const errorMatch = accumulated.match(/\[error:\s*(.+)\]/);
			if (errorMatch) {
				const cleanText = accumulated.replace(/\[error:\s*.+\]/, "").trim();
				if (cleanText) {
					setMessages((prev) =>
						prev.map((m) =>
							m.id === assistantMsgId ? { ...m, text: cleanText } : m,
						),
					);
				} else {
					setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
				}
				setErrorMsg(errorMatch[1]);
			} else if (!accumulated.trim()) {
				setMessages((prev) => prev.filter((m) => m.id !== assistantMsgId));
				setErrorMsg("empty response from AI. try again.");
			}
		} catch (err) {
			if (err instanceof DOMException && err.name === "AbortError") {
				// cancelled — silent
			} else {
				setErrorMsg(
					err instanceof Error ? err.message : "something went wrong.",
				);
			}
		} finally {
			setIsLoading(false);
			setIsStreaming(false);
			abortRef.current = null;
		}
	}, []);

	const handleSubmit = useCallback(
		(value: string) => {
			const trimmed = value.trim();
			if (!trimmed || isLoading) return;

			if (
				trimmed === "/quit" ||
				trimmed === "/exit" ||
				trimmed === "exit"
			) {
				closeWindow(instanceId);
				return;
			}
			if (trimmed === "/clear") {
				setMessages([]);
				setErrorMsg(null);
				return;
			}
			if (trimmed === "/help") {
				setMessages((prev) => [
					...prev,
					{
						id: crypto.randomUUID(),
						role: "assistant",
						text: "/clear reset · /exit close the app · anything else is sent to ai",
					},
				]);
				return;
			}

			setHistory((prev) => [...prev, trimmed]);
			setHistoryIdx(history.length + 1);
			sendMessage(trimmed);
		},
		[sendMessage, closeWindow, instanceId, history.length, isLoading],
	);

	const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			handleSubmit(input);
			setInput("");
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			if (history.length && historyIdx > 0) {
				const newIdx = historyIdx - 1;
				setHistoryIdx(newIdx);
				setInput(history[newIdx]);
			}
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			if (historyIdx < history.length - 1) {
				const newIdx = historyIdx + 1;
				setHistoryIdx(newIdx);
				setInput(history[newIdx]);
			} else {
				setHistoryIdx(history.length);
				setInput("");
			}
		} else if (e.ctrlKey && e.key === "c") {
			if (isLoading && abortRef.current) {
				abortRef.current.abort();
			} else {
				setInput("");
			}
		} else if (e.key === "Escape") {
			if (isLoading && abortRef.current) {
				abortRef.current.abort();
			}
		}
	};

	const rows: Row[] = [];
	rows.push({
		kind: "system",
		id: "welcome",
		text: "welcome. ask me anything about sehal — stack, projects, experience, or why you should hire him. type /help, /clear, /exit.",
	});
	if (messages.length === 0) {
		rows.push({
			kind: "message",
			msg: {
				id: "greeting",
				role: "assistant",
				text: "hey. i'm a proxy for sehal — his résumé, his style, his opinions. what do you want to know?",
			},
		});
	}
	messages.forEach((m) => rows.push({ kind: "message", msg: m }));
	if (isLoading && !isStreaming) {
		rows.push({ kind: "thinking", id: "thinking" });
	}
	if (errorMsg) {
		rows.push({ kind: "error", id: "err", text: errorMsg });
	}

	return (
		<div className="app-ai">
			<div className="hdr">
				<span className="mark">✦</span>
				<span className="title">ai</span>
				<span className="meta">fresh session</span>
			</div>
			<div className="scroll" ref={scrollRef}>
				{rows.map((row) => {
					if (row.kind === "system") {
						return (
							<div key={row.id} className="msg">
								<div className="who s">system</div>
								<div className="body">{row.text}</div>
							</div>
						);
					}
					if (row.kind === "thinking") {
						return (
							<div key={row.id} className="msg">
								<div className="who a">ai</div>
								<div className="body">
									<span className="think">
										<span className="dot">●</span>{" "}
										<span className="dot">●</span>{" "}
										<span className="dot">●</span>
									</span>
								</div>
							</div>
						);
					}
					if (row.kind === "error") {
						return (
							<div key={row.id} className="msg">
								<div className="who a">ai</div>
								<div className="body">
									<span className="err">error: {row.text}</span>
								</div>
							</div>
						);
					}
					const m = row.msg;
					const isLastAssistant =
						m.role === "assistant" &&
						isStreaming &&
						m.id === messages[messages.length - 1]?.id;
					return (
						<div key={m.id} className="msg">
							<div className={`who ${m.role === "user" ? "u" : "a"}`}>
								{m.role === "user" ? "you" : "ai"}
							</div>
							<div className="body">
								{renderInline(m.text)}
								{isLastAssistant && (
									<span
										aria-hidden="true"
										className="ml-0.5 inline-block h-[14px] w-2 align-[-2px] bg-[color:var(--ink)] animate-[blink_1.05s_steps(1)_infinite]"
									/>
								)}
							</div>
						</div>
					);
				})}
			</div>
			<div className="inrow">
				<span className="p">›</span>
				<input
					ref={inputRef}
					type="search"
					placeholder={
						isLoading
							? "streaming — esc or ctrl+c to cancel"
							: "ask me anything…"
					}
					autoComplete="off"
					autoCorrect="off"
					autoCapitalize="off"
					spellCheck={false}
					aria-label="Ask AI"
					disabled={isLoading && !isStreaming}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={onKeyDown}
				/>
				<span className="hint">enter to send</span>
			</div>
		</div>
	);
}
