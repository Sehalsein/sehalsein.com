import { Github, Linkedin, Mail, Smartphone } from "lucide-react";
import NextLink from "next/link";
import Image from "next/image";
import { PropsWithChildren } from "react";

type Props = {
  name: string;
  photo: string;
  summary: string;
  phone: string;
  email: string;
  location: string;
  social: {
    name: string;
    url: string;
  }[];
};

export default function Profile({
  name,
  photo,
  summary,
  social,
  email,
  phone,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
        {/* <div className="h-28 w-20 overflow-hidden rounded-full flex-none">
          <Image
            className="bg-gray-50 dark:bg-slate-950 rounded-full hidden"
            src={photo}
            width={80}
            height={80}
            alt="profile-pic"
            fill={false}
            objectFit="cover"
          />
        </div> */}
        <div className="flex flex-col gap-0.5 ">
          <h1 className="text-3xl font-bold">{name}</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`mailto:${email}`}>
              <div className="flex items-center">
                <Mail className="mr-2 w-4 h-4" />
                {email}
              </div>
            </Link>
            <Link href={`tel:${phone}`}>
              <div className="flex items-center">
                <Smartphone className="mr-2 w-4 h-4" />
                {phone}
              </div>
            </Link>
            {social.map((s) => (
              <Link key={s.name} href={s.url}>
                {getSocialIcon(s.name)}
              </Link>
            ))}
          </div>
          <p className="text-sm">{summary}</p>
        </div>
      </div>
    </div>
  );
}

function Link({ children, href }: PropsWithChildren<{ href: string }>) {
  return (
    <NextLink target="_blank" href={href} className="hover:underline text-sm">
      {children}
    </NextLink>
  );
}

function getSocialIcon(name: string) {
  switch (name.toLowerCase()) {
    case "linkedin":
      return (
        <Linkedin className="h-6 w-6 hover:bg-gray-100 dark:hover:bg-slate-950 rounded-sm p-1" />
      );
    case "github":
      return (
        <Github className="h-6 w-6 hover:bg-gray-100 dark:hover:bg-slate-950 rounded-sm p-1" />
      );
    default:
      return null;
  }
}
