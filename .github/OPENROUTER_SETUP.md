# OpenRouter Setup for Claude Code Review

This repository uses OpenRouter to provide AI-powered code reviews via Claude.

## Setting Up OpenRouter API Key

### 1. Add the Secret to GitHub

Go to your repository settings and add the OpenRouter API key as a secret:

1. Navigate to: https://github.com/gwho/fed-data/settings/secrets/actions
2. Click "New repository secret"
3. Add the following secret:
   - **Name**: `OPENROUTER_API_KEY`
   - **Value**: Your OpenRouter API key (starts with `sk-or-v1-...`)

   Get your API key from: https://openrouter.ai/keys

### 2. How It Works

The Claude Code Review workflow is configured to use OpenRouter as the API provider:

- **Workflow file**: `.github/workflows/claude-code-review.yml`
- **API Endpoint**: `https://openrouter.ai/api/v1`
- **Model**: Uses Claude through OpenRouter's unified API

### 3. Features

When you open or update a pull request, the workflow will:
- ✅ Automatically review your code changes
- ✅ Provide intelligent suggestions and feedback
- ✅ Identify potential issues and improvements
- ✅ Comment directly on the PR with recommendations

### 4. Triggering Reviews

The code review runs automatically on:
- New pull requests (`opened`)
- Updated pull requests (`synchronize`)
- Reopened pull requests (`reopened`)

### 5. OpenRouter Benefits

Using OpenRouter provides:
- Access to Claude and other AI models through a single API
- Simplified billing and usage tracking
- Compatibility with Anthropic's API format
- Flexibility to switch between different models if needed

## Troubleshooting

If the workflow fails:

1. **Check the API key**: Ensure `OPENROUTER_API_KEY` is correctly set in repository secrets
2. **Verify permissions**: The workflow needs `pull-requests: write` permission
3. **Check logs**: View the Actions tab for detailed error messages
4. **OpenRouter limits**: Ensure your OpenRouter account has sufficient credits

## Links

- [OpenRouter Dashboard](https://openrouter.ai/dashboard)
- [Repository Actions](https://github.com/gwho/fed-data/actions)
- [Repository Secrets](https://github.com/gwho/fed-data/settings/secrets/actions)
