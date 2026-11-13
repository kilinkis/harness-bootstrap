# Staged file size limit

Install the tracked hook once per clone with Node 24 available:

```sh
git config --local core.hooksPath .githooks
```

Check `git config --get core.hooksPath` and `.git/hooks/pre-commit` before installation. If you already have hooks, add `node scripts/check-staged-file-size.ts` to your existing pre-commit workflow instead of replacing it. Run it from the repository root. No package installation is needed for this check.

The hook checks only added, modified, renamed, or type-changed files in the index. It reads staged Git blob sizes, so unstaged edits cannot hide an oversized staged file. Exactly 20,000 bytes passes. Anything larger than 20,000 bytes fails: estimated tokens equal bytes divided by four. This is a byte heuristic, not a model tokenizer. Deletions and submodule entries are skipped. Renames are checked at their destination. Untracked and unchanged files are not scanned.

Git does not record whether an agent or a human authored a file. All authored files are therefore checked. `.gitattributes` declares machine-generated and vendored exceptions through `linguist-generated=true` or `linguist-vendored=true`. The checked-in defaults cover common lockfiles and conventional generated filenames. Add project-specific generator outputs or third-party assets using narrow paths, for example:

```gitattributes
src/api/client.ts linguist-generated=true
vendor/library/** linguist-vendored=true
```

Stage `.gitattributes` with the generated files. The check reads attributes from the index; an unstaged attribute edit does not exempt a staged file. Git's local and global attribute overrides also apply. Do not mark authored source as generated to bypass the limit. Generated-file header comments alone do not exempt files.

On failure, split code by responsibility, tests by behavior, and documentation or data by topic or logical records. Update imports, links, and data loaders. Run the relevant checks and stage every changed and new file before retrying. The hook prints these steps and every oversized path.

This local hook can be bypassed with Git options. It is a development aid, not a security boundary or a replacement for review and CI. Existing oversized files are checked when changed and staged; installation does not rewrite them.
