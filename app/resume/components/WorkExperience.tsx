type Props = {
  company: string;
  position?: string;
  location?: string;
  duration: {
    from: number;
    to?: number;
  };
  description: string[];
};

export default function WorkExperience({
  company,
  position,
  location,
  duration: { to, from },
  description,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <div className="flex flex-col">
          <h3 className="text-lg font-bold">{company}</h3>
          <p className="text-sm font-medium">
            {position} {location && `(${location})`}
          </p>
        </div>
        <div className="flex flex-col">
          <p className="text-sm font-medium text-right">
            {from} - {to || "Present"}
          </p>
        </div>
      </div>
      <ul className="list-disc list-inside">
        {description.map((desc) => (
          <li key={desc}>{desc}</li>
        ))}
      </ul>
    </div>
  );
}
