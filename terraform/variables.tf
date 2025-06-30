# Core project configuration
variable "project_id" {
  description = "The Google Cloud project ID"
  type        = string
}

variable "region" {
  description = "The Google Cloud region for resources"
  type        = string
  default     = "asia-northeast1"
}

variable "app_name" {
  description = "The application name used for resource naming"
  type        = string
  default     = "elevia"
}

# Database configuration
variable "db_tier" {
  description = "The machine type for Cloud SQL instance"
  type        = string
  default     = "db-f1-micro"

  validation {
    condition = contains([
      "db-f1-micro", "db-g1-small", "db-n1-standard-1", "db-n1-standard-2",
      "db-n1-standard-4", "db-n1-standard-8", "db-n1-standard-16",
      "db-n1-highmem-2", "db-n1-highmem-4", "db-n1-highmem-8", "db-n1-highmem-16"
    ], var.db_tier)
    error_message = "Database tier must be a valid Cloud SQL machine type."
  }
}

variable "db_name" {
  description = "The name of the database to create"
  type        = string
  default     = "elevia_db"
}

variable "db_user" {
  description = "The database user name"
  type        = string
  default     = "elevia_user"
}

variable "db_password" {
  description = "The database user password"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.db_password) >= 8
    error_message = "Database password must be at least 8 characters long."
  }
}

# NextAuth configuration
variable "nextauth_secret" {
  description = "Secret key for NextAuth.js"
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.nextauth_secret) >= 32
    error_message = "NextAuth secret must be at least 32 characters long."
  }
}

# Google OAuth configuration
variable "google_oauth_client_id" {
  description = "Google OAuth client ID for authentication"
  type        = string
  sensitive   = true
}

variable "google_oauth_client_secret" {
  description = "Google OAuth client secret for authentication"
  type        = string
  sensitive   = true
}

# Cloud Run configuration
variable "max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 10

  validation {
    condition     = var.max_instances > 0 && var.max_instances <= 100
    error_message = "Max instances must be between 1 and 100."
  }
}

variable "custom_domain" {
  description = "Custom domain for the application (optional)"
  type        = string
  default     = ""
}

# Security configuration
variable "deletion_protection" {
  description = "Enable deletion protection for Cloud SQL instance"
  type        = bool
  default     = true
}