import { lazy, Suspense, useEffect, useState } from "react";
import {
  Folder,
  FileText,
  UserRound,
  Gamepad2,
  Mail,
  ArrowUpRight,
  ChevronLeft,
  Minus,
  Maximize2,
  X,
  Wifi,
  BatteryFull,
} from "lucide-react";
import { profile } from "../content/profile";
import { readText, saveText } from "./storage";
const StarGame = lazy(() => import("./StarGame"));
type AppId = "work" | "notes" | "about" | "arcade" | "contact";
const APPS = [
  { id: "work", title: "Things I make", icon: Folder, color: "sand" },
  { id: "notes", title: "Notes", icon: FileText, color: "paper" },
  { id: "about", title: "Hello", icon: UserRound, color: "green" },
  { id: "arcade", title: "Arcade", icon: Gamepad2, color: "lilac" },
  { id: "contact", title: "Get in touch", icon: Mail, color: "blue" },
] as const;

export function Computer() {
  const [app, setApp] = useState<AppId | null>("about"),
    [booted, setBooted] = useState(false),
    [maximized, setMaximized] = useState(false);
  const [time, setTime] = useState(new Date());
  const [note, setNote] = useState(() =>
    readText(
      "computer-note",
      "Things worth making\n\nSomething useful.\nSomething playful.\nSomething just because.\n",
    ),
  );
  const [saved, setSaved] = useState(true);
  useEffect(() => {
    const boot = setTimeout(() => setBooted(true), 900),
      clock = setInterval(() => setTime(new Date()), 15000);
    return () => {
      clearTimeout(boot);
      clearInterval(clock);
    };
  }, []);
  const active = APPS.find((item) => item.id === app);
  return (
    <section
      className={`computer ${maximized ? "window-maximized" : ""}`}
      aria-label="sehalOS version 2"
    >
      <div className="os-wallpaper" />
      {!booted ? (
        <div className="os-boot">
          <span className="os-symbol">s.</span>
          <h2>sehalOS</h2>
          <p>A space for a curious mind.</p>
          <div className="boot-line" />
        </div>
      ) : null}
      <div className="os-menubar">
        <strong className="os-brand">s.</strong>
        <span>
          sehalOS <small>02</small>
        </span>
        <span className="os-current-app">{active?.title ?? "Desktop"}</span>
        <div className="os-status">
          <Wifi size={14} />
          <BatteryFull size={18} />
          <time>
            {time.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </time>
        </div>
      </div>
      <div className="os-desktop-icons">
        {APPS.slice(0, 3).map((item) => (
          <button
            key={item.id}
            onClick={() => setApp(item.id)}
            className="desktop-icon"
          >
            <span className={`app-icon ${item.color}`}>
              <item.icon size={27} strokeWidth={1.4} />
            </span>
            <span>{item.title}</span>
          </button>
        ))}
      </div>
      {!app ? (
        <div className="desktop-greeting">
          <span className="eyebrow">A good place to begin</span>
          <h2>Make something.</h2>
          <p>Or just look around.</p>
        </div>
      ) : (
        <section className={`os-window app-${app}`} aria-label={active?.title}>
          <header className="os-window-bar">
            <div className="traffic-lights">
              <button aria-label="Close app" onClick={() => setApp(null)}>
                <X size={9} />
              </button>
              <button aria-label="Minimize app" onClick={() => setApp(null)}>
                <Minus size={9} />
              </button>
              <button
                aria-label="Toggle window size"
                onClick={() => setMaximized((v) => !v)}
              >
                <Maximize2 size={8} />
              </button>
            </div>
            <span>{active?.title}</span>
            <span className="window-version">sehalOS</span>
          </header>
          <div className="os-window-content">
            {app === "about" ? (
              <div className="os-about">
                <div className="hello-stamp">hello.</div>
                <span className="eyebrow">The person behind the room</span>
                <h2>I'm Sehal.</h2>
                <p>{profile.intro}</p>
                <div className="about-location">
                  <span className="live-dot" />
                  {profile.location}
                </div>
                <div className="about-divider" />
                <p className="small-copy">
                  This is my little corner of the internet. A place for things I
                  make, things I wonder about, and a bit of play.
                </p>
                <button className="text-button" onClick={() => setApp("work")}>
                  See what I work on <ArrowUpRight size={16} />
                </button>
              </div>
            ) : null}
            {app === "work" ? (
              <div className="os-work">
                <span className="eyebrow">Built with curiosity</span>
                <h2>Things I spend time on.</h2>
                {[
                  {
                    name: "This little room",
                    type: "A personal world",
                    detail:
                      "A fresh experiment in making the internet feel a little more human. Everything here starts with an object and a small moment of discovery.",
                    letter: "01",
                    color: "green",
                  },
                  {
                    name: "DGymBook",
                    type: "Co-founder",
                    detail:
                      "A platform that helps gyms manage the everyday, built from a small idea into something used by over 50,000 people.",
                    letter: "02",
                    color: "sand",
                  },
                  {
                    name: "Planned",
                    type: "Engineering lead",
                    detail:
                      "Thoughtful engineering for the people who bring people together.",
                    letter: "03",
                    color: "lilac",
                  },
                ].map((project) => (
                  <article className="project-row" key={project.name}>
                    <span className={`project-number ${project.color}`}>
                      {project.letter}
                    </span>
                    <div>
                      <span className="eyebrow">{project.type}</span>
                      <h3>{project.name}</h3>
                      <p>{project.detail}</p>
                    </div>
                  </article>
                ))}
                <a
                  className="text-button"
                  href={profile.github}
                  target="_blank"
                  rel="noreferrer"
                >
                  Explore my GitHub <ArrowUpRight size={15} />
                </a>
              </div>
            ) : null}
            {app === "notes" ? (
              <div className="os-notes">
                <div className="notes-toolbar">
                  <span>Untitled thoughts</span>
                  <span>
                    {saved
                      ? "Saved on this device"
                      : "Could not save on this device"}
                  </span>
                </div>
                <textarea
                  aria-label="Your notes"
                  spellCheck={false}
                  value={note}
                  maxLength={20000}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setSaved(saveText("computer-note", e.target.value));
                  }}
                />
                <div className="notes-footer">
                  A place to put a thought before it disappears.
                  <span>
                    {note.trim() ? note.trim().split(/\s+/).length : 0} words
                  </span>
                </div>
              </div>
            ) : null}
            {app === "arcade" ? (
              <Suspense
                fallback={<p className="loading-inline">Opening the arcade…</p>}
              >
                <StarGame />
              </Suspense>
            ) : null}
            {app === "contact" ? (
              <div className="os-contact">
                <span className="eyebrow">An open door</span>
                <h2>Say hello.</h2>
                <p>
                  Have something in mind? A question, an idea, or just a good
                  recommendation?
                </p>
                <a className="contact-address" href={`mailto:${profile.email}`}>
                  {profile.email}
                  <ArrowUpRight size={22} />
                </a>
                <div className="contact-links">
                  <a href={profile.github} target="_blank" rel="noreferrer">
                    GitHub <ArrowUpRight size={14} />
                  </a>
                  <a href={profile.linkedin} target="_blank" rel="noreferrer">
                    LinkedIn <ArrowUpRight size={14} />
                  </a>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}
      <nav className="os-dock" aria-label="Computer apps">
        {APPS.map((item) => (
          <button
            key={item.id}
            onClick={() => setApp(item.id)}
            className={app === item.id ? "active" : ""}
            aria-label={item.title}
            aria-pressed={app === item.id}
          >
            <span className={`app-icon ${item.color}`}>
              <item.icon size={25} strokeWidth={1.5} />
            </span>
            <span className="dock-tooltip">{item.title}</span>
            <i />
          </button>
        ))}
      </nav>
      <span className="os-bottom-note">
        <ChevronLeft size={12} /> Esc brings you back to the desk
      </span>
    </section>
  );
}
