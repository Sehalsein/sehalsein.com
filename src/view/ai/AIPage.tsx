"use client";

import Link from "@/src/components/AppLink";
import {
	type FormEvent,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import "./AIPage.css";

type Role = "user" | "assistant";

type ChatMessage = {
	id: string;
	role: Role;
	text: string;
};

type SolMood = "idle" | "listening" | "thinking" | "speaking" | "happy" | "error";

const SUGGESTIONS = [
	"What is Sehal building right now?",
	"What kind of engineer is Sehal?",
	"Why should I work with him?",
] as const;

const MOOD_LABELS: Record<SolMood, string> = {
	idle: "ready when you are",
	listening: "all ears",
	thinking: "thinking it through",
	speaking: "answering now",
	happy: "good question",
	error: "connection hiccup",
};

export default function AIPage() {
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [isStreaming, setIsStreaming] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const messagesRef = useRef<ChatMessage[]>([]);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const endRef = useRef<HTMLDivElement>(null);
	const abortRef = useRef<AbortController | null>(null);
	const pointerFrameRef = useRef(0);

	messagesRef.current = messages;

	useEffect(() => {
		const frame = window.requestAnimationFrame(() => textareaRef.current?.focus());
		return () => window.cancelAnimationFrame(frame);
	}, []);

	useEffect(() => {
		endRef.current?.scrollIntoView({
			behavior: isStreaming ? "auto" : "smooth",
			block: "end",
		});
	}, [messages, isLoading, isStreaming, error]);

	useEffect(() => {
		return () => {
			abortRef.current?.abort();
			if (pointerFrameRef.current) {
				window.cancelAnimationFrame(pointerFrameRef.current);
			}
		};
	}, []);

	const resetTextarea = useCallback(() => {
		const textarea = textareaRef.current;
		if (textarea) textarea.style.height = "auto";
	}, []);

	const sendMessage = useCallback(async (text: string) => {
		const trimmed = text.trim();
		if (!trimmed) return;

		const userMessage: ChatMessage = {
			id: crypto.randomUUID(),
			role: "user",
			text: trimmed,
		};
		const assistantId = crypto.randomUUID();
		const apiMessages = [
			...messagesRef.current.map((message) => ({
				role: message.role,
				content: message.text,
			})),
			{ role: "user" as const, content: trimmed },
		];

		setMessages((current) => [...current, userMessage]);
		setInput("");
		setError(null);
		setIsLoading(true);
		setIsStreaming(false);
		window.requestAnimationFrame(resetTextarea);

		const controller = new AbortController();
		abortRef.current = controller;

		try {
			const response = await fetch("/api/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ messages: apiMessages }),
				signal: controller.signal,
			});

			if (!response.ok) {
				const responseText = await response.text();
				let message = responseText;
				try {
					const json = JSON.parse(responseText) as { error?: string };
					message = json.error || responseText;
				} catch {
					// The endpoint can also return a plain-text error.
				}
				throw new Error(message || `Request failed (${response.status})`);
			}

			if (!response.body) throw new Error("No response arrived. Please try again.");

			setMessages((current) => [
				...current,
				{ id: assistantId, role: "assistant", text: "" },
			]);
			setIsStreaming(true);

			const reader = response.body.getReader();
			const decoder = new TextDecoder();
			let accumulated = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				accumulated += decoder.decode(value, { stream: true });
				const nextText = accumulated;
				setMessages((current) =>
					current.map((message) =>
						message.id === assistantId
							? { ...message, text: nextText }
							: message,
					),
				);
			}

			accumulated += decoder.decode();
			const inlineError = accumulated.match(/\[error:\s*(.+)\]/);
			if (inlineError) {
				const cleanText = accumulated.replace(/\[error:\s*.+\]/, "").trim();
				setMessages((current) =>
					cleanText
						? current.map((message) =>
								message.id === assistantId
									? { ...message, text: cleanText }
									: message,
							)
						: current.filter((message) => message.id !== assistantId),
				);
				setError(inlineError[1]);
			} else if (!accumulated.trim()) {
				setMessages((current) =>
					current.filter((message) => message.id !== assistantId),
				);
				setError("Sol came back empty-handed. Please try that again.");
			} else {
				setMessages((current) =>
					current.map((message) =>
						message.id === assistantId
							? { ...message, text: accumulated }
							: message,
					),
				);
			}
		} catch (caught) {
			if (!(caught instanceof DOMException && caught.name === "AbortError")) {
				setError(
					caught instanceof Error
						? caught.message
						: "Something interrupted the conversation.",
				);
			}
		} finally {
			setIsLoading(false);
			setIsStreaming(false);
			abortRef.current = null;
			window.requestAnimationFrame(() => textareaRef.current?.focus());
		}
	}, [resetTextarea]);

	const handleSubmit = useCallback(
		(event?: FormEvent) => {
			event?.preventDefault();
			if (isLoading) return;
			void sendMessage(input);
		},
		[input, isLoading, sendMessage],
	);

	const clearConversation = useCallback(() => {
		abortRef.current?.abort();
		setMessages([]);
		setInput("");
		setError(null);
		setIsLoading(false);
		setIsStreaming(false);
		resetTextarea();
		textareaRef.current?.focus();
	}, [resetTextarea]);

	const stopResponse = useCallback(() => {
		abortRef.current?.abort();
	}, []);

	const handlePointerMove = useCallback(
		(event: ReactPointerEvent<HTMLElement>) => {
			const stage = event.currentTarget;
			const { left, top, width, height } = stage.getBoundingClientRect();
			const x = Math.max(-1, Math.min(1, ((event.clientX - left) / width - 0.5) * 2));
			const y = Math.max(-1, Math.min(1, ((event.clientY - top) / height - 0.5) * 2));
			if (pointerFrameRef.current) window.cancelAnimationFrame(pointerFrameRef.current);
			pointerFrameRef.current = window.requestAnimationFrame(() => {
				stage.style.setProperty("--pointer-x", x.toFixed(3));
				stage.style.setProperty("--pointer-y", y.toFixed(3));
			});
		},
		[],
	);

	const handlePointerLeave = useCallback((event: ReactPointerEvent<HTMLElement>) => {
		event.currentTarget.style.setProperty("--pointer-x", "0");
		event.currentTarget.style.setProperty("--pointer-y", "0");
	}, []);

	const mood: SolMood = error
		? "error"
		: isStreaming
			? "speaking"
			: isLoading
				? "thinking"
				: input.trim()
					? "listening"
					: messages.at(-1)?.role === "assistant"
						? "happy"
						: "idle";

	return (
		<main className="sol-ai-page">
			<header className="sol-ai-topbar">
				<Link href="/" className="sol-ai-brand" aria-label="Sehal Sein, home">
					<span aria-hidden="true" /> sehal sein
				</Link>
				<p>portfolio intelligence / 001</p>
				<div className="sol-ai-online">
					<i aria-hidden="true" /> ai online
				</div>
			</header>

			<div className="sol-ai-shell">
				<section
					className="sol-ai-stage"
					onPointerMove={handlePointerMove}
					onPointerLeave={handlePointerLeave}
					aria-labelledby="sol-ai-title"
				>
					<div className="sol-ai-stage-copy">
						<p className="sol-ai-kicker">Meet your guide</p>
						<h1 id="sol-ai-title">Talk to Sol.</h1>
						<p>
							Ask about my work, the things I&apos;ve built, or how I think
							about engineering. Sol knows the public version of me.
						</p>
					</div>

					<div className="sol-ai-character-scene">
						<div className="sol-ai-orbit sol-ai-orbit--outer" aria-hidden="true" />
						<div className="sol-ai-orbit sol-ai-orbit--inner" aria-hidden="true" />
						<SolCharacter mood={mood} />
						<div className="sol-ai-character-label">
							<span>Sol / guide 001</span>
							<strong><i aria-hidden="true" /> {MOOD_LABELS[mood]}</strong>
						</div>
					</div>
				</section>

				<section className="sol-ai-chat" aria-label="Chat with Sol">
					<header className="sol-ai-chat-header">
						<div className="sol-ai-chat-identity">
							<span className="sol-ai-mini-avatar" aria-hidden="true">✦</span>
							<div>
								<h2>Sol</h2>
								<p>Sehal&apos;s AI portfolio guide</p>
							</div>
						</div>
						<button
							type="button"
							className="sol-ai-clear"
							onClick={clearConversation}
							disabled={messages.length === 0 && !error && !input}
						>
							Clear
						</button>
					</header>

					<div className="sol-ai-thread" aria-busy={isLoading}>
						<div className="sol-ai-message sol-ai-message--assistant">
							<span className="sol-ai-message-label">Sol</span>
							<div className="sol-ai-bubble">
								Hey, I&apos;m Sol. I know Sehal&apos;s background, projects, and
								work. What would you like to know?
							</div>
						</div>

						{messages.map((message) => (
							<div
								key={message.id}
								className={`sol-ai-message sol-ai-message--${message.role}`}
							>
								<span className="sol-ai-message-label">
									{message.role === "user" ? "You" : "Sol"}
								</span>
								<div className="sol-ai-bubble">
									{message.text || <StreamingDots />}
									{isStreaming &&
									message.role === "assistant" &&
									message.id === messages.at(-1)?.id ? (
										<span className="sol-ai-caret" aria-hidden="true" />
									) : null}
								</div>
							</div>
						))}

						{isLoading && !isStreaming ? (
							<div className="sol-ai-message sol-ai-message--assistant">
								<span className="sol-ai-message-label">Sol</span>
								<div className="sol-ai-bubble sol-ai-bubble--thinking">
									<StreamingDots />
									<span className="sr-only">Sol is thinking</span>
								</div>
							</div>
						) : null}

						{error ? (
							<div className="sol-ai-error" role="alert">
								<span aria-hidden="true">!</span>
								<div>
									<strong>Sol lost the thread.</strong>
									<p>{error}</p>
								</div>
							</div>
						) : null}

						{messages.length === 0 && !isLoading ? (
							<div className="sol-ai-suggestions">
								<p>Try asking</p>
								{SUGGESTIONS.map((suggestion) => (
									<button
										type="button"
										key={suggestion}
										onClick={() => void sendMessage(suggestion)}
									>
										{suggestion}
										<span aria-hidden="true">↗</span>
									</button>
								))}
							</div>
						) : null}
						<div ref={endRef} />
					</div>

					<div className="sol-ai-composer-wrap">
						<form className="sol-ai-composer" onSubmit={handleSubmit}>
							<textarea
								ref={textareaRef}
								rows={1}
								value={input}
								onChange={(event) => {
									setInput(event.target.value);
									event.target.style.height = "auto";
									event.target.style.height = `${Math.min(event.target.scrollHeight, 132)}px`;
								}}
								onKeyDown={(event) => {
									if (event.key === "Enter" && !event.shiftKey) {
										event.preventDefault();
										handleSubmit();
									}
									if (event.key === "Escape" && isLoading) stopResponse();
								}}
								placeholder={isLoading ? "Sol is answering…" : "Ask Sol anything about Sehal…"}
								aria-label="Message Sol"
								disabled={isLoading}
								maxLength={1200}
							/>
							{isLoading ? (
								<button
									type="button"
									className="sol-ai-send sol-ai-send--stop"
									onClick={stopResponse}
									aria-label="Stop response"
								>
									<span aria-hidden="true" />
								</button>
							) : (
								<button
									type="submit"
									className="sol-ai-send"
									disabled={!input.trim()}
									aria-label="Send message"
								>
									<span aria-hidden="true">↑</span>
								</button>
							)}
						</form>
						<div className="sol-ai-composer-meta">
							<span>Enter to send · Shift + Enter for a new line</span>
							<span>{input.length}/1200</span>
						</div>
						<div className="sr-only" aria-live="polite">
							{isLoading ? MOOD_LABELS[mood] : error || "Sol is ready"}
						</div>
					</div>
				</section>
			</div>
		</main>
	);
}

function StreamingDots() {
	return (
		<span className="sol-ai-dots" aria-hidden="true">
			<i />
			<i />
			<i />
		</span>
	);
}

function SolCharacter({ mood }: { mood: SolMood }) {
	return (
		<div className={`sol-character sol-character--${mood}`}>
			<div className="sol-character-shadow" aria-hidden="true" />
			<svg
				viewBox="-122 -122 244 244"
				role="img"
				aria-label={`Sol is ${MOOD_LABELS[mood]}`}
			>
				<defs>
					<radialGradient id="sol-body" cx="34%" cy="25%" r="78%">
						<stop offset="0" stopColor="#ffe58c" />
						<stop offset="0.5" stopColor="#f6c445" />
						<stop offset="1" stopColor="#e6ad25" />
					</radialGradient>
					<filter id="sol-soft-shadow" x="-40%" y="-40%" width="180%" height="180%">
						<feDropShadow dx="0" dy="7" stdDeviation="7" floodColor="#8e6814" floodOpacity="0.2" />
					</filter>
				</defs>
				<g className="sol-character-body" filter="url(#sol-soft-shadow)">
					<path
						d="M0 -104.4L20.5 -76.3L52.4 -90.5L56.2 -56L91.2 -52.5L77 -20.6L105.9 0L77.4 20.7L92.3 53.2L56.9 56.8L53.6 92.5L20.9 77.8L0 107.1L-20.9 77.8L-53.6 92.6L-57 56.8L-92.4 53.2L-77.5 20.7L-106.1 0L-77.1 -20.6L-91.3 -52.6L-56.2 -56.1L-52.4 -90.6L-20.5 -76.4Z"
						fill="url(#sol-body)"
						stroke="#d7a225"
						strokeWidth="2"
						strokeLinejoin="round"
					/>
					<path
						d="M-52 -73C-31 -94 18 -95 51 -76"
						fill="none"
						stroke="#fff7cf"
						strokeWidth="8"
						strokeLinecap="round"
						opacity="0.36"
					/>
				</g>

				<g className="sol-character-face">
					<g className="sol-character-heart-eyes">
						<path d="M0 14C-2 10-13 3-13-5C-13-12-8-16-2-16C3-16 7-13 8-9C10-13 14-16 19-16C25-16 30-12 30-5C30 3 19 10 16 14L8 21Z" transform="translate(-28 -7) scale(.62)" />
						<path d="M0 14C-2 10-13 3-13-5C-13-12-8-16-2-16C3-16 7-13 8-9C10-13 14-16 19-16C25-16 30-12 30-5C30 3 19 10 16 14L8 21Z" transform="translate(10 -7) scale(.62)" />
					</g>
					<g className="sol-character-thinking-eyes">
						<path d="M-31 -6Q-22 -13 -13 -6" />
						<path d="M13 -6Q22 -13 31 -6" />
					</g>
					<g className="sol-character-error-eyes">
						<path d="M-31 -16L-14 0M-14 -16L-31 0" />
						<path d="M14 -16L31 0M31 -16L14 0" />
					</g>
					<path className="sol-character-mouth sol-character-mouth--smile" d="M-13 17Q0 30 13 17" />
					<ellipse className="sol-character-mouth sol-character-mouth--talk" cx="0" cy="22" rx="9" ry="7" />
					<path className="sol-character-mouth sol-character-mouth--error" d="M-11 28Q0 16 11 28" />
				</g>
			</svg>
		</div>
	);
}
