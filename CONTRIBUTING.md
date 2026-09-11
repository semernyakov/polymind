# Contributing to PolyMind Plugin

Thank you for your interest in contributing!

- Please be respectful and constructive in all interactions.
- [Open an issue](https://github.com/semernyakov/polymind/issues) or discussion before submitting major changes.
- Fork the repository and create a feature branch for your work.
- Submit a pull request with a clear description of your changes.
- By contributing, you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Default contribution model

For external contributors, the default and recommended workflow is fork-based collaboration.

This means:

- contributors work in their own fork of the repository
- they push only to their fork
- they open a pull request against the main repository
- they do not receive direct write access to the upstream repository by default

This is the default permission model used for non-maintainer contributors. In practice:

- no direct push to the main repository branch is granted
- PRs are reviewed before merge
- maintainers decide whether to accept or reject a contribution

### Standard contributor workflow

1. Fork the repository.
2. Clone your fork locally.
3. Create a feature branch: `git checkout -b my-change`.
4. Commit your work: `git commit -m "Describe your change"`.
5. Push the branch to your fork: `git push origin my-change`.
6. Open a PR against the upstream repository.

Example:

```bash
git clone https://github.com/your-user/polymind.git
cd polymind
git checkout -b my-change
git push origin my-change
gh pr create --repo semernyakov/polymind --base polymind --head your-user:my-change --fill
```

This workflow gives contributors a safe, review-based path to participate without granting direct write access to the main repository.

If you have questions, open an issue or contact the maintainer.
