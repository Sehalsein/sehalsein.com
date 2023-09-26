import { NextResponse } from "next/server";
import { type } from "os";

const RESUME_DATA = {
  name: "Sehal Sein",
  photo: "/me.jpg",
  email: "seinsehal@gmail.com",
  phone: "+1 (514) 241 3294",
  location: "Montreal, Canada",
  social: [
    {
      name: "LinkedIn",
      url: "https://www.linkedin.com/in/sehalsein/",
    },
    {
      name: "Github",
      url: "https://www.github.com/sehalsein",
    },
  ],
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

export type ResumeType = typeof RESUME_DATA;

export async function GET() {
  return NextResponse.json(RESUME_DATA);
}
