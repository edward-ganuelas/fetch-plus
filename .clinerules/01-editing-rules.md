# File Editing Rules
- NEVER use `replace_in_file`.
- ALWAYS use `write_to_file` to update or create files.
- Always output the complete file content when using `write_to_file`.
- Use relative paths from the workspace root (for example: `src/app.js`).

# Strict Tool & Path Rules
- ALWAYS use relative paths from the project root (e.g., `src/request.ts`). NEVER include `d:\Projects\hila\` or drive letters in file paths.
- ALWAYS use `write_to_file` to edit files. NEVER use `replace_in_file` or `edit`.
- Output the complete updated file content inside `write_to_file`.

# File Path & Editing Rules
- ALWAYS use relative paths from the workspace root with forward slashes only (e.g., `src/requests.ts`).
- NEVER use backslashes (`\`) or drive letters (`d:\`) in any file path argument.
- If `apply_patch` fails once, immediately stop retrying `apply_patch` and use `write_to_file` with the complete updated file content instead.
