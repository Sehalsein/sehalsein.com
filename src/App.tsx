import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  X,
  Plus,
  Coffee,
  Monitor,
  FileText,
  Sparkles,
  Gamepad2,
  RotateCcw,
  MoveUpRight,
} from "lucide-react";
import type { Studio } from "./experience/Studio";
import { SPOTS, type Spot, type View } from "./experience/objects";
import { RoomAudio } from "./experience/Audio";
import { WorldContent } from "./ui/WorldContent";
import { profile } from "./content/profile";
const Resume = lazy(() =>
  import("./ui/Panels").then((m) => ({ default: m.Resume })),
);
type State = {
  view: View;
  busy: boolean;
  label: string;
  focus: Spot | null;
  visited: Spot[];
  ready: boolean;
  night: boolean;
};
declare global {
  interface Window {
    __STUDIO__?: Studio;
  }
}
export default function App() {
  const host = useRef<HTMLDivElement>(null),
    fade = useRef<HTMLDivElement>(null),
    audio = useRef<RoomAudio | null>(null);
  const [world, setWorld] = useState<Studio | null>(null),
    [entered, setEntered] = useState(false),
    [guide, setGuide] = useState(false),
    [sound, setSound] = useState(false),
    [page, setPage] = useState<"about" | "resume" | null>(null),
    [error, setError] = useState("");
  const [state, setState] = useState<State>({
    view: "room",
    busy: false,
    label: "Make yourself at home.",
    focus: null,
    visited: [],
    ready: false,
    night: false,
  });
  useEffect(() => {
    let stopped = false;
    let instance: Studio | undefined;
    import("./experience/Studio")
      .then(async ({ Studio }) => {
        if (stopped || !host.current) return;
        instance = new Studio(host.current, setState, (value) => {
          if (fade.current) fade.current.style.opacity = String(value);
        });
        if (import.meta.env.DEV) window.__STUDIO__ = instance;
        await instance.start();
        if (!stopped) setWorld(instance);
      })
      .catch((e) => {
        console.error(e);
        setError(
          "The room couldn’t load. You can still find my work and résumé below.",
        );
      });
    audio.current = new RoomAudio();
    return () => {
      stopped = true;
      instance?.dispose();
      audio.current?.dispose();
      if (window.__STUDIO__ === instance) delete window.__STUDIO__;
    };
  }, []);
  useEffect(() => {
    world?.setPaused(!!page);
    if (page)
      (
        document.querySelector(".studio-page") as HTMLDialogElement
      )?.showModal();
  }, [world, page]);
  const visit = (id: Spot) => {
    world?.visit(id);
    setGuide(false);
  };
  const enter = () => {
    setEntered(true);
    world?.enter();
  };
  const room = state.view === "room",
    desk = state.view === "desk",
    screen = ["computer", "tv", "books", "resume", "figure", "board"].includes(
      state.view,
    );
  return (
    <main
      className={`studio-app ${entered ? "is-playing" : "is-welcoming"} ${state.night ? "is-evening" : ""} ${screen ? "is-screen" : ""} ${state.busy ? "is-acting" : ""} studio-view-${state.view}`}
    >
      <div className="studio-stage" ref={host} />
      {world && <WorldContent world={world} />}
      <div className="studio-vignette" />
      <header className="studio-header">
        <button
          className="studio-brand"
          onClick={() => {
            if (!entered) enter();
            else world?.back();
          }}
          aria-label="Sehal’s room, home"
        >
          <span className="brand-emblem">
            s<span>✳</span>
          </span>
          <span>
            sehal’s room<small>A LITTLE WORLD OF MY OWN</small>
          </span>
        </button>
        <div className="studio-tools">
          <span className="studio-time">
            <i />
            {state.night ? "after hours" : "a slow afternoon"}
          </span>
          <button
            onClick={() => world?.setNight()}
            aria-label={
              state.night ? "Switch to afternoon" : "Switch to evening"
            }
          >
            {state.night ? <Moon size={18} /> : <Sun size={19} />}
          </button>
          <button
            onClick={() => {
              setSound(!sound);
              void audio.current?.setEnabled(!sound);
            }}
            aria-label={sound ? "Mute room ambience" : "Play room ambience"}
          >
            {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            className="guide-toggle"
            onClick={() => setGuide(!guide)}
            aria-expanded={guide}
          >
            Room guide <Plus size={16} />
          </button>
        </div>
      </header>
      {!entered && (
        <section className="studio-welcome">
          <span className="studio-kicker">
            <i /> HELLO, I’M SEHAL.
          </span>
          <h1>
            Come on in.
            <br />
            <em>Stay curious.</em>
          </h1>
          <p>
            A room full of things I make,
            <br />
            worlds I love, and ideas in progress.
          </p>
          <button
            className="studio-enter"
            onClick={enter}
            disabled={!state.ready}
          >
            {error
              ? "Room unavailable"
              : state.ready
                ? "Make yourself at home"
                : "Unpacking the room"}
            {state.ready ? (
              <ArrowRight size={19} />
            ) : (
              <span className="loading-dots">···</span>
            )}
          </button>
          <span className="entry-note">
            A playable little corner of the internet.
          </span>
        </section>
      )}
      {entered && (
        <>
          <div className="studio-caption" aria-live="polite">
            <span className={state.busy ? "is-acting" : ""} />
            {state.label}
          </div>
          <nav className="studio-actions" aria-label="Room interactions">
            {!room && (
              <button className="action-back" onClick={() => world?.back()}>
                <ArrowLeft size={17} />
                {state.view === "dream" || state.view === "sleep"
                  ? "Wake up"
                  : desk
                    ? "Stand up"
                    : "Step back"}
                <kbd>esc</kbd>
              </button>
            )}
            {room && (
              <>
                <button onClick={() => visit("computer")} disabled={state.busy}>
                  <Monitor size={18} />
                  <span>The desk</span>
                  <ArrowUpRight size={14} />
                </button>
                <button onClick={() => visit("bed")} disabled={state.busy}>
                  <Moon size={18} />
                  <span>Daydream</span>
                  <ArrowUpRight size={14} />
                </button>
                <button onClick={() => visit("tv")} disabled={state.busy}>
                  <Gamepad2 size={18} />
                  <span>After hours</span>
                  <ArrowUpRight size={14} />
                </button>
              </>
            )}
            {desk && (
              <>
                <button onClick={() => visit("computer")} disabled={state.busy}>
                  <Monitor size={18} />
                  Use computer
                </button>
                <button onClick={() => visit("mug")} disabled={state.busy}>
                  <Coffee size={18} />
                  Take a sip
                </button>
                <button onClick={() => visit("resume")} disabled={state.busy}>
                  <FileText size={18} />
                  Read résumé
                </button>
              </>
            )}
          </nav>
          {room && (
            <div className="studio-controls">
              <span>
                <kbd>W</kbd>
                <span>
                  <kbd>A</kbd>
                  <kbd>S</kbd>
                  <kbd>D</kbd>
                </span>
              </span>
              <span>walk around</span>
              <i />
              <span>drag to look · click to discover</span>
              <button
                onClick={() => world?.resetCamera()}
                aria-label="Reset room view"
              >
                <RotateCcw size={16} />
              </button>
            </div>
          )}
          {room && state.focus && !state.busy && (
            <button
              className="nearby-object"
              onClick={() => state.focus && visit(state.focus)}
            >
              <kbd>E</kbd>
              {SPOTS[state.focus].verb}
              <MoveUpRight size={13} />
            </button>
          )}
          {room && (
            <div className="touch-walk" aria-label="Movement controls">
              {[
                ["w", "↑"],
                ["a", "←"],
                ["s", "↓"],
                ["d", "→"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  aria-label={`Walk ${key === "w" ? "forward" : key === "s" ? "backward" : key === "a" ? "left" : "right"}`}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    world?.keys.add(key);
                  }}
                  onPointerUp={() => world?.keys.delete(key)}
                  onPointerCancel={() => world?.keys.delete(key)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <footer className="studio-footer">
        <div>
          <button onClick={() => setPage("about")}>About me</button>
          <span>/</span>
          <button onClick={() => setPage("resume")}>Résumé</button>
          <span>/</span>
          <a href={`mailto:${profile.email}`}>
            Say hello <ArrowUpRight size={12} />
          </a>
        </div>
        <span className="discovery-count">
          {String(state.visited.length).padStart(2, "0")}{" "}
          <span>/ 13 little discoveries</span>
        </span>
      </footer>
      {guide && (
        <aside className="studio-guide">
          <header>
            <span className="studio-kicker">FOLLOW YOUR CURIOSITY</span>
            <button
              onClick={() => setGuide(false)}
              aria-label="Close room guide"
            >
              <X size={18} />
            </button>
          </header>
          <h2>
            Every object
            <br />
            has a little story.
          </h2>
          <div>
            {(Object.keys(SPOTS) as Spot[]).map((id, i) => (
              <button
                key={id}
                onClick={() => {
                  if (!entered) enter();
                  visit(id);
                }}
                disabled={!state.ready || state.busy}
              >
                <span>
                  {state.visited.includes(id)
                    ? "✳"
                    : String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  {SPOTS[id].name}
                  <small>{SPOTS[id].verb}</small>
                </span>
                <ArrowUpRight size={16} />
              </button>
            ))}
          </div>
        </aside>
      )}
      {page && (
        <dialog
          className="studio-page"
          onCancel={(e) => {
            e.preventDefault();
            setPage(null);
          }}
          aria-modal="true"
          aria-label={page === "about" ? "About Sehal" : "Résumé"}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              setPage(null);
            }
          }}
        >
          <button
            className="page-close"
            autoFocus
            onClick={() => setPage(null)}
          >
            <ArrowLeft size={17} /> Back to the room
          </button>
          <div>
            {page === "resume" ? (
              <Suspense fallback={<p>Opening the page…</p>}>
                <Resume />
              </Suspense>
            ) : (
              <article className="studio-about">
                <Sparkles size={30} />
                <span className="studio-kicker">A HUMAN BEHIND THE SCREEN</span>
                <h1>
                  {profile.name}
                  <em>.</em>
                </h1>
                <h2>{profile.title}</h2>
                <p>{profile.intro}</p>
                <p>
                  I’m based in {profile.location}. This little room is a more
                  playful way to meet the person behind the work.
                </p>
                <a href={profile.github} target="_blank" rel="noreferrer">
                  Things on GitHub <ArrowUpRight size={17} />
                </a>
                <a href={profile.linkedin} target="_blank" rel="noreferrer">
                  Find me on LinkedIn <ArrowUpRight size={17} />
                </a>
              </article>
            )}
          </div>
        </dialog>
      )}
      {error && (
        <p className="studio-error" role="alert">
          {error}
        </p>
      )}
      <div className="studio-fade" ref={fade} />
    </main>
  );
}
