# Next.js Template

A modern Next.js template with TypeScript and essential development tools.

## Tech Stack

### Core
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript

### Styling
- **Tailwind CSS 4** - Utility-first CSS framework

### Development Tools
- **Biome** - Fast formatter and linter (replaces ESLint/Prettier)
- **Vitest** - Unit testing framework
- **Testing Library** - React testing utilities
- **Husky** - Git hooks for pre-commit checks
- **lint-staged** - Pre-commit linting

### Package Manager
- **pnpm** - Fast, disk space efficient package manager

## Getting Started

```bash
# Install dependencies
pnpm install

# Start development server with Turbopack
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run tests with Vitest
pnpm test

# Run Biome linter
pnpm lint

# Format code with Biome
pnpm format
```

## Features

- **App Router**: Modern Next.js routing with React Server Components
- **TypeScript**: Strict type checking enabled
- **Biome**: Single tool for formatting and linting
- **Pre-commit hooks**: Automatic code formatting on commit
- **Vitest**: Fast unit testing with jsdom environment
- **Path mapping**: `@/*` configured for clean imports

## Architecture

This template follows Next.js 15 App Router conventions:

- Server Components by default for better performance
- Client Components with `"use client"` for interactivity
- Server Actions for data mutations
- Proper error boundaries and loading states
- TypeScript strict mode with modern patterns

## AI Development Support

This project includes `CLAUDE.md` file with comprehensive guidance for AI development tools like Claude Code:

- **Tech Stack Documentation**: Detailed specifications for all technologies used
- **Code Architecture Guidelines**: Best practices for Next.js 15 App Router
- **Development Standards**: TypeScript rules, security guidelines, and quality standards
- **Project Structure**: Recommended file organization and naming conventions

The `CLAUDE.md` file serves as a reference for AI assistants to understand project conventions and maintain code quality consistency.

## Infrastructure as Code

This template includes Terraform configuration for Google Cloud deployment:

### Terraform Components
- **GitHub Actions Workflow**: Automated Terraform plan/apply on PR/merge
- **Workload Identity Federation**: Secure authentication without service account keys
- **Google Cloud Resources**: Cloud Run, Cloud SQL, Cloud Storage support
- **State Management**: GCS backend with versioning and lifecycle policies

### Setup Instructions
1. Copy `.env.template` to `.env.local` and configure:
   ```bash
   GOOGLE_CLOUD_PROJECT_ID=your-project-id
   GOOGLE_CLOUD_PROJECT_NUMBER=your-project-number
   WORKLOAD_IDENTITY_POOL=github-actions
   WORKLOAD_IDENTITY_PROVIDER=github
   GITHUB_REPO=your-repo-name
   GITHUB_OWNER=your-github-username
   ```

2. Run the initialization script:
   ```bash
   chmod +x scripts/init.sh
   ./scripts/init.sh
   ```

3. Update Terraform configuration in `terraform/` directory
4. Update workflow matrix in `.github/workflows/terraform.yml` with your Terraform directory

### Terraform Features
- **Automated Planning**: Plans are posted as PR comments
- **Secure Apply**: Workload Identity Federation eliminates key management
- **State Versioning**: 30-day retention for state file versions
- **Comprehensive Logging**: Detailed apply logs with notifications

## CI/CD Pipeline

This project includes GitHub Actions workflows for automated quality assurance:

### Next.js Application Validation
- **Trigger**: Runs on pull requests to main branch
- **Node.js**: Uses Node.js 18 with pnpm caching
- **Quality Checks**:
  - Code linting with Biome
  - TypeScript type checking
  - Unit tests with Vitest
  - Production build verification

### Terraform Infrastructure Management
- **Plan Phase**: Runs on pull requests, posts plan output as comments
- **Apply Phase**: Runs on merge to main, applies infrastructure changes
- **Security**: Uses Workload Identity Federation for Google Cloud authentication
- **Notifications**: Posts apply status to original PR and workflow summary

Both workflows ensure code and infrastructure changes meet quality standards before deployment.