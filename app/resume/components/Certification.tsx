type Props = {
  name: string;
  issuer: string;
  issued: string;
};

export default function Certification({ name, issuer, issued }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between">
        <div className="flex flex-col">
          <h3 className="text-lg font-bold">{name}</h3>
          <p className="text-sm font-medium text-gray-400">{issuer}</p>
        </div>
        {/* <div className="flex flex-col">
          <p className="text-sm font-medium text-right ">{issued}</p>
        </div> */}
      </div>
    </div>
  );
}
