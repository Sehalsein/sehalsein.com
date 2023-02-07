import PageLayout from "@/components/PageLayout";
import data from "@/data/resume";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <h1 className="text-6xl font-bold mb-4">
        Hi, I am&nbsp;
        <span className="text-indigo-400">{data.name ?? "Sehal Sein"}</span>
      </h1>
      <span className="max-w-lg text-center text-lg">
        Software Engineer with hands-on experience in building real world react
        application and web services.
      </span>
    </div>
  );
}

HomePage.getLayout = function getLayout(page: React.ReactElement) {
  return <PageLayout className="max-w-4xl mx-auto">{page}</PageLayout>;
};
