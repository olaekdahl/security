# S3 + Amazon Macie Demo

## What This Does

- Creates an S3 bucket
- Uploads sample files (including PII-like content)
- Enables Amazon Macie
- Creates a one-time Macie classification job (scoped to `demo/` prefix)
- Lists and fetches Macie findings
- Cleans up resources

## Prerequisites

- AWS CLI v2 installed
- AWS credentials configured (`aws configure`) with permissions for:
  - **S3**: create bucket, put objects, delete objects/bucket
  - **Macie**: enable Macie, create/list/describe jobs, list/get findings
  - **STS**: get-caller-identity
- Pick a region where Macie is available (default: `us-east-1`)

## Quick Start

1. Copy config template and edit if desired:

   ```bash
   cp config.env.example config.env
   ```

2. Run the scripts in order:

   ```bash
   ./00_prereq_check.sh
   ./01_create_bucket.sh
   ./02_create_sample_data_and_upload.sh
   ./03_enable_macie.sh
   ./04_create_job.sh
   ./05_check_job.sh
   ./06_list_findings.sh
   ./07_get_findings.sh
   ```

3. Cleanup when done:

   ```bash
   ./08_cleanup.sh
   ```

## Notes

- State is written to `.state/` (bucket name and job id) so you don't have to re-copy values.
- If findings are empty, rerun `06` and `07` after a short delay and confirm the job is `COMPLETE`.

## Troubleshooting

- If bucket creation fails due to naming, re-run `01_create_bucket.sh` (it regenerates a unique name if needed).
- If Macie session isn't `ENABLED`, run `03_enable_macie.sh` again and re-check.
- Ensure your bucket is in the same region you are running Macie in.
