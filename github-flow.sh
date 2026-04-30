#!/bin/bash

# GitHub Flow Script for Relevos App
# Follows the issue-first workflow with conventional commits

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 GitHub Flow Script for Relevos App${NC}"
echo "====================================="

# Function to display usage
usage() {
    echo "Usage: $0 [command] [args]"
    echo ""
    echo "Commands:"
    echo "  create-issue <type> <title>     - Create a GitHub issue (bug or feature)"
    echo "  create-branch <issue-number>    - Create branch from approved issue"
    echo "  create-pr <issue-number>         - Create PR from current branch"
    echo "  approve-issue <issue-number>    - Approve an issue (maintainer only)"
    echo "  check-pr                         - Validate current PR before pushing"
    echo ""
    echo "Examples:"
    echo "  $0 create-issue bug \"Seasons deletion not working\""
    echo "  $0 create-branch 123"
    echo "  $0 create-pr 123"
    echo "  $0 approve-issue 123"
}

# Function to create issue
create_issue() {
    local type="$1"
    local title="$2"
    
    if [[ -z "$type" || -z "$title" ]]; then
        echo -e "${RED}Error: Both type and title are required${NC}"
        usage
        exit 1
    fi
    
    if [[ "$type" != "bug" && "$type" != "feature" ]]; then
        echo -e "${RED}Error: Type must be 'bug' or 'feature'${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Creating $type issue: $title${NC}"
    
    # Convert title to conventional commit format
    conventional_title=$(echo "$title" | sed 's/^[A-Z]/\L&/; s/[^a-z0-9 ]//g; s/ /-/g')
    
    gh issue create \
        --template "${type}_report.yml" \
        --title "[$type:upper] $title" \
        --body "
### Pre-flight Checks
- [x] I have searched existing issues and this is not a duplicate
- [x] I understand this issue needs status:approved before a PR can be opened

### Bug Description
$title

### Steps to Reproduce
[Add steps to reproduce the issue]

### Expected Behavior
[Describe expected behavior]

### Actual Behavior  
[Describe what actually happens]

### Operating System
[Select your OS]

### Agent / Client
[Select your agent]

### Shell
[Select your shell]
" \
        --label "$type,status:needs-review"
    
    echo -e "${GREEN}✅ Issue created successfully!${NC}"
    echo "Wait for a maintainer to add 'status:approved' label before creating a branch."
}

# Function to create branch from approved issue
create_branch() {
    local issue_number="$1"
    
    if [[ -z "$issue_number" ]]; then
        echo -e "${RED}Error: Issue number is required${NC}"
        usage
        exit 1
    fi
    
    # Check if issue exists and has status:approved
    if ! gh issue view "$issue_number" --json labels --jq '.labels[] | select(.name == "status:approved")' 2>/dev/null | grep -q .; then
        echo -e "${RED}Error: Issue #$issue_number does not have 'status:approved' label${NC}"
        echo "Please wait for a maintainer to approve the issue first."
        exit 1
    fi
    
    # Get issue title for branch name
    local issue_title=$(gh issue view "$issue_number" --json title --jq '.title' | sed 's/.*\[BUG\] *//' | sed 's/.*\[FEATURE\] *//' | sed 's/^[A-Z]/\L&/; s/[^a-z0-9 ]//g; s/ /-/g')
    local branch_type=$(gh issue view "$issue_number" --json labels --jq '.labels[] | select(.name == "bug" or .name == "enhancement") | .name' | head -1)
    
    # Determine commit type based on issue type
    local commit_type="chore"
    if [[ "$branch_type" == "bug" ]]; then
        commit_type="fix"
    elif [[ "$branch_type" == "enhancement" ]]; then
        commit_type="feat"
    fi
    
    local branch_name="${commit_type}/${issue_number}-${issue_title}"
    
    echo -e "${YELLOW}Creating branch: $branch_name${NC}"
    
    # Create and switch to new branch
    git checkout -b "$branch_name"
    
    echo -e "${GREEN}✅ Branch created successfully!${NC}"
    echo "Now implement your changes and run './github-flow.sh check-pr' before committing."
}

# Function to create PR
create_pr() {
    local issue_number="$1"
    
    if [[ -z "$issue_number" ]]; then
        echo -e "${RED}Error: Issue number is required${NC}"
        usage
        exit 1
    fi
    
    # Get current branch name
    local branch_name=$(git branch --show-current)
    
    # Determine PR type from branch name
    local pr_type="type:chore"
    if [[ "$branch_name" == feat/* ]]; then
        pr_type="type:feature"
    elif [[ "$branch_name" == fix/* ]]; then
        pr_type="type:bug"
    elif [[ "$branch_name" == docs/* ]]; then
        pr_type="type:docs"
    elif [[ "$branch_name" == refactor/* ]]; then
        pr_type="type:refactor"
    fi
    
    echo -e "${YELLOW}Creating PR for branch: $branch_name${NC}"
    echo "Linking to issue #$issue_number"
    
    # Create PR with template
    gh pr create \
        --title "$(git log -1 --pretty=format:'%s')" \
        --body "$(cat .github/PULL_REQUEST_TEMPLATE.md | sed "s/Closes #[0-9]*/Closes #$issue_number/" | sed "s/| File | Change |/| File | Change |/")" \
        --label "$pr_type" \
        --assignee @me
    
    echo -e "${GREEN}✅ PR created successfully!${NC}"
    echo "Add the type label manually if not added automatically:"
    echo "gh pr edit <pr-number> --add-label \"$pr_type\""
}

# Function to approve issue (maintainer only)
approve_issue() {
    local issue_number="$1"
    
    if [[ -z "$issue_number" ]]; then
        echo -e "${RED}Error: Issue number is required${NC}"
        usage
        exit 1
    fi
    
    echo -e "${YELLOW}Approving issue #$issue_number${NC}"
    
    gh issue edit "$issue_number" --add-label "status:approved"
    
    echo -e "${GREEN}✅ Issue approved! Contributors can now create PRs linking this issue.${NC}"
}

# Function to check PR before pushing
check_pr() {
    echo -e "${YELLOW}Checking PR requirements...${NC}"
    
    # Check conventional commit format
    local commit_msg=$(git log -1 --pretty=format:"%s")
    if ! echo "$commit_msg" | grep -E '^(build|chore|ci|docs|feat|fix|perf|refactor|revert|style|test)(\([a-z0-9._-]+\))?!?: .+'; then
        echo -e "${RED}❌ Commit message does not follow conventional commits format${NC}"
        echo "Example: feat(scope): description"
        echo "         fix: description"
        exit 1
    fi
    
    # Check branch naming convention
    local branch_name=$(git branch --show-current)
    if ! echo "$branch_name" | grep -E '^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)\/[a-z0-9._-]+$'; then
        echo -e "${RED}❌ Branch name does not follow naming convention${NC}"
        echo "Valid format: type/description"
        echo "Example: feat/user-login"
        exit 1
    fi
    
    # Run shellcheck on scripts
    if [ -f "deploy.sh" ]; then
        echo -e "${YELLOW}Running shellcheck on deploy.sh...${NC}"
        if command -v shellcheck >/dev/null 2>&1; then
            shellcheck deploy.sh
            if [ $? -ne 0 ]; then
                echo -e "${RED}❌ shellcheck found issues in deploy.sh${NC}"
                exit 1
            fi
        else
            echo -e "${YELLOW}⚠️  shellcheck not installed, skipping${NC}"
        fi
    fi
    
    echo -e "${GREEN}✅ All PR checks passed!${NC}"
}

# Main script logic
case "$1" in
    create-issue)
        create_issue "$2" "$3"
        ;;
    create-branch)
        create_branch "$2"
        ;;
    create-pr)
        create_pr "$2"
        ;;
    approve-issue)
        approve_issue "$2"
        ;;
    check-pr)
        check_pr
        ;;
    *)
        usage
        ;;
esac