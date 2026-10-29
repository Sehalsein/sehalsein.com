import {
  Monitor,
  FileText,
  Moon,
  Gamepad2,
  Images,
  Sparkles,
  BookOpen,
  Sun,
  Leaf,
  Shirt,
  Coffee,
  Pin,
} from 'lucide-react';
const icons = {
  monitor: Monitor,
  file: FileText,
  moon: Moon,
  game: Gamepad2,
  image: Images,
  sparkles: Sparkles,
  book: BookOpen,
  sun: Sun,
  leaf: Leaf,
  shirt: Shirt,
  coffee: Coffee,
  board: Pin,
};
export function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const Component = icons[name as keyof typeof icons] ?? Sparkles;
  return <Component size={size} strokeWidth={1.55} aria-hidden="true" />;
}
