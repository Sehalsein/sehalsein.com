import PageLayout from "@/components/PageLayout";
import Section from "@/components/Section";
import data from "@/data/resume";

export default function ResumePage() {
  return (
    <>
      <div className="flex flex-col px-2 py-20 gap-8">
        <div className="flex flex-row justify-between items-center">
          <div>
            <h1 className="text-6xl font-bold">{data.name}</h1>
            <span className="text-2xl">{data.title}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <a href={`mailto:${data.email}`}>{data.email}</a>
            <a href={`tel:${data.phone}`}>{data.phone}</a>
            <a href={data.website}>{data.website}</a>
          </div>
        </div>

        {/* Skills */}
        <div className="flex flex-col gap-8">
          {data.skills.map((skill) => {
            return (
              <Section
                key={skill.title}
                title={skill.title}
                className="flex flex-col"
              >
                <ul className="flex flex-wrap gap-2 py-2">
                  {skill.detail.map((detail) => {
                    return (
                      <li
                        className="bg-gray-200 dark:bg-gray-900 rounded-lg px-2 py-1 font-semibold"
                        key={detail}
                      >
                        {detail}
                      </li>
                    );
                  })}
                </ul>
              </Section>
            );
          })}
        </div>

        {/* Certification */}
        <Section title="Certification" className="flex flex-col">
          <>
            {data.certifications.map((certificate) => {
              return (
                <div key={certificate.title} className="py-2">
                  <div className="flex flex-col">
                    {certificate.link ? (
                      <a
                        target="_blank"
                        href={certificate.link}
                        className="font-bold text-xl"
                      >
                        {certificate.title}
                      </a>
                    ) : (
                      <span className="font-bold text-xl">
                        {certificate.title}
                      </span>
                    )}
                    <span>
                      {new Date(certificate.startDate).getFullYear()} -&nbsp;
                      {certificate.endDate
                        ? new Date(certificate.endDate).getFullYear()
                        : "Present"}
                    </span>
                  </div>
                </div>
              );
            })}
          </>
        </Section>

        {/* Work Experience */}
        <Section title="Work Experience" className="flex flex-col">
          <>
            {data.experiences.map((experience) => {
              return (
                <div key={experience.company} className="py-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-lg">
                      {experience.company}, {experience.location} -&nbsp;
                      {experience.title}
                    </span>
                    <span>
                      {new Date(experience.startDate).getFullYear()} -&nbsp;
                      {experience.endDate
                        ? new Date(experience.endDate).getFullYear()
                        : "Present"}
                    </span>
                  </div>
                  {experience.detail && (
                    <ul className="py-2 list-disc list-inside">
                      {experience.detail.map((detail, index) => {
                        return <li key={index}>{detail}</li>;
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </>
        </Section>

        {/* Education */}
        <Section title="Education" className="flex flex-col">
          <>
            {data.educations.map((education) => {
              return (
                <div key={education.title} className="py-2">
                  <div className="flex flex-col">
                    <span className="font-bold text-lg">{education.title}</span>
                    <span>
                      {new Date(education.startDate).getFullYear()} -&nbsp;
                      {education.endDate
                        ? new Date(education.endDate).getFullYear()
                        : "Present"}
                    </span>
                  </div>
                </div>
              );
            })}
          </>
        </Section>
      </div>
    </>
  );
}

ResumePage.getLayout = function getLayout(page: React.ReactElement) {
  return <PageLayout className="max-w-4xl mx-auto">{page}</PageLayout>;
};
