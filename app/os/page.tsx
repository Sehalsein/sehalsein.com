import PhoneAppIcon from "@/components/icons/PhoneAppIcon";
import AppIcon from "./components/AppIcon";
import SafariIcon from "@/components/icons/SafariIcon";
import MessageIcon from "@/components/icons/MessageIcon";
import MailIcon from "@/components/icons/MailIcon";
import Image from "next/image";
import { RESUME_DATA } from "@/data/resume";

export default function Page() {
  return (
    <>
      <DesktopView />
      <MobileView />
    </>
  );
}

function MobileView() {
  return (
    <div className="pt-24 pb-28 h-fit px-8 grid grid-cols-4 md:grid-cols-8 gap-8 lg:hidden">
      <WidgetView />
      <AppView />
    </div>
  );
}

function DesktopView() {
  return (
    <div className="grid-cols-8 pt-16 pb-8 gap-8 px-8 hidden lg:grid relative">
      <div className="hidden lg:flex lg:flex-col gap-8 col-span-1">
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
        href={`tel:${RESUME_DATA.phone}`}
        appName="Phone"
        icon={<PhoneAppIcon />}
        size="sm"
      />
      <AppIcon
        href={"/os/resume"}
        appName="Browse"
        icon={<SafariIcon />}
        size="sm"
      />
      <AppIcon
        href={`tel:${RESUME_DATA.phone}`}
        appName="Messages"
        icon={<MessageIcon />}
        size="sm"
      />
      <AppIcon
        href={`mailto:${RESUME_DATA.email}`}
        appName="Mail"
        icon={<MailIcon />}
        size="sm"
      />
    </>
  );
}

function WidgetView() {
  return (
    <>
      <AppIcon
        className="col-span-2"
        appName="Photos"
        size="md"
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
        appName="Photos"
        size="md"
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
        className="col-span-4"
        appName="Photos"
        size="lg"
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
    </>
  );
}
