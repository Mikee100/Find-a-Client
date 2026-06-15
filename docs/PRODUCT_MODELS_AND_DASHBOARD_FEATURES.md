# Product Models And Dashboard Features

This document defines the core platform entities and dashboard feature set for Find a Client.

## Data models

### Developer side
- Profile: bio, skills, hourly rate, availability.
- Project: title, description, tech stack, live URL, repository URL, media.
- Testimonial: client feedback attached to a developer profile or project.
- Availability: open, not open, part-time.
- ConversationThread: discussion between a client and developer.

### Client side
- ClientProfile: company, industry, budget range.
- SavedDeveloper: developer shortlist/bookmark state.
- HiringRequest: project brief and hiring intent details.
- ConversationThread: discussion tied to a developer/hiring request.

## Developer dashboard roadmap

The developer dashboard should behave like portfolio-as-a-product.

### Core features
- Profile editor with skills tagging, hourly rate, and availability state.
- Project card creator with media upload support and live URL fields.
- Availability controls for open/not-open/part-time.
- Profile analytics: profile views, project clicks, and top-performing projects.
- Inbox and pipeline flow: inquiry -> proposal -> contract.

## Client dashboard roadmap

The client dashboard should optimize discovery and hiring.

### Core features
- Search and filtering by skill, rate, availability, and category.
- Saved and shortlisted developer list.
- Messaging threads tied to each developer.
- Project brief form with scope, budget, and timeline.
- Proposal tracker for request lifecycle.
- AI matching assistant: client describes project, system returns ranked developer matches.

## AI prompt templates

### Developer public summary
Given this developer's skills {skills}, projects {projects}, and bio {bio}, write a compelling 3-sentence public profile summary that would appeal to a client looking to hire for {project_type}.

### Client-to-developer matching
A client has described their project as: {brief}. From the following list of developer profiles {profiles}, rank the top 3 by fit and explain in one sentence why each is a good match.

### Portfolio project description helper
Help me write a short project description for my portfolio. The project is {project_name}, built with {stack}, and it solves {problem}. Write 2-3 sentences that highlight impact and technical depth.

### Proposal template generator
A developer with these skills {skills} is responding to a client brief: {brief}. Generate a professional but concise project proposal including a suggested timeline, approach, and a clarifying question.

### AI search refinement
A client typed this search query: {query}. Suggest 3 refined search filters (skills, availability, rate range) they should apply to find the best match on a developer marketplace.

## Implementation notes
- Keep ConversationThread shared across roles as a single messaging domain model.
- Start with minimal schemas and evolve via migrations as each dashboard feature is implemented.
- Ship developer and client dashboards in slices, validating API contracts with each release.
