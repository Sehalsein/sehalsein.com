import { createFileRoute } from "@tanstack/react-router";
import type { ContributionsResponse } from "@/src/types/api";

const GITHUB_LOGIN = "sehalsein";
const QUERY = `
query ($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount weekday } }
      }
    }
  }
}`;

export const Route = createFileRoute("/api/github/contributions")({
	server: { handlers: { GET: handleContributions } },
});

async function handleContributions() {
	const token = process.env.GITHUB_TOKEN;
	if (!token) {
		return Response.json({ error: "GITHUB_TOKEN not set" }, { status: 503 });
	}

	const response = await fetch("https://api.github.com/graphql", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
			"User-Agent": "sehalsein.com",
		},
		body: JSON.stringify({ query: QUERY, variables: { login: GITHUB_LOGIN } }),
	});
	if (!response.ok) {
		return Response.json(
			{ error: `github: ${response.status} ${response.statusText}` },
			{ status: 502 },
		);
	}

	const json = await response.json() as Record<string, any>;
	const calendar = json?.data?.user?.contributionsCollection?.contributionCalendar;
	if (!calendar) {
		return Response.json({ error: "no calendar in response" }, { status: 502 });
	}

	return Response.json(
		{
			login: GITHUB_LOGIN,
			total: calendar.totalContributions,
			weeks: calendar.weeks,
		} satisfies ContributionsResponse,
		{
			headers: {
				"Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
			},
		},
	);
}
