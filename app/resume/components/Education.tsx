type Props = {
  name: string;
  institution: string;
  duration: {
    from: number;
    to?: number;
  };
  location?: string;
};

export default function Education({
  name,
  institution,
  duration: { to, from },
  location,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <div className="flex flex-col">
          <h3 className="text-lg font-bold">{name}</h3>
          <p className="text-sm font-medium text-gray-400">
            {institution} {location && `(${location})`}
          </p>
        </div>
        <div className="flex flex-col">
          <p className="text-sm font-medium text-right">
            {from} - {to || "Present"}
          </p>
        </div>
      </div>
    </div>
  );
}
