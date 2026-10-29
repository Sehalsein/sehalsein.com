import { lazy, Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Studio } from "../experience/Studio";
import type { SurfaceId } from "../experience/surfaces";

const Computer = lazy(() =>
  import("./Computer").then((m) => ({ default: m.Computer })),
);
const Resume = lazy(() =>
  import("./Panels").then((m) => ({ default: m.Resume })),
);
const Notebook = lazy(() =>
  import("./Panels").then((m) => ({ default: m.Notebook })),
);
const Board = lazy(() =>
  import("./Panels").then((m) => ({ default: m.Board })),
);
const Television = lazy(() =>
  import("./Panels").then((m) => ({ default: m.Television })),
);
const CONTENT = {
  computer: Computer,
  resume: Resume,
  books: Notebook,
  board: Board,
  tv: Television,
};
const LABELS = {
  computer: "Computer screen",
  resume: "Résumé page",
  books: "Notebook page",
  board: "Idea board",
  tv: "Television screen",
};

export function WorldContent({ world }: { world: Studio }) {
  const [elements] = useState(
    () =>
      Object.fromEntries(
        Object.keys(CONTENT).map((id) => {
          const element = document.createElement("section");
          element.className = `world-surface surface-${id}`;
          element.setAttribute("aria-label", LABELS[id as SurfaceId]);
          element.setAttribute("role", "region");
          return [id, element];
        }),
      ) as Record<SurfaceId, HTMLElement>,
  );
  useEffect(() => {
    Object.entries(elements).forEach(([id, element]) =>
      world.mountSurface(id as SurfaceId, element),
    );
  }, [world, elements]);
  return (
    <>
      {Object.entries(CONTENT).map(([id, Content]) =>
        createPortal(
          <Suspense
            fallback={<div className="surface-loading">A little moment…</div>}
          >
            <Content />
          </Suspense>,
          elements[id as SurfaceId],
          id,
        ),
      )}
    </>
  );
}
