export function buildIdeaInitialMessage(params: {
  ideaName: string;
  ideaDescription: string;
  countryCode: string;
  countryName: string;
  uniqueness: string;
}) {
  const { ideaName, ideaDescription, countryCode, countryName, uniqueness } = params;

  return `New project submission (manual):

IDEA NAME:
${ideaName || 'Untitled idea'}

TARGET LOCATION:
${countryCode} — ${countryName}

IDEA DESCRIPTION:
${ideaDescription || '(no description provided)'}

UNIQUE VALUE / WHAT MAKES IT UNIQUE:
${uniqueness || '(not specified)'}

ADDITIONAL CONTEXT:
- Created manually via UI.
- Please focus analysis and recommendations for the target market: ${countryName}.

INSTRUCTIONS FOR AI:
Please act as a product strategist and startup advisor. Provide a structured response with these sections:
1) Quick summary of the idea (1–2 sentences).
2) Top target customer segments in ${countryName}.
3) Market size / opportunity signals and what to research next.
4) Suggested 8–12 core features for an MVP.
5) Go-to-market channels and top 3 acquisition ideas tailored to ${countryName}.
6) Key risks and regulatory considerations in ${countryName}.
7) 30/60/90-day roadmap and measurable success metrics.
8) Recommended next steps and a short elevator pitch.

Reply in clear sections and use bullet points for actionable items.`;
}