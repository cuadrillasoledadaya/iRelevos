name: Pull Request
description: Pull request template for the Relevos App
title: ""
labels: []
assignees: []
body:
  - type: textarea
    id: linked-issue
    attributes:
      label: Linked Issue
      description: Link to the approved issue this PR resolves
      placeholder: Closes #123
    validations:
      required: true
  - type: checkboxes
    id: pr-type
    attributes:
      label: PR Type (select exactly one)
      description: Choose the type that best describes this PR
      options:
        - label: Bug fix
          required: false
        - label: New feature
          required: false
        - label: Documentation only
          required: false
        - label: Code refactoring
          required: false
        - label: Maintenance/tooling
          required: false
        - label: Breaking change
          required: false
    validations:
      required: true
  - type: textarea
    id: summary
    attributes:
      label: Summary
      description: 1-3 bullet points summarizing what this PR does
      placeholder: |
        - Fixed the seasons deletion UI sync issue
        - Removed dependency on window.location.reload()
        - Improved error handling with specific messages
    validations:
      required: true
  - type: textarea
    id: changes-table
    attributes:
      label: Changes Table
      description: List the files that were changed and what was changed in each
      placeholder: |
        | File | Change |
        |------|--------|
        | `src/components/pages/AdminPage.tsx` | Fixed eliminarTemporada function to use React state updates instead of page reload |
        | `.env.example` | Added environment variables template |
        | `DEPLOYMENT.md` | Created deployment guide |
        | `vercel.json` | Added Vercel configuration |
        | `deploy.sh` | Created deployment script |
    validations:
      required: true
  - type: checkboxes
    id: test-plan
    attributes:
      label: Test Plan
      description: Check all that apply
      options:
        - label: Scripts run without errors
          required: true
        - label: Manually tested the affected functionality
          required: true
        - label: Skills load correctly in target agent
          required: true
    validations:
      required: true
  - type: checkboxes
    id: contributor-checklist
    attributes:
      label: Contributor Checklist
      description: All boxes must be checked
      options:
        - label: Linked an approved issue
          required: true
        - label: Added exactly one type:* label
          required: true
        - label: Ran shellcheck on modified scripts
          required: true
        - label: Skills tested in at least one agent
          required: true
        - label: Docs updated if behavior changed
          required: true
        - label: Conventional commit format
          required: true
        - label: No Co-Authored-By trailers
          required: true
    validations:
      required: true