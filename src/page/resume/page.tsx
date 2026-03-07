"use client";

import Section from "@/src/view/resume/Section";
import WorkExperience from "@/src/view/resume/WorkExperience";
import Certification from "@/src/view/resume/Certification";
import Education from "@/src/view/resume/Education";
import Profile from "@/src/view/resume/Profile";
import { RESUME_DATA } from "@/src/data/resume";
import { motion } from "motion/react";
import { Download } from "lucide-react";

function getLogoClassName(company: string): string {
	const logoStyles: Record<string, string> = {
		Planned: "p-1.5 dark:bg-white",
		Ops0: "p-1.5 dark:bg-white",
		DGymBook: "p-1.5 dark:bg-white",
		"Mino Games": "dark:bg-[white] bg-[white] p-0.5",
		DataGPT: "dark:bg-[#6d69dc] bg-[#6d69dc]",
		Fibonalabs: "",
		Redintegro: "p-1.5 dark:bg-white",
	};
	return logoStyles[company] || "";
}

export default function ResumePage() {
	const data = RESUME_DATA;

	return (
		<>
			<motion.button
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.5, delay: 0.4 }}
				onClick={() => window.print()}
				className="absolute top-4 right-4 p-2.5 rounded-full bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 hover:-translate-y-0.5 hover:shadow-sm transition-all duration-200 print:hidden cursor-pointer"
				aria-label="Download resume as PDF"
			>
				<Download size={16} />
			</motion.button>

			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.5 }}
			>
				<Profile.Root>
					<Profile.Header>
						<Profile.Photo photo={data.photo} />
						<Profile.Content>
							<Profile.Name name={data.name} />
							<Profile.ContactInfo>
								<Profile.Email email={data.email} />
								<Profile.Phone phone={data.phone} />
								<Profile.SocialLinks social={data.social} />
							</Profile.ContactInfo>
						</Profile.Content>
					</Profile.Header>
					<Profile.Summary summary={data.summary} />
				</Profile.Root>
			</motion.div>

			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.5, delay: 0.1 }}
			>
				<Section title="Work Experience">
					{data.experience.map((exp, index) => (
						<motion.div
							key={exp.company}
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								duration: 0.4,
								delay: 0.2 + index * 0.1,
							}}
						>
							<WorkExperience.Root>
								<WorkExperience.Content>
									<WorkExperience.Header>
										{exp.logo && (
											<WorkExperience.Logo
												logo={exp.logo}
												company={exp.company}
												className={getLogoClassName(exp.company)}
											/>
										)}
										<WorkExperience.Info
											company={exp.company}
											position={exp.position}
											location={exp.location}
										/>
									</WorkExperience.Header>
									<WorkExperience.Duration
										from={exp.duration.from}
										to={exp.duration.to}
									/>
								</WorkExperience.Content>
							</WorkExperience.Root>
						</motion.div>
					))}
				</Section>
			</motion.div>

			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.5, delay: 0.2 }}
			>
				<Section title="Certifications">
					{data.certifications.map((cert, index) => (
						<motion.div
							key={cert.name}
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								duration: 0.4,
								delay: 0.3 + index * 0.1,
							}}
						>
							<Certification.Root>
								<Certification.Content>
									<Certification.Header>
										<Certification.Name name={cert.name} />
										<Certification.Issuer issuer={cert.issuer} />
									</Certification.Header>
									<Certification.Issued issued={cert.issued} />
								</Certification.Content>
							</Certification.Root>
						</motion.div>
					))}
				</Section>
			</motion.div>

			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.5, delay: 0.3 }}
			>
				<Section title="Education">
					{data.education.map((edu, index) => (
						<motion.div
							key={edu.name}
							initial={{ opacity: 0, y: 15 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								duration: 0.4,
								delay: 0.4 + index * 0.1,
							}}
						>
							<Education.Root>
								<Education.Content>
									<Education.Header>
										<Education.Name name={edu.name} />
										<Education.Institution
											institution={edu.institution}
											location={edu.location}
										/>
									</Education.Header>
									<Education.Duration
										from={edu.duration.from}
										to={edu.duration.to}
									/>
								</Education.Content>
							</Education.Root>
						</motion.div>
					))}
				</Section>
			</motion.div>
		</>
	);
}
