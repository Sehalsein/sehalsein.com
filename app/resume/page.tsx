import Tag from "@/src/components/Tag";
import Section from "./components/Section";
import WorkExperience from "./components/WorkExperience";
import Certification from "./components/Certification";
import Education from "./components/Education";
import Profile from "./components/Profile";
import { RESUME_DATA } from "@/src/data/resume";

export default async function Page() {
  const data = RESUME_DATA;

  return (
    <>
      <Profile
        name={data.name}
        photo={data.photo}
        summary={data.summary}
        phone={data.phone}
        email={data.email}
        social={data.social}
        location={data.location}
      />
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold">Skills</h2>
        <div className="flex flex-wrap gap-2">
          {data.skills.map((skill) => (
            <Tag key={skill.title.toLowerCase()}>{skill.title}</Tag>
          ))}
        </div>
      </div>
      <Section title="Work Experience">
        {data.experience.map((exp) => (
          <WorkExperience
            className="py-2"
            key={exp.company}
            company={exp.company}
            position={exp.position}
            location={exp.location}
            duration={exp.duration}
            description={exp.description}
          />
        ))}
      </Section>
      <Section title="Certifications">
        {data.certifications.map((cert) => (
          <Certification
            key={cert.name}
            name={cert.name}
            issuer={cert.issuer}
            issued={cert.issuer}
          />
        ))}
      </Section>
      <Section title="Education">
        {data.education.map((edu) => (
          <Education
            key={edu.name}
            name={edu.name}
            duration={edu.duration}
            institution={edu.institution}
            location={edu.location}
          />
        ))}
      </Section>
    </>
  );
}
