import BatteryIcon from "@/components/icons/BatteryIcon";
import CellularNetworkIcon from "@/components/icons/CellularNetworkIcon";
import MessageIcon from "@/components/icons/MessageIcon";
import PhoneAppIcon from "@/components/icons/PhoneAppIcon";
import SafariIcon from "@/components/icons/SafariIcon";
import WifiIcon from "@/components/icons/WifiIcon";
import { PropsWithChildren } from "react";
import AppIcon from "./components/AppIcon";
import MailIcon from "@/components/icons/MailIcon";
import { cn } from "@/lib/utils";
import { RESUME_DATA } from "@/data/resume";

export default function Layout(props: PropsWithChildren) {
  return (
    <div
      className="h-screen bg-cover bg-center overflow-y-scroll"
      style={{
        backgroundImage: "url(/iOS18-Azure-Dark.webp)",
      }}
    >
      <StatusBar />
      {props.children}
      <TabBar />
    </div>
  );
}

function StatusBar() {
  return (
    <div className="w-full absolute top-0 pt-5 md:pt-0 lg:bg-gray-900 lg:bg-clip-padding lg:backdrop-filter z-10 lg:backdrop-blur lg:bg-opacity-10 lg:backdrop-saturate-100 lg:backdrop-contrast-100">
      <div className="h-full w-full pt-5 lg:pt-1 flex justify-between items-center px-8 relative py-1 ">
        <TimeView className="lg:hidden" time="13:13" />
        <svg
          width="14"
          height="17"
          viewBox="0 0 14 17"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="hidden lg:block"
        >
          <path
            d="M9.5085 4.74883C9.61992 4.74883 9.79237 4.76209 10.0258 4.78862C10.2646 4.80985 10.5352 4.86821 10.8376 4.96372C11.1401 5.05923 11.4478 5.2131 11.7609 5.42534C12.0739 5.63758 12.3631 5.93472 12.6284 6.31675C12.6019 6.33267 12.5011 6.4043 12.326 6.53164C12.1562 6.65898 11.9625 6.84469 11.745 7.08877C11.5274 7.32754 11.3364 7.63263 11.1719 8.00405C11.0127 8.37017 10.9332 8.80791 10.9332 9.31729C10.9332 9.90094 11.034 10.3944 11.2356 10.7977C11.4425 11.2009 11.6813 11.5272 11.9519 11.7766C12.2278 12.026 12.4719 12.209 12.6841 12.3258C12.9017 12.4372 13.0184 12.4956 13.0343 12.5009C13.029 12.5221 12.9892 12.6415 12.9149 12.859C12.8407 13.0713 12.7239 13.3472 12.5647 13.6868C12.4109 14.021 12.2092 14.3712 11.9599 14.7374C11.7317 15.061 11.4956 15.3714 11.2515 15.6686C11.0127 15.9657 10.7501 16.2071 10.4636 16.3928C10.1824 16.5838 9.864 16.6793 9.5085 16.6793C9.23789 16.6793 9.00708 16.6475 8.81606 16.5838C8.62505 16.5202 8.44199 16.4459 8.26689 16.361C8.0971 16.2814 7.90874 16.2098 7.70181 16.1461C7.49487 16.0824 7.23753 16.0506 6.92979 16.0506C6.52653 16.0506 6.1896 16.1036 5.91899 16.2098C5.65369 16.3212 5.40166 16.43 5.16289 16.5361C4.92412 16.6422 4.6429 16.6953 4.31924 16.6953C3.82578 16.6953 3.39069 16.4989 3.01397 16.1063C2.64255 15.7137 2.26051 15.2441 1.86787 14.6976C1.56543 14.2625 1.28952 13.7611 1.04014 13.1933C0.790756 12.6256 0.591781 12.0233 0.443213 11.3866C0.294646 10.7499 0.220362 10.1132 0.220362 9.47647C0.220362 8.45772 0.41403 7.6008 0.801368 6.90571C1.1887 6.21063 1.68481 5.68534 2.2897 5.32983C2.89458 4.97433 3.52334 4.79658 4.17598 4.79658C4.52087 4.79658 4.84453 4.8523 5.14697 4.96372C5.45472 5.07515 5.74124 5.18923 6.00654 5.30596C6.27184 5.41738 6.51327 5.4731 6.73081 5.4731C6.93774 5.4731 7.18182 5.41473 7.46304 5.298C7.74425 5.17596 8.05466 5.05392 8.39424 4.93189C8.73913 4.80985 9.11055 4.74883 9.5085 4.74883ZM8.95137 3.45947C8.68607 3.78314 8.35179 4.05109 7.94854 4.26333C7.55059 4.47557 7.17386 4.58169 6.81836 4.58169C6.74408 4.58169 6.67244 4.57373 6.60347 4.55781C6.59816 4.53659 6.5902 4.49945 6.57959 4.44639C6.57428 4.39333 6.57163 4.33496 6.57163 4.27129C6.57163 3.86803 6.65918 3.47539 6.83428 3.09336C7.00938 2.71133 7.211 2.39297 7.43916 2.13828C7.72038 1.804 8.07588 1.52544 8.50566 1.30259C8.94076 1.07974 9.35728 0.960352 9.75522 0.944434C9.77114 1.03464 9.7791 1.1381 9.7791 1.25483C9.7791 1.6634 9.70216 2.06135 9.54829 2.44868C9.39442 2.83071 9.19544 3.16764 8.95137 3.45947Z"
            fill="white"
          />
        </svg>

        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/3 md:hidden">
          <DynamicIsland />
        </div>
        <div className="flex space-x-2 items-center lg:space-x-4">
          <CellularNetworkIcon className="lg:hidden" />
          <WifiIcon />
          <BatteryIcon />
          <TimeView className="hidden lg:block" time="Mon Jun 10  9:41 AM" />
        </div>
      </div>
    </div>
  );
}

function TimeView(props: { className?: string; time: string }) {
  return (
    <time className={cn("text-white", props.className)}>{props.time}</time>
  );
}

function TabBar() {
  return (
    <div className="absolute bottom-0 pb-3 h-28 w-full px-3">
      <div className="h-full w-full max-w-sm mx-auto bg-[#232426] rounded-[40px] flex flex-row gap-4 md:gap-6 lg:gap-8 items-center justify-evenly px-5">
        <AppIcon
          href={`tel:${RESUME_DATA.phone}`}
          icon={<PhoneAppIcon />}
          size="sm"
        />
        <AppIcon href={"/resume"} icon={<SafariIcon />} size="sm" />
        <AppIcon
          href={`tel:${RESUME_DATA.phone}`}
          icon={<MessageIcon />}
          size="sm"
        />
        <AppIcon
          href={`mailto:${RESUME_DATA.email}`}
          icon={<MailIcon />}
          size="sm"
        />
      </div>
    </div>
  );
}

function DynamicIsland() {
  return (
    <svg
      width="126"
      height="37"
      viewBox="0 0 126 37"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        x="0.5"
        y="0.330002"
        width="125"
        height="36.67"
        rx="18.335"
        fill="black"
      />
    </svg>
  );
}
