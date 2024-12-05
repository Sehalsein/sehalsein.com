import { RESUME_DATA } from "@/data/resume";
import AppIcon from "./components/AppIcon";
import Image from "next/image";
import { Briefcase, Circle, Code, Github, Linkedin } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Page() {
  return (
    <>
      <MobileView />
      <DesktopView />
    </>
  );
}

function MobileView() {
  return (
    <div className="pt-24 pb-32 h-fit px-8 grid grid-cols-4 md:grid-cols-8 gap-8 lg:hidden">
      <WidgetView />
      <AppView />
    </div>
  );
}

function DesktopView() {
  return (
    <div className="lg:flex hidden justify-between pt-20 pb-28 px-8">
      <div className="hidden lg:flex flex-wrap gap-8 max-w-lg">
        <WidgetView />
      </div>
      <div className="hidden lg:flex lg:flex-col gap-8 col-span-1 col-start-8 items-end ">
        <AppView />
      </div>
    </div>
  );
}

function AppView() {
  return (
    <>
      <AppIcon
        href={`https://dgymbook.com`}
        appName="Dgymbook"
        icon={
          <svg
            viewBox="0 0 356 242"
            height={60}
            width={60}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={
              "bg-gradient-to-br from-blue-500 to-blue-700 text-white p-2"
            }
          >
            <path
              d="M0.830017 31.07C5.09002 13.92 17.01 3.17 34.47 1.45C45.62 0.350004 56.85 0.220003 68.02 1.59C87.29 3.94 101.12 19.51 101.15 38.81C101.17 51.73 101.3 64.65 101.07 77.57C100.99 81.89 102.11 83.51 106.74 83.49C153.54 83.34 200.34 83.34 247.14 83.5C251.95 83.52 253.41 82.06 253.3 77.27C253 64.6 253.11 51.92 253.23 39.25C253.43 19.25 267.77 3.64 287.71 1.46C297.44 0.400002 307.23 0.440002 316.92 1.1C340.59 2.71 354.84 17.73 354.95 41.54C355.2 94.92 355.24 148.31 354.92 201.69C354.77 226.06 338.49 241.4 314.07 241.42C306.51 241.43 298.96 241.46 291.4 241.41C270.19 241.28 253.52 224.72 253.25 203.37C253.09 190.7 253.03 178.02 253.29 165.35C253.38 160.88 252.06 159.51 247.54 159.52C200.5 159.67 153.45 159.66 106.4 159.53C102.19 159.52 101 160.92 101.06 165C101.27 178.16 101.2 191.33 101.12 204.49C101 224.35 84.21 241.18 64.34 241.4C56.3 241.49 48.25 241.43 40.21 241.42C19.6 241.41 5.81003 230.72 0.590027 210.7C2.37003 208.31 1.65998 205.54 1.66998 202.93C1.70998 148.02 1.69999 93.12 1.67999 38.21C1.66999 35.8 2.18002 33.31 0.830017 31.07ZM329.39 121.33C329.39 94.76 329.41 68.2 329.38 41.63C329.37 30.28 325.47 26.51 313.94 26.49C307.36 26.48 300.78 26.48 294.2 26.5C283.09 26.53 278.44 30.82 278.43 41.82C278.34 94.95 278.35 148.08 278.43 201.21C278.45 211.32 283.69 216.36 293.89 216.56C300.71 216.69 307.54 216.71 314.36 216.55C324.56 216.31 329.37 211.32 329.38 201.04C329.41 174.46 329.39 147.89 329.39 121.33ZM25.1 120.88C25.1 147.43 25.06 173.99 25.12 200.54C25.14 210.89 29.53 216.05 39.04 216.48C46.82 216.84 54.64 216.84 62.42 216.47C71.32 216.05 76.21 210.89 76.23 201.86C76.32 148.02 76.32 94.18 76.24 40.35C76.23 31.61 70.83 26.61 61.92 26.51C55.1 26.44 48.28 26.49 41.46 26.5C29.53 26.52 25.12 30.85 25.11 42.68C25.08 68.75 25.1 94.81 25.1 120.88ZM176.47 133.65C195.97 133.65 215.46 133.65 234.96 133.65C253.39 133.65 253.1 133.65 253.37 115.51C253.46 109.41 251.29 108.37 245.85 108.39C203.69 108.58 161.53 108.49 119.36 108.5C100.75 108.5 100.96 108.51 101.01 127.3C101.03 132.58 102.82 133.79 107.74 133.74C130.65 133.53 153.56 133.65 176.47 133.65Z"
              fill="currentColor"
            />
            <path
              d="M0.830035 31.07C2.18003 33.32 1.67 35.8 1.67 38.2C1.69 93.11 1.69999 148.01 1.65999 202.92C1.65999 205.53 2.37003 208.3 0.580035 210.69C0.410035 208.76 0.0999933 206.82 0.0999933 204.88C0.0699933 149.11 0.0700031 93.34 0.110003 37.56C0.120003 35.39 0.580035 33.23 0.830035 31.07Z"
              fill="currentColor"
            />
          </svg>
        }
        size="sm"
      />
      <AppIcon
        href={`https://www.github.com/sehalsein`}
        appName="Github"
        icon={
          <Github
            className="lucide lucide-linkedin p-3 bg-black text-white"
            height={60}
            width={60}
          />
        }
        size="sm"
      />
      <AppIcon
        href={`https://www.linkedin.com/in/sehalsein/`}
        appName="LinkedIn"
        icon={
          <Linkedin
            className="lucide lucide-linkedin p-3 bg-[#0A66C2] text-white"
            height={60}
            width={60}
          />
        }
        size="sm"
      />
    </>
  );
}

function WidgetView() {
  const experiences = RESUME_DATA.experience.slice(0, 3);
  return (
    <>
      <AppIcon
        className="col-span-2"
        appName="Photos"
        size="md"
        href={"/resume"}
        icon={
          <div className="relative w-full h-full">
            <Image
              className="bg-gray-50 dark:bg-slate-950 object-cover object-center"
              src={"/me.jpg"}
              fill
              alt="profile-pic"
            />
          </div>
        }
      />
      <AppIcon
        className="col-span-2"
        appName="Stack"
        size="md"
        href={"/resume"}
        icon={
          <div className="relative w-full h-full bg-neutral-900">
            <div className="flex flex-col gap-4 h-full  px-3  py-4 ">
              <div className="font-bold text-white flex flex-row gap-2 text-left">
                <div className="bg-blue-600 p-1 rounded-full w-6 h-6">
                  <Code className="h-4 w-4" />
                </div>
                <h3>Stack</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <Tag text="NextJS" />
                <Tag text="Hono" />
                <Tag text="Tailwind" />
                <Tag text="Prisma" />
                <Tag text="Postgresql" />
              </div>
            </div>
          </div>
        }
      />
      <AppIcon
        href="/resume"
        className="col-span-4"
        appName="Work Experience"
        size="lg"
        icon={
          <div className="relative w-full h-full bg-neutral-900">
            <div className="flex flex-row gap-2 h-full  px-3  py-4 ">
              <div className="font-bold text-white flex justify-between flex-col text-left">
                <div className="bg-purple-600 p-1 rounded-full w-6 h-6">
                  <Briefcase className="h-4 w-4" />
                </div>
                <h3>
                  6+ years
                  <br />
                  <span className="text-purple-600">Expereince</span>
                </h3>
              </div>
              <ul className="flex flex-col h-full divide-y-2 divide-neutral-800  text-left divide-dotted flex-1">
                {experiences.map((e, i) => {
                  const isCurrent = !e.duration.to;
                  return (
                    <li
                      key={i}
                      className="text-white py-2 text-xs flex items-center"
                    >
                      <CheckBox
                        checked={isCurrent}
                        className={cn(
                          "h-4 w-4 mr-2",
                          isCurrent ? "text-purple-600" : "text-neutral-800"
                        )}
                      />
                      {e.company}
                      {e.position && (
                        <span className="italic text-xs">- {e.position}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        }
      />
    </>
  );
}

function CheckBox(props: { checked?: boolean; className?: string }) {
  if (!props.checked) {
    return <Circle className={props.className} />;
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      className={props.className}
    >
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="4" fill="currentColor" />
    </svg>
  );
}

function Tag(props: { className?: string; text: string }) {
  return (
    <div
      className={cn(
        "text-white bg-blue-700 px-1 py-0.5 rounded-md text-xs",
        props.className
      )}
    >
      <span>{props.text}</span>
    </div>
  );
}
