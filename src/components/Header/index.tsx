import Link from "next/link";

const nav = [
  {
    name: "Home",
    href: "/",
  },
  {
    name: "Resume",
    href: "/resume",
  },
  {
    name: "Projects",
    href: "/projects",
  },
  {
    name: "Blog",
    href: "/blog",
  },
  {
    name: "Studio",
    href: "/studio",
  },
];

export default function Header() {
  return (
    <header className="max-w-6xl mx-auto px-2 py-8 flex justify-between items-center">
      <span>Logo</span>
      <ul className="flex flex-row space-x-6">
        {nav.map(({ name, href }) => {
          return (
            <li key={href}>
              <Link
                className="text-lg p-2 rounded-lg border-b border-transparent hover:text-indigo-400"
                href={href}
              >
                {name}
              </Link>
            </li>
          );
        })}
      </ul>
    </header>
  );
}
