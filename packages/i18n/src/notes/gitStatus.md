# gitStatus

- From `gitStatus.label.no-access`: The git status pill. Labels for work in progress end in three periods. The prompts state what the user wants; the agent finds the repository's own conventions.
- From `gitStatus.queued.label`: An action waiting for the agent's current turn to end. The label names the wait, the hover says what pressing it does, and the hint says what it is waiting for.
- From `gitStatus.prPanel.heading`: The panel the pill's PR number opens: every pull request of the Project's branch, its checks, and a Merge button that merges on GitHub after a second press confirms. `{number}` is the pull request's number. In `branches`, `{base}` and `{head}` are branch names, never translated, and the arrow points from the branch being merged into its base.
