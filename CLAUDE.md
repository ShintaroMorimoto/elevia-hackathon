# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
- YOU MUST: Write code with t-wada's TDD(Red-Green-Refactor)
- YOU MUST: Verify existing tests pass before making changes
- YOU MUST: Verify lint pass before making changes
- YOU MUST: Run CI/CD checks before marking tasks complete
- YOU MUST: Follow semantic versioning for releases
- YOU MUST: Document breaking changes
- YOU MUST: Use feature branches for all development
- YOU MUST: Add comprehensive documentation to all public APIs
- YOU MUST: Implement error handling
- YOU MUST: Run `terraform plan` before applying infrastructure changes
- YOU MUST: Use remote state backend for Terraform state management
- YOU MUST: Follow Terraform best practices from `terraform/CLAUDE.md`

## Project Overview - OKR 達成サポートツール
### サービス名
- Elevia

### 解決したい課題
- 長期 OKR と足元の OKR の紐づけがうまくできない
- ワクワクする目標が立てられない
### 前提 (言葉の定義など)
#### OKR
- Objectives & Key Results の略
- 壮大なビジョン、高いリスク、未来志向の発想を反映する「野心的目標」。
- 7 割達成できれば上々。
##### Objectives
- 目標のこと
- 「自分は何を目指したいのか」この問いに対する答えが、目標
- 「何を」
- 野心的だが現実的 (に思えるように分解したりする)
- 70% の達成が良い
- 期限が明確
- 客観的で曖昧さがない (達成したときに誰から見ても明らか)
- 3~5 個
- 「山を登る」、「パイを 5 つ食べる」、「Y という機能を実装する」など、到達点や状態を示す表現
- 具体的かつ困難なほどパフォーマンスが高まる
##### Key Results
- 主要な結果のこと
- 目標までの到達度をどのように測ればよいか。この問いに対する答えが、マイルストーン、すなわち成果指標
- 「どのように」
- その Key Results を達成すれば Object が達成できることになる成果 (not 活動) を書く
- 定量的 (計測可能)
- 1 つの O につき、KR は 3 個ほど

### MVP の要求仕様

#### サービスコンセプト
- AIとの対話を通じて、個人の壮大な夢 (Objective) をAIによる逆算計画と長期的な視点で支援する具体的な長期計画に落とし込む、パーソナライズ・プランニングツール。
####  MVPの主要機能
* Objective 設定機能:
	 * ユーザーが「達成したい夢・目標」と「達成期限」をテキストで入力できる。
 * AI深掘り対話:
      - **形式:** 一問一答のチャット形式。浅い質問から徐々に深掘り。
      - **深度コントロール:** AIの「要約と確認」に対し、ユーザーが同意することで次の質問へ進む。
       - **終了条件:** AIが必要情報を収集したと判断して提案するか、ユーザーが「計画作成ボタン」を押す。
   * AIによるロードマップ生成機能:
     * 入力された情報に基づき、AIが達成までの年単位・四半期単位の OKR を自動で作成する。
   * 計画の編集機能:
     * AIが生成した年・四半期の OKR を、ユーザーが自由に追加・編集・削除できる。
   * メイン画面（階層リストビュー）:
	   * スマホに最適化されたシンプルなリスト形式の画面
	   * 最終目標 → 年次 OKR → 四半期 OKR へとタップして詳細確認できる


#### 要件
上記の要求をもとに作ったもの
1. 概要・目的
- ユーザーが掲げた壮大な夢 (Objective) に対し、AIが達成までのロードマップ (年/四半期の OKR) を自動生成し、長期的な視点での目標達成を支援するプランニングツール。
1. システム利用ユーザー (アクター)
 * 目標達成を目指すユーザー: 自身の夢や目標を登録し、計画を立て、進捗を管理したい個人。
3. 機能要件
システムが提供すべき具体的な機能を定義します。
3.1. ユーザーアカウント機能
 * 3.1.1. 新規登録: ユーザーがメールアドレスとパスワードもしくは Google アカウントでサービスに登録できる。
 * 3.1.2. ログイン/ログアウト: 登録済みのユーザーが認証を行い、サービスを利用開始・終了できる。
3.2. 目標 (Objective) 管理機能
 * 3.2.1. 新規目標作成:
   * ユーザーは「達成したい夢・目標（テキスト形式）」と「達成期限（年/月/日をカレンダー等で選択）」を入力し、新しい目標を登録できる。
   * 登録を完了すると、後述の「3.3. AI計画生成機能」が自動的に実行される。
 * 3.2.2. 目標一覧表示:
   * ユーザーが登録した目標を一覧で表示できる。
   * 複数の目標を登録・管理できることを想定する。
 * 3.2.3. 目標詳細表示（階層リストビュー）:
   * 特定の目標を選択すると、その詳細画面に遷移する。
   * 画面には、目標タイトル、達成期限、全体の進捗を示すプログレスバーが表示される。
   * AIまたは手動で作成された「年次 OKR」がリスト形式で表示される。
   * 各「年次 OKR」をタップすると、その年に紐づく「四半期 OKR」のリストが詳細表示される。
 * 3.2.4. 目標編集: 登録済みの目標のタイトルや達成期限を後から変更できる。
 * 3.2.5. 目標削除: 登録済みの目標と、それに紐づくすべての OKR を削除できる。
3.3. AIによる深掘り対話機能
 * 3.3.1. 対話の開始: ユーザーが新規目標を作成した後、自動的にチャット形式の対話画面に遷移する。
 * 3.3.2. 質問の提示: AIが、ユーザーの目標をパーソナライズするために必要な質問（例：動機、現状のスキル、価値観など）を順次提示する。
 * 3.3.3. 回答の入力と保存: ユーザーはテキスト形式で質問に回答する。システムは、後続の計画生成で利用するために、一連の対話履歴を保存する。
 * 3.3.4. 対話の完了: 規定の質問セットが完了すると、次の計画生成ステップに進む。
3.4. AI計画生成機能
 * 3.4.1. AIによるパーソナライズされた OKR 生成:
   * トリガー: 深掘り対話の完了時。
   * 入力: ユーザーが設定した「目標」「期限」および「深掘り対話の全履歴」。
   * 処理: 上記の全情報を基に、ユーザーに最適化されたロードマップ（年/四半期のOKR）の草案を生成する。
   * 品質担保: 生成されたOKRがOKRの原則（野心的、測定可能、期限明確）に準拠しているかAIが自己チェックし、ユーザーにレビューを促す。
3.5. OKR 管理機能
 * 3.5.1. OKR の手動での追加・編集・削除:
   * ユーザーは、AIが生成した年次・四半期の各 OKR のテキストを編集できる。
   * ユーザーは、不要な OKR を削除できる。
   * ユーザーは、任意の位置に新しい OKR を手動で追加できる。
 * 3.5.2. OKR の進捗管理:
   * 各 Key Result には目標値と現在値を入力できる数値フィールドを設ける。
   * システムが自動的に達成率（0-100%）を計算し表示する。
   * Key Results の達成率から、Objective 全体の進捗を自動算出する。
   * OKR の進捗状態は、目標全体の進捗プログレスバーに自動で反映される。
 * 3.5.3. 目標のアーカイブ機能:
   * 完了または休止状態の目標をアーカイブできる。
   * アーカイブされた目標は通常の一覧に表示されないが、検索・参照は可能。
1. 非機能要件
システムの品質や制約に関する要件を定義します。
 * 4.1. ユーザーインターフェース / ユーザー体験（UI/UX）
   * デザインはスマートフォンでの利用を最優先（スマホファースト）とする。
   * 操作に迷わない、シンプルで直感的な画面構成とする。
   * 情報の階層（目標 > 年 > 四半期）がわかりやすく表現されていること。
 * 4.2. パフォーマンス
   * 通常の画面遷移は2秒以内に完了すること。
   * AIによる計画生成には時間がかかる可能性があるため、処理中であることがユーザーにわかるローディング表示（「計画を生成中です...」など）を必ず設けること。生成完了までの目標時間は15秒以内とする。
 * 4.3. セキュリティ
   * ユーザーのパスワードは適切にハッシュ化して保存すること。
   * ユーザーが登録した目標データは、本人の許可なく他者に公開されないこと。

## Tech Stack

### Core
- **Next.js 15** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type-safe JavaScript

### Styling
- **Tailwind CSS 4** - Utility-first CSS framework
- **Shadcn/ui**

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