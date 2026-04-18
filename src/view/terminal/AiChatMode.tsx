"use client";

import { useState, useRef, useEffect, useCallback } from "react";

type Props = {
	onExit: () => void;
};

type ChatMessage = {
	id: string;
	role: "user" | "assistant";
	text: string;
};

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export default function AiChatMode({ onExit }: Props) {
	const [inputValue, setInputValue] = useState("");
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [chatHistory, setChatHistory] = useState<string[]>([]);
	const [historyIdx, setHistoryIdx] = useState(0);
	const [isLoading, setIsLoading] = useState(false);
	const [isStreaming, setIsStreaming] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [spinnerIdx, setSpinnerIdx] = useState(0);

	const inputRef = useRef<HTMLInputElement>(null);
	const bottomRef = useRef<HTMLDivElement>(null);
	const abortRef = useRef<AbortController | null>(null);
	const messagesRef = useRef<ChatMessage[]>([]);

	// Keep ref in sync
	messagesRef.current = messages;

	// Spinner animation
	useEffect(() => {
		if (!isLoading) return;
		const id = setInterval(() => {
			setSpinnerIdx((i) => (i + 1) % SPINNER_FRAMES.length);
		}, 80);
		return () => clearInterval(id);
	}, [isLoading]);

	// Auto-scroll
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages, isLoading, errorMsg]);

	// Focus input
	useEffect(() => {
		if (!isLoading) inputRef.current?.focus();
	}, [isLoading]);

	const sendMessage = useCallback(async (text: string) => {
		const userMsgId = crypto.randomUUID();
		const assistantMsgId = crypto.randomUUID();

		const userMsg: ChatMessage = { id: userMsgId, role: "user", text };

		setMessages((prev) => [...prev, userMsg]);
		setIsLoading(true);
		setIsStreaming(false);
		setErrorMsg(null);

		// Build messages for the API using the ref (avoids stale closure)
		const apiMessages = [
			...messagesRef.current.map((m) => ({
				role: m.role,
				content: m.text,
			})),
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

			// Add empty assistant message and start streaming
			const assistantMsg: ChatMessage = {
				id: assistantMsgId,
				role: "assistant",
				text: "",
			};
			setMessages((prev) => [...prev, assistantMsg]);
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

			// Check for inline error from stream
			const errorMatch = accumulated.match(/\[error:\s*(.+)\]/);
			if (errorMatch) {
				const cleanText = accumulated
					.replace(/\[error:\s*.+\]/, "")
					.trim();
				if (cleanText) {
					setMessages((prev) =>
						prev.map((m) =>
							m.id === assistantMsgId
								? { ...m, text: cleanText }
								: m,
						),
					);
				} else {
					setMessages((prev) =>
						prev.filter((m) => m.id !== assistantMsgId),
					);
				}
				setErrorMsg(errorMatch[1]);
			} else if (!accumulated.trim()) {
				setMessages((prev) =>
					prev.filter((m) => m.id !== assistantMsgId),
				);
				setErrorMsg("empty response from AI. try again.");
			}
		} catch (err) {
			if (err instanceof DOMException && err.name === "AbortError") {
				// User cancelled — no error to show
			} else {
				setErrorMsg(
					err instanceof Error
						? err.message
						: "something went wrong.",
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
				onExit();
				return;
			}
			if (trimmed === "/clear") {
				setMessages([]);
				setErrorMsg(null);
				return;
			}

			setChatHistory((prev) => [...prev, trimmed]);
			setHistoryIdx(chatHistory.length + 1);
			sendMessage(trimmed);
		},
		[sendMessage, onExit, chatHistory.length, isLoading],
	);

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			handleSubmit(inputValue);
			setInputValue("");
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			if (chatHistory.length && historyIdx > 0) {
				const newIdx = historyIdx - 1;
				setHistoryIdx(newIdx);
				setInputValue(chatHistory[newIdx]);
			}
		} else if (e.key === "ArrowDown") {
			e.preventDefault();
			if (historyIdx < chatHistory.length - 1) {
				const newIdx = historyIdx + 1;
				setHistoryIdx(newIdx);
				setInputValue(chatHistory[newIdx]);
			} else {
				setHistoryIdx(chatHistory.length);
				setInputValue("");
			}
		} else if (e.ctrlKey && e.key === "c") {
			if (isLoading && abortRef.current) {
				abortRef.current.abort();
			} else {
				setInputValue("");
			}
		} else if (e.key === "Escape") {
			if (isLoading && abortRef.current) {
				abortRef.current.abort();
			}
			onExit();
		}
	};

	const handleContainerClick = useCallback(() => {
		if (window.getSelection()?.toString()) return;
		inputRef.current?.focus();
	}, []);

	return (
		<div className="flex flex-col" onClick={handleContainerClick}>
			{/* Welcome message */}
			<div className="mb-4" style={{ color: "var(--term-dim)" }}>
				<span style={{ color: "var(--term-green)" }}>●</span> connected
				to ai · ask me anything about sehal · type{" "}
				<span style={{ color: "var(--term-green)" }}>/quit</span> to
				exit
			</div>

			{/* Messages */}
			<div>
				{messages.map((msg) => (
					<div key={msg.id} className="mb-3">
						{msg.role === "user" ? (
							<div className="flex gap-2">
								<span
									className="shrink-0 font-medium"
									style={{ color: "var(--term-green)" }}
								>
									&gt;
								</span>
								<span>{msg.text}</span>
							</div>
						) : (
							<div
								className="pl-3 py-1 my-1"
								style={{
									borderLeft: "2px solid var(--term-blue)",
								}}
							>
								<span>{msg.text}</span>
								{isStreaming &&
									msg.id ===
										messages[messages.length - 1]?.id && (
										<span
											className="inline-block w-[9px] h-[16px] align-[-3px] ml-[2px] animate-[blink_1.05s_steps(1)_infinite]"
											style={{
												background: "var(--term-ink)",
											}}
										/>
									)}
							</div>
						)}
					</div>
				))}

				{/* Thinking spinner */}
				{isLoading && !isStreaming && (
					<div
						className="mb-3 pl-3"
						style={{ color: "var(--term-dim)" }}
					>
						<span style={{ color: "var(--term-amber)" }}>
							{SPINNER_FRAMES[spinnerIdx]}
						</span>{" "}
						Thinking...
					</div>
				)}

				{/* Error */}
				{errorMsg && (
					<div className="mb-3" style={{ color: "var(--term-red)" }}>
						error: {errorMsg}
					</div>
				)}
			</div>

			{/* Input */}
			{!isLoading && (
				<form
					className="flex gap-2 mt-2 items-baseline"
					autoComplete="off"
					onSubmit={(e) => e.preventDefault()}
					data-lpignore="true"
				>
					<span
						className="shrink-0 font-medium"
						style={{ color: "var(--term-green)" }}
					>
						&gt;
					</span>
					<input
						ref={inputRef}
						type="search"
						name="ai-search-input"
						className="flex-1 bg-transparent border-none outline-none p-0 appearance-none"
						style={{
							color: "var(--term-ink)",
							caretColor: "var(--term-green)",
							fontFamily: "inherit",
							fontSize: "inherit",
							WebkitAppearance: "none",
						}}
						value={inputValue}
						onChange={(e) => setInputValue(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="ask something..."
						autoComplete="off"
						autoCorrect="off"
						autoCapitalize="off"
						spellCheck={false}
						data-1p-ignore
						data-lpignore="true"
						data-form-type="other"
						role="combobox"
						aria-autocomplete="none"
						aria-expanded={false}
					/>
				</form>
			)}

			<div ref={bottomRef} />
		</div>
	);
}
