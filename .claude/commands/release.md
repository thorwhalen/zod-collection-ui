Release a new version of zod-collection-ui.

Argument: version bump type — "patch", "minor", or "major". Default: "patch".

Steps:

1. Run `npm test` and `npm run typecheck`. If either fails, stop and fix the issues.

2. Read the current version from `package.json`.

3. Compute the new version based on the bump type argument:
   - patch: 0.0.1 → 0.0.2
   - minor: 0.0.1 → 0.1.0
   - major: 0.0.1 → 1.0.0

4. Update the `"version"` field in `package.json` to the new version.

5. Run `npm run build` to verify the build succeeds with the updated version.

6. Create a git commit with the message: `Release v{new_version}`
   Stage only `package.json`.

7. Create a git tag `v{new_version}`.

8. Push the commit and tag: `git push origin main && git push origin v{new_version}`

9. Confirm the publish workflow was triggered by checking: `gh run list --workflow publish.yml --limit 1`

10. Report: "Released v{new_version}. CI publish workflow running — check npm in ~1 minute."
