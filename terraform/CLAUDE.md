# Terraform Best Practices for Google Cloud

This document provides comprehensive best practices for developing with Terraform on Google Cloud Platform, based on official Google Cloud documentation.

<!-- Deployment trigger for CI/CD workflow -->

## Table of Contents

1. [General Style and Structure](#general-style-and-structure)
2. [Reusable Modules](#reusable-modules)
3. [Root Modules](#root-modules)
4. [Dependency Management](#dependency-management)
5. [Cross-Config Communication](#cross-config-communication)
6. [Working with Resources](#working-with-resources)
7. [Version Control](#version-control)
8. [Operations](#operations)
9. [Security](#security)
10. [Testing](#testing)

## General Style and Structure

### Module Structure
- Follow the [standard module structure](https://www.terraform.io/docs/modules/create.html)
- Use `main.tf` as the default file for resources
- Include a `README.md` with module documentation
- Place examples in separate subdirectories under `examples/`
- Organize resources into logical group files (e.g. `network.tf`, `instances.tf`)
- Keep module root directory clean with only `.tf` and metadata files

### Naming Conventions
- Use underscores for naming configuration objects
- Name resources descriptively (e.g. `web_server` instead of `web-server`)
- Use `main` for single-type resources for simplicity
- Use singular resource names
- Avoid repeating resource type in resource names

### Variable Best Practices
- Declare all variables in `variables.tf`
- Use clear, descriptive names with units where appropriate
- Include descriptions for all variables
- Specify variable types
- Use default values judiciously
- Only parameterize values that genuinely need flexibility

### Output Guidelines
- Organize all outputs in `outputs.tf`
- Add clear descriptions to outputs
- Output useful values, especially for shared modules
- Reference resource attributes in outputs, not input variables

### Additional Recommendations
- Use `terraform fmt` for consistent formatting
- Limit expression complexity
- Use `count` for conditional resources
- Use `for_each` for iterative resources
- Minimize custom scripts
- Protect stateful resources with deletion protection
- Publish reusable modules to appropriate registries

## Reusable Modules

### Module Design Principles

#### 1. Enable Required APIs
```hcl
module "project-services" {
  source  = "terraform-google-modules/project-factory/google//modules/project_services"
  version = "~> 12.0"
  
  project_id  = var.project_id
  enable_apis = var.enable_apis
  
  activate_apis = [
    "compute.googleapis.com",
    "pubsub.googleapis.com",
  ]
  disable_services_on_destroy = false
}
```

- Include `google_project_service` or `project_services` module to enable necessary APIs
- Provide an `enable_apis` variable with default set to `true`
- Set `disable_services_on_destroy` to `false`

#### 2. Provider and Backend Configuration
- Do not configure providers or backends within shared modules
- Use `required_providers` block to specify minimum provider versions
- Let root modules handle provider and backend configuration

#### 3. Module Interface Design
- Expose labels as a variable: `variable "labels" { default = {} }`
- Publish outputs for all defined resources
- Include a clear `OWNERS` file to identify module maintainers

#### 4. Versioning and Compatibility
- Use SemVer 2.0.0 for versioning
- Tag releases to communicate potential breaking changes
- Use version constraints when referencing modules, e.g., `version = "~> 20.0"`

#### 5. Modular Structure
- Use inline submodules for complex logic, placed in `modules/$modulename`
- Treat inline modules as private unless explicitly documented
- Use `moved` blocks when refactoring resources to prevent unnecessary recreation

### Documentation Requirements
- Clearly specify minimum provider versions
- Document any module-specific configuration options
- Provide examples of module usage
- Explain how to enable/disable optional features

## Root Modules

### Resource Limitation
- Limit resources in a single root configuration to less than 100 (ideally fewer than 50)
- Keep state files manageable and operations fast

### Directory Structure
```
terraform/
├── modules/                    # Service configurations
│   ├── network/
│   ├── compute/
│   └── storage/
├── environments/              # Environment-specific root configurations
│   ├── dev/
│   ├── qa/
│   └── prod/
└── versions.tf               # Provider version pinning
```

### Environment Management
- Use separate environment directories (dev/qa/prod)
- Use a single default Terraform workspace per environment
- Avoid multiple CLI workspaces within an environment

### Provider and Version Management
- Pin providers to minor versions in a `versions.tf` file
- Example: `version = "~> 4.0.0"`

### Variable Management
- Store variables in `terraform.tfvars`
- Avoid command-line variable definitions

### State and Output Management
- Expose useful outputs from root modules
- Use remote state to share outputs between configurations
- Check in the `.terraform.lock.hcl` dependency lock file

### Module Design
- Create reusable service modules with common inputs
- Allow environment-specific inputs to be variable

## Dependency Management

### Prefer Implicit Dependencies
- Use expression references to create dependencies instead of explicit `depends_on`
- Implicit dependencies are more efficient and provide more precise tracking of resource changes
- Only use `depends_on` when the dependency cannot be clearly expressed through references

### Reference Output Attributes for Dependencies
- When creating dependencies, reference output attributes (especially "not yet known" values)
- Avoid referencing input arguments, as they don't create meaningful dependencies
- Use output attributes like `id` to ensure proper resource creation order

### Be Explicit When Necessary
```hcl
module "module_a" {
  source = "./modules/module-a"
  root_config_file_path = local_file.generated_file.filename
  depends_on = [local_file.generated_file] # waiting for generated_file to be created
}
```

### Minimize Dependency Complexity
- Keep dependency declarations simple and clear
- Use the most direct and least complex method to establish resource dependencies

## Cross-Config Communication

### Remote State Sharing
- Use remote state backends to reference other root modules
- Preferred backends are:
  - Cloud Storage
  - Terraform Enterprise

### Data Source Usage
- Use Google Provider data sources to query non-Terraform managed resources
- Example: Retrieving default Compute Engine service accounts

### Important Cautions
- **Do not use data sources to query resources managed by another Terraform configuration**
- Avoid creating implicit dependencies between configurations
- This can cause unintended disruptions in normal Terraform operations

### General Guidance
- Configurations do not need to be in a single directory or repository
- Focus on maintaining loose coupling between Terraform configurations

## Working with Resources

### Virtual Machine Image Management
- Prefer "baking" VM images using tools like Packer in advance
- Use pre-created images for machine deployment
- Avoid using Terraform `provisioner` blocks except as a "last resort"
- Use instance metadata to provide VM configuration information

### Identity and Access Management (IAM)
- Use these IAM-related resources carefully:
  - `google_*_iam_policy`
  - `google_*_iam_binding`
  - `google_*_iam_member`

- Be cautious with `google_*_iam_policy` and `google_*_iam_binding`, as they will overwrite all existing permissions during Terraform runs
- Consider using "Google's IAM modules" for more flexible permission management

### Cloud SQL Best Practices

Cloud SQL instances require special attention in Terraform due to their long creation times and complex dependencies.

#### 1. Timeout Configuration
Cloud SQL instances can take 15-20 minutes to create. Always set appropriate timeouts:

```hcl
resource "google_sql_database_instance" "postgres" {
  # ... other configuration ...
  
  timeouts {
    create = "30m"
    update = "30m"
    delete = "30m"
  }
}
```

#### 2. Dependency Management
Explicitly declare dependencies to prevent race conditions:

```hcl
resource "google_sql_database_instance" "postgres" {
  # ... other configuration ...
  
  depends_on = [
    google_service_networking_connection.private_vpc_connection,
    google_compute_global_address.private_ip_range,
    google_project_service.apis
  ]
}
```

#### 3. Lifecycle Management
Protect production databases and handle automatic changes:

```hcl
resource "google_sql_database_instance" "postgres" {
  # ... other configuration ...
  
  lifecycle {
    prevent_destroy = true  # Prevent accidental deletion
    ignore_changes = [
      settings[0].disk_size,  # Allow automatic disk expansion
      settings[0].maintenance_version  # Allow automatic minor version updates
    ]
  }
}
```

#### 4. Environment-Specific Configuration
Use variables to customize settings by environment:

```hcl
resource "google_sql_database_instance" "postgres" {
  deletion_protection = var.environment == "production" ? true : false
  
  settings {
    tier = var.environment == "production" ? "db-custom-2-4096" : "db-f1-micro"
    deletion_protection_enabled = var.environment == "production" ? true : false
    
    backup_configuration {
      enabled = var.environment == "production" ? true : false
      # ... other backup settings ...
    }
  }
}
```

#### 5. Network Configuration Best Practices
For private IP configurations (recommended for production):

```hcl
# 1. Create global address for VPC peering
resource "google_compute_global_address" "private_ip_range" {
  name          = "private-ip-range"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 24
  network       = google_compute_network.vpc_network.id
}

# 2. Establish service networking connection
resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc_network.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_range.name]
}

# 3. Configure Cloud SQL with private IP
resource "google_sql_database_instance" "postgres" {
  settings {
    ip_configuration {
      ipv4_enabled                                  = false
      private_network                               = google_compute_network.vpc_network.id
      enable_private_path_for_google_cloud_services = true
    }
  }
  
  depends_on = [google_service_networking_connection.private_vpc_connection]
}
```

#### 6. Common Pitfalls to Avoid
- **Never** apply Cloud SQL changes without planning first
- **Don't** use short timeouts (< 20 minutes) for Cloud SQL operations
- **Avoid** creating Cloud SQL instances without proper VPC setup when using private IP
- **Don't** ignore the `deletion_protection` setting in production
- **Never** store database passwords in plain text in Terraform files

#### 7. Staged Deployment Strategy
For complex deployments, consider a staged approach:

1. **Stage 1**: VPC, Networking, Service connections
2. **Stage 2**: Cloud SQL instance (longest operation)
3. **Stage 3**: Application layer (Cloud Run, etc.)

```bash
# Deploy in stages
terraform apply -target=google_compute_network.vpc_network
terraform apply -target=google_sql_database_instance.postgres
terraform apply  # Deploy remaining resources
```

### General Resource Management
- Leverage the [Cloud Foundation Toolkit](https://cloud.google.com/foundation-toolkit) modules, which integrate best practices
- Understand that Terraform can serve as the "single source of truth" for resource configurations

## Version Control

### Git Branch Strategy
- Use `main` as the primary protected development branch
- Create feature branches like `feature/$feature_name`
- Create bug fix branches like `fix/$bugfix_name`
- Merge branches via pull requests after completing work
- Rebase branches before merging to prevent conflicts

### Repository Organization
- Organize repositories based on team boundaries
- Consider three potential repository models:
  1. Central repository (managed by platform team)
  2. Team-specific repositories
  3. Separated repositories for logical components

### Key Principles
- Separate configurations with different approval and management requirements into different source control repositories
- Allow broad visibility across engineering organization
- **Never commit secrets to version control**
- Use environment-specific branches for safe rollout strategies

### Repository Structure Examples
- Foundations repository: Manage core organizational components
- Application/team-specific repositories: Handle application-specific configurations

### Additional Recommendations
- Use Secret Manager for handling sensitive information
- Implement pull request review processes
- Maintain clear separation between environments (dev/staging/production)

## Operations

### Always Plan Before Applying
- Create an execution plan and save it to an output file
- Have infrastructure owners review the plan before applying changes
```bash
terraform plan -out=tfplan
terraform apply tfplan
```

### Implement Automated Pipelines
- Use automated tools like Jenkins, Cloud Build, or Terraform Cloud to execute Terraform commands
- Ensure consistent execution context
- Maintain reproducibility of infrastructure deployments

### Use Service Account Authentication Securely
- Inherit service account credentials from CI/CD pipeline environment
- Prefer running pipelines within Google Cloud when possible
- Use Workload Identity Federation for external pipelines
- Avoid downloading service account keys

### Manage Terraform State Carefully
- Never manually modify Terraform state files
- Use `terraform state` commands for any required changes
- Understand that state files map configurations to cloud resources

### Version Management
- Regularly review version pinning for Terraform, providers, and modules
- Consider automating version updates with tools like Dependabot

### Local Development Practices
- Use `gcloud auth application-default login` for local authentication
- Avoid downloading service account keys
- Set up command aliases for easier Terraform usage (e.g., `alias tf="terraform"`)

## Security

### Remote State Management
- Use Cloud Storage as a state backend
- Restrict bucket access to build systems and high-privilege administrators
- Use gitignore to prevent accidentally committing state files

### Secret and Credential Handling
- **Do not store secrets in plain text in the state file**
- Avoid resources that store secrets in state, such as:
  - `vault_generic_secret`
  - `tls_private_key`
  - `google_service_account_key`

### Access Control
- Implement separation of duties by isolating permissions and directories
- Use service accounts with restricted project access
- Ensure automated Terraform execution from systems with controlled user access

### Security Validation
- Run pre-apply checks using `gcloud terraform vet`
- Perform continuous security audits after `terraform apply`
- Use tools like:
  - Security Health Analytics
  - InSpec
  - Serverspec

### Sensitive Output Handling
- Mark sensitive output values as "sensitive" to prevent plain-text exposure
- Consider encrypting state files using customer-supplied encryption keys

## Testing

### Testing Strategies
1. **Start with Low-Cost Testing Methods**
   - Static analysis using `terraform validate`
   - Module integration tests
   - End-to-end environment tests

2. **Testing Approach Principles**
   - Terraform testing creates, modifies, and destroys real infrastructure, which can be time-consuming and costly
   - Test modules independently
   - Avoid sharing state between tests

### Testing Optimization Techniques
- Randomize project IDs and resource names
- Use separate test environments
- Implement thorough cleanup procedures
- Run tests in parallel
- Stage tests incrementally

### Recommended Testing Frameworks
- Google's Blueprint Test Framework
- Terratest
- Kitchen-Terraform
- InSpec

### Key Testing Recommendations
- Start small and iterative
- Use unique, randomized names to prevent conflicts
- Isolate test environments
- Ensure complete resource cleanup
- Optimize test runtime through parallel and staged execution

## GitHub Actions CI/CD Best Practices

### Workflow Optimization Principles

When designing GitHub Actions workflows for Terraform and application deployment, follow these optimization principles to avoid redundancy and improve efficiency:

#### 1. Separation of Concerns
- **PR Validation Workflow**: Focus on fast feedback and quality checks
  - Linting, type checking, unit tests
  - Application build validation
  - Docker build verification
  - Run on every pull request for immediate feedback

- **Infrastructure Workflow**: Handle Terraform-specific operations
  - Terraform plan on PRs (with automatic commenting)
  - Terraform apply on main branch merges
  - Infrastructure-only triggers (terraform/ directory changes)

- **Deployment Workflow**: Manage application deployment only
  - Trigger only on main branch push
  - Skip redundant testing (already done in PR validation)
  - Focus on build, push, and deploy operations

#### 2. Trigger Strategy
```yaml
# PR Validation - Fast feedback on every PR
on:
  pull_request:
    types: [opened, synchronize, reopened]
    branches: [main]

# Infrastructure - Only when Terraform files change
on:
  push:
    branches: [main]
    paths: ['terraform/**']
  pull_request:
    branches: [main]
    paths: ['terraform/**']

# Deployment - Only on main branch after merge
on:
  push:
    branches: [main]
```

#### 3. Avoid Common Anti-Patterns
- **Don't duplicate test execution**: If PR validation runs tests, deployment workflow shouldn't repeat them
- **Don't trigger deployment on PRs**: Use dedicated validation workflows instead
- **Don't mix concerns**: Keep infrastructure and application workflows separate
- **Don't skip Docker validation**: Include Docker build checks in PR validation for early feedback

#### 4. Resource Efficiency
- **Parallel execution**: Run independent checks in parallel within workflows
- **Minimal scope**: Each workflow should have the smallest possible scope
- **Fast feedback**: Prioritize speed in PR validation workflows
- **Conditional execution**: Use `if` conditions to skip unnecessary steps

#### 5. Security and Dependencies
- **Workload Identity Federation**: Prefer over service account keys
- **Environment-specific secrets**: Use GitHub environments for sensitive data
- **Dependency tracking**: Ensure proper job dependencies with `needs`
- **Timeout configuration**: Set appropriate timeouts for long-running operations

### Example Optimized Workflow Structure

```yaml
# .github/workflows/pr-validation.yml
# Fast, comprehensive PR validation
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup and test
        run: |
          # Fast quality checks
          pnpm install
          pnpm run lint
          pnpm run test
          pnpm run build
      - name: Docker build validation
        run: docker build --tag validation:${{ github.sha }} .

# .github/workflows/deploy.yml  
# Main branch deployment only
jobs:
  deploy:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy
        run: |
          # Skip tests (already validated in PR)
          # Focus on deployment
```

This approach ensures:
- ✅ No redundant test execution
- ✅ Fast PR feedback loops
- ✅ Clear separation of responsibilities
- ✅ Efficient resource utilization
- ✅ Maintainable CI/CD pipeline

## Additional Resources

- [Google Cloud Foundation Toolkit](https://cloud.google.com/foundation-toolkit)
- [Terraform Google Provider Documentation](https://registry.terraform.io/providers/hashicorp/google/latest/docs)
- [Google Cloud Terraform Modules](https://github.com/terraform-google-modules)
- [Terraform Best Practices Guide](https://www.terraform.io/docs/cloud/guides/recommended-practices/index.html)
- [GitHub Actions Best Practices](https://docs.github.com/en/actions/learn-github-actions/best-practices-for-github-actions)