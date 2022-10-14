# Require Semver Bump

This is a GitHub Action that verifies a pull request includes a valid semver bump.

This action reads the version in the pull request and the version in the branch the PR points to and checks that the version in the pull request is higher than the base branch version.

## Inputs

| NAME           | DESCRIPTION                                                                                                                                                                         | TYPE     | REQUIRED | DEFAULT               |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | --------------------- |
| `github-token` | A GitHub token.                                                                                                                                                                     | `string` | `false`  | `${{ github.token }}` |
| `file`         | The relative path (from your project root) to the file with your version identifier in it. Do not include the initial backslash.                                                    | `string` | `true`   | `N/A`                 |
| `pattern`      | The regex pattern that should be used to parse the version from your version file. Note: because the string will be converted to a regex the backslashes need to be double escaped. | `string` | `true`   | `N/A`                 |

## Example

### Verify Python Version Bump

```yaml
name: Verify Python Version Bump

on:
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: rayepps/require-semver-bump@v1
        env:
          GITHUB_TOKEN: ${{ github.token }}
        with:
          file: version.py
          pattern: >
            VERSION = [\\'\\"](.+?)[\\'\\"]
```

### Verify Javascript Version Bump

```yaml
name: Verify Javascript Version Bump

on:
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: rayepps/require-semver-bump@v1
        env:
          GITHUB_TOKEN: ${{ github.token }}
        with:
          file: package.json
          pattern: >
            \\"version\\":\s\\"(.+?)\\"
```
