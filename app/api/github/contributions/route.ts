import { NextResponse } from "next/server";

export const revalidate = 3600;

const GITHUB_LOGIN = "sehalsein";

const QUERY = `
query ($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks {
          contributionDays {
            date
            contributionCount
            weekday
          }
        }
      }
    }
  }
}`;

type Day = {
	date: string;
	contributionCount: number;
	weekday: number;
};

type Week = { contributionDays: Day[] };

export type ContributionsResponse = {
	login: string;
	total: number;
	weeks: Week[];
};

export async function GET() {
	const token = process.env.GITHUB_TOKEN;
	if (!token) {
		return NextResponse.json(
			{ error: "GITHUB_TOKEN not set" },
			{ status: 503 },
		);
	}

	const res = await fetch("https://api.github.com/graphql", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			"User-Agent": "sehalsein.com",
		},
		body: JSON.stringify({ query: QUERY, variables: { login: GITHUB_LOGIN } }),
		next: { revalidate: 3600 },
	});

	if (!res.ok) {
		return NextResponse.json(
			{ error: `github: ${res.status} ${res.statusText}` },
			{ status: 502 },
		);
	}

	const json = await res.json();
	const calendar = json?.data?.user?.contributionsCollection?.contributionCalendar;
	if (!calendar) {
		return NextResponse.json(
			{ error: "no calendar in response", raw: json },
			{ status: 502 },
		);
	}

	const payload: ContributionsResponse = {
		login: GITHUB_LOGIN,
		total: calendar.totalContributions,
		weeks: calendar.weeks,
	};
	return NextResponse.json(payload);
}
