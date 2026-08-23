export type GuestbookEntryDTO = {
	id: string;
	githubLogin: string;
	avatarUrl: string;
	message: string;
	createdAt: string;
};

export type ContributionDay = {
	date: string;
	contributionCount: number;
	weekday: number;
};

export type ContributionWeek = { contributionDays: ContributionDay[] };

export type ContributionsResponse = {
	login: string;
	total: number;
	weeks: ContributionWeek[];
};
