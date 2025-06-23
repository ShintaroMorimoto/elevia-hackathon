# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Tech Stack

### Core
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript

### Styling
- **Tailwind CSS 4** - Utility-first CSS framework

### Development Tools
- **Biome** - Fast formatter and linter
- **Vitest** - Unit testing framework
- **Testing Library** - React testing utilities
- **Husky** - Git hooks
- **lint-staged** - Pre-commit linting

### Package Manager
- **pnpm** - Fast, disk space efficient package manager

## Commands

This project uses **pnpm** as the package manager. Common commands:

### Application Development
- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build for production
- `pnpm start` - Start production server
- `pnpm test` - Run tests with Vitest
- `pnpm lint` - Run Biome linter
- `pnpm format` - Format code with Biome

### Infrastructure Management
- `./scripts/init.sh` - Initialize Google Cloud Workload Identity Federation

## Project Overview
Please update this section based on your project's specific requirements and purpose.

## Code Architecture

This is a Next.js 15 template with TypeScript using the App Router pattern. The project structure follows Next.js conventions:

- Uses **Biome** (not ESLint/Prettier) for formatting and linting
- **Vitest** with React Testing Library for testing
- **Tailwind CSS 4** for styling
- **Husky** with lint-staged for pre-commit hooks that auto-format TypeScript files

## Next.js 15 App Router Best Practices

- **App Router** (Modern): File-system router using React Server Components, Suspense, Server Actions

### File Structure Conventions
```
your-project/
├── app/                     # Next.js App Router
│   ├── layout.tsx           # Root layout (required)
│   ├── page.tsx             # Home page
│   ├── loading.tsx          # Loading UI
│   ├── error.tsx            # Error UI
│   ├── not-found.tsx        # 404 page
│   ├── globals.css          # Global styles
│   ├── api/                 # API Routes (Route Handlers)
│   │   ├── auth/
│   │   ├── users/
│   │   └── [...]/
│   └── [dynamic]/
│       ├── layout.tsx       # Nested layout
│       ├── page.tsx         # Dynamic route
│       └── loading.tsx      # Route-specific loading
├── components/              # Reusable UI components
│   ├── shared/              # Common components
│   │   ├── header.tsx
│   │   ├── footer.tsx
│   │   └── ui/              # Base UI components
│   └── feature/             # Feature-specific components
│       ├── dashboard/
│       ├── auth/
│       └── [...]/
├── actions/                 # Server Actions
│   ├── auth.ts
│   ├── users.ts
│   └── [...]/
├── repository/              # Data access layer
│   ├── auth.ts
│   ├── users.ts
│   └── [...]/
├── service/                 # Business logic layer
│   ├── auth.ts
│   ├── users.ts
│   └── [...]/
├── lib/                     # Utilities and configurations
│   ├── db/                  # Database setup
│   │   ├── schema.ts        # Database schema (Drizzle)
│   │   └── index.ts         # Database connection
│   └── validations.ts       # Zod schemas
├── test/                    # Test files
│   ├── __mocks__/
│   ├── components/
│   └── [...]/
├── drizzle/                 # Drizzle ORM (if using Drizzle)
│    ├── 0000_snapshot.json  # Snapshot
│    └── _journal.json
└── auth.ts                  # Authentication config
```

### Server vs Client Components
- **Server Components** (default): Run on server, better for SEO, data fetching
- **Client Components**: Use `"use client"` directive for interactivity
- Compose Server and Client Components strategically
- Pass Server Components as children to Client Components when possible

### Data Fetching Patterns
- Use `async/await` directly in Server Components
- Avoid unnecessary Route Handlers for Server Component data
- Use Server Actions for mutations instead of API routes
- Always revalidate data after mutations with `revalidatePath()`

### Performance Optimization
- Implement proper Suspense boundaries for loading states
- Use streaming for progressive page rendering
- Leverage built-in caching mechanisms
- Optimize images with Next.js Image component
- Implement proper error boundaries

### Common Mistakes to Avoid
- Don't create Route Handlers when Server Components can fetch data directly
- Don't forget to revalidate data after Server Actions
- Don't use redirects inside try/catch blocks
- Don't overuse "use client" directive
- Avoid mixing static and dynamic rendering without purpose


## Development Tooling

- TypeScript path mapping configured with `@/*` pointing to project root
- Biome configuration uses single quotes and space indentation
- Pre-commit hooks run `biome format --write` on staged TypeScript files
- Vitest configured with jsdom environment for React component testing

## TypeScript Rules
- Type Safety: strict: true in tsconfig.json
- Null Handling: Use optional chaining ?. and nullish coalescing ??
- Imports: Use ES modules, avoid require()

### Documentation Template
```typescript
/**
 * Brief description of what the function does
 * 
 * @description Detailed explanation of the business logic and purpose
 * @param paramName - What this parameter represents
 * @returns What the function returns and why
 * @throws {ErrorType} When this error occurs
 * @example
 * ```typescript
 * // Example usage
 * const result = functionName({ key: 'value' });
 * console.log(result); // Expected output
 * ```
 * @see {@link RelatedFunction} For related functionality
 * @since 1.0.0
 */
export function functionName(paramName: ParamType): ReturnType {
  // Implementation
}
```

### Best Practice
- Type Inference: Let TypeScript infer when obvious
- Generics: Use for reusable components
- Union Types: Prefer over enums for string literals
- Utility Types: Use built-in types (Partial, Pick, Omit)


## Security and Quality Standards
### NEVER Rules (Non-negotiable)
- NEVER: Delete production data without explicit confirmation
- NEVER: Hardcode API keys, passwords, or secrets
- NEVER: Commit code with failing tests or linting errors
- NEVER: Push directly to main/master branch
- NEVER: Skip security reviews for authentication/authorization code
- NEVER: Use "any" type in TypeScript production code
- NEVER: Store secrets in Terraform state files
- NEVER: Use service account keys - use Workload Identity Federation
- NEVER: Manually modify Terraform state files

### YOU MUST Rules (Required Standards)
- YOU MUST: Write code with TDD(Red-Green-Refactor)
- YOU MUST: Verify existing tests pass before making changes
- YOU MUST: Run CI/CD checks before marking tasks complete
- YOU MUST: Follow semantic versioning for releases
- YOU MUST: Document breaking changes
- YOU MUST: Use feature branches for all development
- YOU MUST: Add comprehensive documentation to all public APIs
- YOU MUST: Implement error handling
- YOU MUST: Run `terraform plan` before applying infrastructure changes
- YOU MUST: Use remote state backend for Terraform state management
- YOU MUST: Follow Terraform best practices from `terraform/CLAUDE.md`

## Documentation and Workflows

### README.md Sections
- Project description and purpose
- Tech stack and core dependencies
- Setup and installation instructions
- Development commands
- Deployment guidelines
- Contributing guidelines

### GitHub Actions Workflows
- **Next.js CI/CD Pipeline**: 
  - Run on every pull request to main branch
  - Execute linting with Biome
  - Run unit tests with Vitest
  - Perform type checking
  - Build project to catch compilation errors

- **Terraform Infrastructure Pipeline**:
  - Plan phase: Runs on pull requests, posts plan as PR comment
  - Apply phase: Runs on merge to main branch
  - Uses Workload Identity Federation for secure Google Cloud authentication
  - Manages infrastructure state with GCS backend
  - Posts detailed logs and notifications

- **Infrastructure Management Features**:
  - Automated Terraform plan/apply workflow
  - Secure authentication without service account keys
  - State file versioning with 30-day retention
  - Comprehensive logging and PR notifications
  - Support for multiple Terraform directories via matrix strategy

### Terraform Infrastructure Guidelines
- **Directory Structure**: Place Terraform configs in `terraform/` directory
- **State Management**: Uses GCS bucket with versioning enabled
- **Authentication**: Workload Identity Federation eliminates key management
- **Workflow Configuration**: Update matrix in `.github/workflows/terraform.yml`
- **Environment Variables**: Configure in `.env.local` (see `.env.template`)
- **Initialization**: Run `./scripts/init.sh` to set up Google Cloud resources
- **Best Practices**: Follow guidelines in `terraform/CLAUDE.md`