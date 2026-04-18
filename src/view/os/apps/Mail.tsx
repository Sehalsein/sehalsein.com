"use client";

import { useId, useRef, useState } from "react";
import { RESUME_DATA } from "@/src/data/resume";

export default function Mail() {
	const [from, setFrom] = useState("");
	const [name, setName] = useState("");
	const [subject, setSubject] = useState("");
	const [message, setMessage] = useState("");
	const [sent, setSent] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const fromRef = useRef<HTMLInputElement>(null);
	const messageRef = useRef<HTMLTextAreaElement>(null);

	const toId = useId();
	const fromId = useId();
	const nameId = useId();
	const subjectId = useId();
	const messageId = useId();
	const errorId = useId();

	const send = () => {
		if (!from.trim()) {
			setError("your email is required so I can reply.");
			fromRef.current?.focus();
			return;
		}
		if (!message.trim()) {
			setError("add a message before sending.");
			messageRef.current?.focus();
			return;
		}
		setError(null);
		setSent(true);
		setFrom("");
		setName("");
		setSubject("");
		setMessage("");
		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(() => setSent(false), 3500);
	};

	return (
		<form
			className="app-mail"
			onSubmit={(e) => {
				e.preventDefault();
				send();
			}}
			aria-describedby={error ? errorId : undefined}
		>
			<h2>New message</h2>
			<div className="fld">
				<label htmlFor={toId}>to</label>
				<input
					id={toId}
					type="email"
					value={RESUME_DATA.email}
					readOnly
					autoComplete="off"
				/>
			</div>
			<div className="row">
				<div className="fld">
					<label htmlFor={fromId}>from</label>
					<input
						ref={fromRef}
						id={fromId}
						type="email"
						inputMode="email"
						autoComplete="email"
						spellCheck={false}
						placeholder="you@example.com"
						value={from}
						onChange={(e) => setFrom(e.target.value)}
						aria-invalid={error !== null && !from.trim()}
						aria-describedby={error ? errorId : undefined}
						required
					/>
				</div>
				<div className="fld">
					<label htmlFor={nameId}>name</label>
					<input
						id={nameId}
						type="text"
						autoComplete="name"
						placeholder="your name"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
				</div>
			</div>
			<div className="fld">
				<label htmlFor={subjectId}>subject</label>
				<input
					id={subjectId}
					type="text"
					autoComplete="off"
					placeholder="saw your site"
					value={subject}
					onChange={(e) => setSubject(e.target.value)}
				/>
			</div>
			<div className="fld">
				<label htmlFor={messageId}>message</label>
				<textarea
					ref={messageRef}
					id={messageId}
					placeholder="hey — …"
					value={message}
					onChange={(e) => setMessage(e.target.value)}
					aria-invalid={error !== null && !message.trim()}
					aria-describedby={error ? errorId : undefined}
					required
				/>
			</div>
			<button type="submit">send →</button>
			<p id={errorId} role="alert" className="ok" aria-live="assertive">
				{error}
			</p>
			<p className="ok" aria-live="polite" aria-atomic="true">
				{sent ? "✓ sent. thanks — I'll reply within 1–2 business days." : null}
			</p>
			<div className="alt">
				prefer real email?{" "}
				<a href={`mailto:${RESUME_DATA.email}`}>{RESUME_DATA.email}</a> · find
				me on{" "}
				{RESUME_DATA.social.map((s, i) => (
					<span key={s.name}>
						{i > 0 ? " · " : ""}
						<a href={s.url} target="_blank" rel="noopener noreferrer">
							{s.name.toLowerCase()}
						</a>
					</span>
				))}
			</div>
		</form>
	);
}
