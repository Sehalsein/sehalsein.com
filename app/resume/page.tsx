import Tag from "@/components/Tag";
import Section from "./components/Section";
import WorkExperience from "./components/WorkExperience";
import Certification from "./components/Certification";
import Education from "./components/Education";
import Profile from "./components/Profile";
import { ResumeType } from "../api/resume/route";

export default async function Page() {
  const data: ResumeType = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/resume`
  ).then((res) => res.json());

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
            <Tag key={skill.toLowerCase()}>{skill}</Tag>
          ))}
        </div>
      </div>
      <Section title="Work Experience">
        {data.experience.map((exp) => (
          <WorkExperience
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
