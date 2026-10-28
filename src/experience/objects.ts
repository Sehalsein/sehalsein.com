export const SPOTS = {
  computer: {
    name: "The desk",
    verb: "Pull up a chair",
    point: { x: 0.2, z: -0.88 },
    anchor: [0.92, 1.35, -2.0],
    root: "Desk",
  },
  mug: {
    name: "Coffee break",
    verb: "Take a sip",
    point: { x: 0.2, z: -0.88 },
    anchor: [1.29, 0.99, -1.7],
    root: "Mug",
  },
  resume: {
    name: "My résumé",
    verb: "Read the page",
    point: { x: 0.2, z: -0.88 },
    anchor: [0.14, 0.91, -1.84],
    root: "Paper",
  },
  bed: {
    name: "A little daydream",
    verb: "Get comfortable",
    point: { x: -0.9, z: -0.37 },
    anchor: [-1.91, 0.85, -0.9],
    root: "Bed",
  },
  tv: {
    name: "After hours",
    verb: "Sit & play",
    point: { x: 1.7, z: 0.62 },
    anchor: [2.35, 1.02, 0.43],
    root: "Media",
  },
  books: {
    name: "The notebook",
    verb: "Leave a thought",
    point: { x: -0.4, z: -1.72 },
    anchor: [-0.88, 0.76, -1.82],
    root: "Nightstand",
  },
  figure: {
    name: "Little astronaut",
    verb: "Pick him up",
    point: { x: 2.1, z: -1.48 },
    anchor: [2.15, 1.32, -1.96],
    root: "Bookshelf",
  },
  board: {
    name: "Works in progress",
    verb: "Read the board",
    point: { x: 0.2, z: -0.88 },
    anchor: [0.98, 2.11, -2.25],
    root: "Board",
  },
  frames: {
    name: "Collected worlds",
    verb: "Look closer",
    point: { x: -1.89, z: 0.43 },
    anchor: [-2.7, 2.13, -0.3],
    root: "Art1",
  },
  lamp: {
    name: "A warm glow",
    verb: "Switch the lamp",
    point: { x: -0.37, z: -1.8 },
    anchor: [-0.84, 0.99, -2.04],
    root: "Lamp",
  },
  window: {
    name: "Let the day in",
    verb: "Draw the curtains",
    point: { x: -0.37, z: -1.74 },
    anchor: [-0.57, 1.03, -2.17],
    root: "Curtains",
  },
  wardrobe: {
    name: "Something to wear",
    verb: "Change your jacket",
    point: { x: -1.91, z: 1.13 },
    anchor: [-2.13, 1.24, 1.13],
    root: "Wardrobe",
  },
  plant: {
    name: "A little greenery",
    verb: "Water the plant",
    point: { x: -1.7, z: 1.87 },
    anchor: [-2.44, 1.03, 2.02],
    root: "CarePlant",
  },
} as const;
export type Spot = keyof typeof SPOTS;
export type View =
  | "room"
  | "desk"
  | "computer"
  | "resume"
  | "books"
  | "board"
  | "tv"
  | "figure"
  | "frames"
  | "sleep"
  | "dream";

export const ART = [
  {
    title: "Somewhere after midnight",
    caption:
      "For the part of us that still wonders what is beyond the next mountain.",
    index: 0,
  },
  {
    title: "Take the long way",
    caption: "A small traveler. A very big universe. Plenty left to discover.",
    index: 1,
  },
  {
    title: "A slower afternoon",
    caption: "A place to put everything down for a little while.",
    index: 2,
  },
];
