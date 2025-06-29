#!/bin/bash
  
# error handling: if an error occurs, the script will exit
set -e

# load environment variables from .env.local if it exists
if [ -f .env.local ]; then
    source .env.local
fi
  
# set variables
PROJECT_ID="${GOOGLE_CLOUD_PROJECT_ID:-}" # project id
PROJECT_NUMBER="${GOOGLE_CLOUD_PROJECT_NUMBER:-}" # project number
WORKLOAD_IDENTITY_POOL="${WORKLOAD_IDENTITY_POOL:-}" # workload identity pool
WORKLOAD_IDENTITY_PROVIDER="${WORKLOAD_IDENTITY_PROVIDER:-}" # workload identity provider
GITHUB_REPO="${GITHUB_REPO:-}" # github repository
GITHUB_OWNER="${GITHUB_OWNER:-}" # github repository owner

# log function
log() {
    echo "[INFO] $1"
}
  
log_error() {
    echo "[ERROR] $1" >&2
}
  
# 1. enable IAM Credential API
if ! gcloud services list --enabled --filter="name:iamcredentials.googleapis.com" --format="value(name)" | grep "iamcredentials.googleapis.com" >/dev/null 2>&1; then
    log "enabling IAM Credential API..."
    gcloud services enable iamcredentials.googleapis.com --project="$PROJECT_ID"
else
    log "IAM Credential API is already enabled"
fi
  
# 2. create workload identity pool
if ! gcloud iam workload-identity-pools describe $WORKLOAD_IDENTITY_POOL --location="global" --project="$PROJECT_ID" >/dev/null 2>&1; then
    log "creating workload identity pool: $WORKLOAD_IDENTITY_POOL"
    gcloud iam workload-identity-pools create $WORKLOAD_IDENTITY_POOL \
        --project="$PROJECT_ID" \
        --location="global" \
        --display-name="$WORKLOAD_IDENTITY_POOL"
else
    log "workload identity pool already exists: $WORKLOAD_IDENTITY_POOL"
fi
  
# 3. create workload identity provider
PROVIDER_STATE=$(gcloud iam workload-identity-pools providers describe $WORKLOAD_IDENTITY_PROVIDER --workload-identity-pool="$WORKLOAD_IDENTITY_POOL" --location="global" --project="$PROJECT_ID" --format="value(state)" 2>/dev/null || echo "NOT_EXISTS")
if [[ "$PROVIDER_STATE" == "NOT_EXISTS" || "$PROVIDER_STATE" == "DELETED" ]]; then
    log "creating workload identity provider: $WORKLOAD_IDENTITY_PROVIDER"
    gcloud iam workload-identity-pools providers create-oidc $WORKLOAD_IDENTITY_PROVIDER \
        --project="$PROJECT_ID" \
        --location="global" \
        --workload-identity-pool="$WORKLOAD_IDENTITY_POOL" \
        --display-name="$WORKLOAD_IDENTITY_PROVIDER" \
        --issuer-uri="https://token.actions.githubusercontent.com" \
        --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
        --attribute-condition="assertion.repository=='$GITHUB_OWNER/$GITHUB_REPO'"
else
    log "workload identity provider already exists: $WORKLOAD_IDENTITY_PROVIDER"
fi
  
# 4. grant roles to workload identity pool
log "checking roles for workload identity pool"
for role in "roles/cloudsql.admin" "roles/run.admin" "roles/storage.admin" "roles/iam.serviceAccountUser" "roles/iam.serviceAccountTokenCreator" "roles/serviceusage.serviceUsageConsumer" "roles/serviceusage.serviceUsageAdmin"; do
    if ! gcloud projects get-iam-policy $PROJECT_ID --flatten="bindings[].members" --filter="bindings.members:principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$WORKLOAD_IDENTITY_POOL/attribute.repository/$GITHUB_OWNER/$GITHUB_REPO AND bindings.role:$role" --format="value(bindings.role)" | grep "$role" >/dev/null 2>&1; then
        log "granting $role to workload identity pool: $WORKLOAD_IDENTITY_POOL"
        gcloud projects add-iam-policy-binding $PROJECT_ID \
            --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$WORKLOAD_IDENTITY_POOL/attribute.repository/$GITHUB_OWNER/$GITHUB_REPO" \
            --role="$role"
    else
        log "$role is already granted to workload identity pool: $WORKLOAD_IDENTITY_POOL"
    fi
done

# 5. verify GCS bucket exists for Terraform state
BUCKET_NAME="${BUCKET_NAME:-${PROJECT_ID}-terraform-state}"
if ! gsutil ls -b gs://$BUCKET_NAME >/dev/null 2>&1; then
    log "creating GCS bucket for Terraform state: $BUCKET_NAME"
    gsutil mb -p $PROJECT_ID -c STANDARD -l US gs://$BUCKET_NAME
    gsutil versioning set on gs://$BUCKET_NAME
    gsutil uniformbucketlevelaccess set on gs://$BUCKET_NAME
    
    # set lifecycle rule to delete non-current versions after 30 days
    cat > /tmp/lifecycle.json << EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "age": 30,
          "isLive": false
        }
      }
    ]
  }
}
EOF
    gsutil lifecycle set /tmp/lifecycle.json gs://$BUCKET_NAME
    rm /tmp/lifecycle.json
else
    log "GCS bucket already exists: $BUCKET_NAME (reusing existing bucket)"
fi
  
log "Direct Workload Identity setup completed."