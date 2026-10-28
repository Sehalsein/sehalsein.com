import { lazy, Suspense, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Download,
  Printer,
  Play,
  Radio,
  Check,
} from "lucide-react";
import { profile } from "../content/profile";
import { ART } from "../experience/objects";
import { readText, saveText } from "./storage";
const StarGame = lazy(() => import("./StarGame"));

export function Resume() {
  const download = () => {
    const text = [
      profile.name,
      profile.title,
      profile.location,
      profile.email,
      "",
      profile.intro,
      "",
      "EXPERIENCE",
      ...profile.experience.flatMap((item) => [
        item.company,
        `${item.role} | ${item.date}`,
        item.detail,
        "",
      ]),
      "SKILLS",
      profile.skills.join(" · "),
      "",
      "EDUCATION",
      profile.education,
      "",
      profile.github,
      profile.linkedin,
    ].join("\n");
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "Sehal-Sein-Resume.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return (
    <article className="resume-paper">
      <div className="paper-top">
        <span className="eyebrow">A little about me</span>
        <span className="paper-number">01 / RÉSUMÉ</span>
      </div>
      <h1>
        {profile.name}
        <span>.</span>
      </h1>
      <p className="resume-title">{profile.title}</p>
      <div className="resume-contact">
        <span>{profile.location}</span>
        <a href={`mailto:${profile.email}`}>
          {profile.email}
          <ArrowUpRight size={13} />
        </a>
      </div>
      <p className="resume-intro">{profile.intro}</p>
      <h2>Where I've spent my time</h2>
      <div className="experience-list">
        {profile.experience.map((item) => (
          <section className="experience" key={item.company}>
            <time>{item.date}</time>
            <div>
              <h3>{item.company}</h3>
              <strong>{item.role}</strong>
              <p>{item.detail}</p>
            </div>
          </section>
        ))}
      </div>
      <h2>Things I work with</h2>
      <div className="skill-list">
        {profile.skills.map((skill) => (
          <span key={skill}>{skill}</span>
        ))}
      </div>
      <h2>Education</h2>
      <p className="education">{profile.education}</p>
      <footer className="paper-actions">
        <button className="primary-button" onClick={download}>
          <Download size={16} /> Download .txt
        </button>
        <button className="secondary-button" onClick={() => window.print()}>
          <Printer size={16} /> Print / save PDF
        </button>
      </footer>
    </article>
  );
}

export function Gallery() {
  const [index, setIndex] = useState(0),
    art = ART[index];
  return (
    <section className="gallery">
      <div className="gallery-art">
        <div
          role="img"
          aria-label={art.title}
          className={`art-panel art-${art.index}`}
        />
      </div>
      <div className="gallery-description">
        <span className="eyebrow">
          Collected worlds / {String(index + 1).padStart(2, "0")}
        </span>
        <h2>{art.title}</h2>
        <p>{art.caption}</p>
        <span className="art-credit">
          Original artwork for this little room.
        </span>
        <div className="gallery-controls">
          <button
            className="circle-button"
            aria-label="Previous artwork"
            onClick={() => setIndex((index + 2) % 3)}
          >
            <ArrowLeft size={19} />
          </button>
          <span>
            {index + 1} <span>/ 3</span>
          </span>
          <button
            className="circle-button"
            aria-label="Next artwork"
            onClick={() => setIndex((index + 1) % 3)}
          >
            <ArrowRight size={19} />
          </button>
        </div>
      </div>
    </section>
  );
}

export function Television() {
  const [channel, setChannel] = useState(2),
    [game, setGame] = useState(false);
  if (game)
    return (
      <Suspense fallback={<p className="loading-inline">Finding the stars…</p>}>
        <StarGame back={() => setGame(false)} />
      </Suspense>
    );
  return (
    <section className="television">
      <div className="tv-title">
        <span className="eyebrow">Nothing urgent on this channel</span>
        <h2>Stay a little.</h2>
      </div>
      <div className="tv-picture">
        <div className={`art-panel art-${channel}`} />
        <div className="tv-channel-label">
          <Radio size={15} />
          <span>SLOW TV</span>
          <i />
          {String(channel + 1).padStart(2, "0")}
        </div>
        <div className="tv-caption">{ART[channel].title}</div>
      </div>
      <div className="tv-controls">
        <div className="channel-buttons" aria-label="TV channels">
          {ART.map((art, index) => (
            <button
              key={art.title}
              onClick={() => setChannel(index)}
              aria-label={`Channel ${index + 1}: ${art.title}`}
              aria-pressed={channel === index}
            >
              {String(index + 1).padStart(2, "0")}
            </button>
          ))}
        </div>
        <button className="primary-button" onClick={() => setGame(true)}>
          <Play size={15} /> Play Starlight
        </button>
      </div>
    </section>
  );
}

export function Notebook() {
  const [value, setValue] = useState(() => readText("bedside-note", ""));
  const [saved, setSaved] = useState(true);
  return (
    <section className="notebook">
      <span className="eyebrow">An open page</span>
      <h2>What's on your mind?</h2>
      <p>This page belongs to whoever is here right now.</p>
      <textarea
        aria-label="Write a thought in the bedside notebook"
        placeholder="A thought, a tiny idea, something worth remembering…"
        maxLength={20000}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setSaved(saveText("bedside-note", e.target.value));
        }}
      />
      <footer>
        <span>
          {saved ? (
            <>
              <Check size={14} /> Your note stays in this browser.
            </>
          ) : (
            "Your browser could not save this note."
          )}
        </span>
        <span>{value.length} / 20,000</span>
      </footer>
    </section>
  );
}

export function Board() {
  const [selected, setSelected] = useState(0);
  const cards = [
    {
      title: "Make it feel alive.",
      tag: "A place, not just a page",
      body: "The light changes. The clock keeps time. You pull out a chair, pick up a little object, and discover something you did not expect. Small moments make a place feel lived in.",
    },
    {
      title: "Follow your curiosity.",
      tag: "The good kind of distraction",
      body: "A computer to explore. An astronaut to turn in your hands. A game for a quiet minute. Leave enough space for a visitor to find their own way through.",
    },
    {
      title: "Leave room to dream.",
      tag: "A little bit of impossible",
      body: "Even a small room can hold a big world. Lie down for a moment. There might be something on the other side of the ceiling.",
    },
  ];
  return (
    <section className="idea-board">
      <span className="eyebrow">Pinned above the desk</span>
      <h2>A few things behind this room.</h2>
      <div className="board-notes">
        {cards.map((card, index) => (
          <button
            key={card.title}
            onClick={() => setSelected(index)}
            aria-pressed={selected === index}
            className={`sticky-note sticky-${index}`}
          >
            <span className="pushpin" />
            <span className="sticky-number">0{index + 1}</span>
            {card.title}
          </button>
        ))}
      </div>
      <article className="board-story" key={selected}>
        <span className="eyebrow">{cards[selected].tag}</span>
        <h3>{cards[selected].title}</h3>
        <p>{cards[selected].body}</p>
      </article>
    </section>
  );
}
