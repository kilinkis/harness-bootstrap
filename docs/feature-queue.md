# Feature queue archives

`feature_list.json` remains a JSON array for current work. It can retain recent completed entries until the next archival move. Normal agent startup reads only this file.

The harness reads optional `progress/feature-history/NNN.json` files in filename order, followed by `feature_list.json`. Archive filenames use three digits, such as `001.json`. Each file contains a JSON array. The directory must contain only these regular files. A missing archive directory is valid for an unsplit queue or fresh adoption. Malformed supplied history fails validation.

Move only a completed prefix of the current queue into the next archive file. Entries must have `done` or `skipped` status. Preserve every field, entry order, and existing archive file. Never copy an entry into both locations. Do not archive pending or active work. Keep each file below 20,000 bytes; target about 12,000 bytes to leave headroom. The pre-commit hook checks archives as authored files.

State, review binding, and delivery validate one combined queue. IDs must be unique across all files. Archived completed work still requires its original implementation/review reports and history evidence. The most recent completed feature still supplies approval when no feature is active. Historical bootstrap definitions and report pins remain unchanged.

Archive files remain queue evidence under the existing `progress/` digest exclusion. Moving entries does not change the implementation digest or waive validation. Stage the current queue and new archives together, verify state and binding, and include the move in review. Do not delete archives to suppress findings.

For a fresh adoption, omit this repository's archives and start with the target project's own queue and evidence. Copy `scripts/feature-queue-files.ts` with the other reusable queue validators. No archive directory or migration is required for existing unsplit projects.
