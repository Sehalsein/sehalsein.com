import { cn } from "@/src/lib/utils";

type Props = {
  company: string;
  position?: string;
  location?: string;
  duration: {
    from: number;
    to?: number;
  };
  description: string[];
  className?: string;
};

export default function WorkExperience({
  company,
  position,
  location,
  duration: { to, from },
  description,
  className,
}: Props) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex justify-between">
        <div className="flex flex-col">
          <h3 className="text-lg font-bold">{company}</h3>
          <p className="text-sm font-medium text-gray-400">
            {position} {location && `(${location})`}
          </p>
        </div>
        <div className="flex flex-col">
          <p className="text-sm font-medium text-right">
            {from} - {to || "Present"}
          </p>
        </div>
      </div>
      <ul className="list-disc list-outside pl-4">
        {description.map((desc) => (
          <li key={desc}>{desc}</li>
        ))}
      </ul>
    </div>
  );
}
