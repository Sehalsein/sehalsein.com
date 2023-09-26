import Tag from "@/components/Tag";
import Section from "./components/Section";
import WorkExperience from "./components/WorkExperience";
import Certification from "./components/Certification";
import Education from "./components/Education";

const data = {
  name: "Sehal Sein",
  email: "seinsehal@gmail.com",
  phone: "+91 9876543210",
  address: "Bangalore, India",
  summary:
    "As a full-stack developer with over 5 years of expertise, I am adept at crafting responsive web applications across various industries",
  skills: [
    "NextJS",
    "NodeJS",
    "ReactJS",
    "TypeScript",
    "Python",
    "Rest API",
    "GraphQL",
    "Postgresql",
    "AWS",
    "GCP",
    "Firebase",
  ],
  experience: [
    {
      company: "DataGPT",
      location: "Canada",
      position: "Sr Software Engineer",
      duration: {
        from: 2022,
      },
      description: [
        "Worked on full-stack development using NodeJS, React, and Python.",
        "Collaborated with cross-functional teams to deliver projects on time and within budget.",
        "Implemented new features and functionalities to improve user experience.",
        "Fixed bugs and implemented new features in the existing codebase.",
        "Worked closely with product and design teams to deliver high-quality products.",
      ],
    },
    {
      company: "DGymBook",
      duration: {
        from: 2022,
      },
      description: [
        "Developed scalable a gym management platform using Node.js & Next.js",
        "Managed CICD & Cloud infrastructure using Docker, Github Actions, AWS & GCP",
        "Optimized infrastructure to handle 50,000+ monthly users",
      ],
    },
    {
      company: "Fibonalabs",
      location: "India",
      position: "Software Engineer",
      duration: {
        from: 2021,
        to: 2022,
      },
      description: [
        "Partnered with the development team on product development, application support plans and prototype programs.",
        "Wrote highly maintainable, solid code for the software system, forming core framework and earning consistent praise from subsequent developers since initial version.",
        "Worked with software development and testing team members to design and develop robust solutions to meet client requirements for functionality, scalability and performance.",
        "Revised, modularised and updated old code bases to modern development standards, reducing operating costs and improving functionality.",
        "Orchestrated efficient large-scale software deployments.",
      ],
    },
    {
      company: "Redintegro",
      location: "India",
      position: "Software Engineer",
      duration: {
        from: 2018,
        to: 2021,
      },
      description: [
        "Built GraphQL APIs on Django Framework which served data to React Application.",
        "Managed Dev, QA and Production Cloud Environment for multiple Applications.",
        "Automated deployment of applications with Jenkins.",
        "Created procedures for system monitoring, recovery, backup and optimisation.",
        "Improved system performance by making proactive adjustments and resolving bugs.",
        "Trained and mentored junior developers and engineers, teaching skills in Software Development and improve overall team performance.",
      ],
    },
  ],
  certifications: [
    {
      name: "AWS Certified Solutions Architect – Associate",
      issuer: "Amazon Web Services (AWS)",
      issued: "Dec 2021",
    },
  ],
  education: [
    {
      name: "Masters of Computer Application",
      institution: "Presidency College",
      location: "Bangalore, India",
      duration: {
        from: 2016,
        to: 2019,
      },
    },
    {
      name: "Bachelors of Computer Application",
      institution: "St Aloysius College",
      location: "Mangalore, India",
      duration: {
        from: 2013,
        to: 2016,
      },
    },
  ],
};

export default function Page() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-bold">{data.name}</h1>
        <p>{data.summary}</p>
      </div>
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
