---
inclusion: auto
description: Standard process for picking up and delivering work items from the project board.
---

# Task Workflow Process

## Project Configuration

Each project must define its task board source in `.kiro/steering/project-config.md`. Example:

```markdown
---
inclusion: auto
---
# Project Config
- Task Board: trello
- Trello Board ID: 69b1165ba2e3533c72311a7f
- GitHub Owner: al-robertson
- GitHub Repo: plynth
```

Supported values for `Task Board`: `trello` or `jira`

When using **Trello**, lists are mapped as:
- Backlog/Pending → the list containing cards to pick up
- In Progress → cards currently being worked on
- To Release → cards with PRs ready for review
- Done → completed cards

When using **Jira**, the following conventions apply:
- **Epics** represent the app/project being worked on. They are not actionable work items.
- **Stories** and **Bugs** are the actual work requests. Each is linked to an epic via the parent field.
- To retrieve all open work for an app, query: `parent = <EPIC_KEY> AND status != Done`
- To filter by type: `issuetype = Story AND parent = <EPIC_KEY>` or `issuetype = Bug AND parent = <EPIC_KEY>`

Jira statuses are mapped as:
- To Do / Backlog → issues to pick up
- In Progress → issues currently being worked on
- In Review → issues with PRs ready for review
- Done → completed issues

## Workflow Steps

### General Rule
Do not build anything unless you have 95% confidence in the requirements and approach.

### 1. Select Task
### 2. Explore the Codebase
### 3. Move Task & Create Branch
### 4. Implement
### 5. Write / Update E2E Tests
### 6. Commit, Push & PR
### 7. Prompt for Regression Tests

### 8. Prompt for Learning Module
- After creating the PR (and optionally running regression tests), ask the user:

> Want me to generate a learning module for this PR? This creates an annotated walkthrough of the changes in Annotate. (Y/N)

- **If N:** Skip to step 9.
- **If Y:** Follow the learning module generation process below.

#### Learning Module Generation Process

**Step 1: Gather PR context**
- Get the list of changed files from the PR using the GitHub API.
- Read the full content of each changed file from the feature branch.
- Read the PR title, description, and task key.

**Step 2: Generate annotated content**
- For each changed file, write a guide section that explains:
  - What the file does in the context of the project
  - What specifically changed and why
  - Any patterns, conventions, or design decisions worth noting

**Step 3: Build the module.json**
- Module ID format: `pr-{repo}-{pr-number}` (e.g. `pr-fastapi-template-42`)
- Each changed file becomes a lesson with `"view": "code"`
- Add an introductory lesson with `"view": "markdown"` summarising the PR

**Step 4: Push to annotate-modules repo**
- Use the GitHub API to create the module in `al-robertson/annotate-modules` on main.
- Update `index.json` to include the new module entry.

**Step 5: Add link to PR**
- Construct the Annotate URL and append it to the PR description.

### 9. Update Task Board
- Update the task description with a summary and PR link.
- Move the task to To Release / In Review.
