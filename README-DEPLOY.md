# IBM Cloud Deployment Guide

Deploys the Influencer Intelligence Hub to **IBM Cloud Code Engine** as a Docker container,
with a persistent **IBM Cloud File Storage** volume keeping the SQLite database alive across redeploys.

---

## Prerequisites

| Tool | Install |
|---|---|
| IBM Cloud CLI | https://cloud.ibm.com/docs/cli |
| Code Engine plugin | `ibmcloud plugin install code-engine` |
| Container Registry plugin | `ibmcloud plugin install container-registry` |
| Docker (local) | https://docs.docker.com/get-docker/ |

---

## Step 1 — Log in and target a region

```bash
ibmcloud login --sso
ibmcloud target -r us-south -g Default
```

> Use `ibmcloud regions` to list available regions. `us-south` (Dallas) is the default.

---

## Step 2 — Create a Container Registry namespace

```bash
ibmcloud cr namespace-add influencer-hub
ibmcloud cr login
```

---

## Step 3 — Build and push the Docker image

Run this from the **root of the repo** (where the Dockerfile lives):

```bash
docker build -t us.icr.io/influencer-hub/app:latest .
docker push us.icr.io/influencer-hub/app:latest
```

> The build compiles the React frontend and bundles it into the image automatically.
> This takes ~3–5 minutes the first time.

---

## Step 4 — Create a Code Engine project

```bash
ibmcloud ce project create --name influencer-hub
ibmcloud ce project select --name influencer-hub
```

---

## Step 5 — Create persistent storage for the SQLite database

The SQLite file must survive container restarts. Create an IBM Cloud File Storage instance
and mount it into the container.

### 5a — Provision File Storage

```bash
# Create a Standard File Storage instance (cheapest tier)
ibmcloud resource service-instance-create influencer-hub-storage \
  ibm-file-storage standard us-south
```

### 5b — Create a Code Engine secret binding the storage

```bash
ibmcloud ce secret create \
  --name hub-storage-secret \
  --format generic \
  --from-literal DATA_DIR=/mnt/data
```

### 5c — Create the persistent volume claim

In the IBM Cloud console:
1. Go to **Code Engine → Your Project → Domain Mappings → Volumes**
2. Create a volume named `hub-data` backed by the File Storage instance above
3. Note the volume name — you'll reference it in the app deploy

> CLI-based volume creation is also available via `ibmcloud ce volumeclaim create`
> but the console flow is simpler for first-time setup.

---

## Step 6 — Upload your SQLite database

Before the first deploy, upload the existing `influencers.sqlite` to the persistent volume.

The easiest way is to run a temporary job:

```bash
# Copy the sqlite file to a location the image can reach during init
# Option A: include it in the image build (simplest for first deploy)
#   — add backend/data/influencers.sqlite back to .dockerignore exclusions temporarily,
#     rebuild the image, and the schema-bootstrap in db.js will create all tables
#     on first run with an empty database.
#
# Option B: use ibmcloud ce job to copy the file into the mounted volume.
#   See IBM docs: https://cloud.ibm.com/docs/codeengine?topic=codeengine-job-plan
```

> **Quickest path**: let the app start fresh — the schema is auto-created on boot
> (`CREATE TABLE IF NOT EXISTS`). Re-import your data using the CSV upload buttons
> in the app, or run the bulk import scripts once the app is live.

---

## Step 7 — Deploy the application

```bash
ibmcloud ce application create \
  --name influencer-hub \
  --image us.icr.io/influencer-hub/app:latest \
  --port 3001 \
  --min-scale 1 \
  --max-scale 1 \
  --cpu 0.5 \
  --memory 1G \
  --env DATA_DIR=/mnt/data \
  --mount-volume hub-data:/mnt/data
```

> `--min-scale 1` keeps one instance always running so cold starts don't affect the team.

---

## Step 8 — Get the public URL

```bash
ibmcloud ce application get --name influencer-hub --output url
```

IBM Cloud gives you a URL like:
```
https://influencer-hub.abc1defg23.us-south.codeengine.appdomain.cloud
```

Share that URL with your team — it's live over HTTPS with a valid certificate automatically.

---

## Step 9 — Configure a custom domain (optional)

If you want `hub.ibm-influencers.com` instead of the auto-generated URL:

```bash
ibmcloud ce application update \
  --name influencer-hub \
  --domain-name hub.your-ibm-domain.com
```

Then add a CNAME record in your DNS pointing to the Code Engine endpoint.

---

## Redeploying after code changes

```bash
# Rebuild and push
docker build -t us.icr.io/influencer-hub/app:latest .
docker push us.icr.io/influencer-hub/app:latest

# Trigger a rolling redeploy (zero downtime)
ibmcloud ce application update \
  --name influencer-hub \
  --image us.icr.io/influencer-hub/app:latest
```

The SQLite database on the mounted volume is untouched by redeploys.

---

## Useful commands

```bash
# View live logs
ibmcloud ce application logs --name influencer-hub --follow

# Check app status
ibmcloud ce application get --name influencer-hub

# List all apps in the project
ibmcloud ce application list

# Delete the app (does NOT delete the volume/data)
ibmcloud ce application delete --name influencer-hub
```

---

## Cost estimate (us-south, as of 2025)

| Resource | Tier | Est. monthly |
|---|---|---|
| Code Engine compute (0.5 vCPU / 1 GB, always-on) | Pay-as-you-go | ~$15–25 |
| Container Registry storage (~500 MB image) | Free tier | $0 |
| File Storage (1 GB, Standard) | Pay-as-you-go | ~$2 |
| **Total** | | **~$17–27/mo** |

Code Engine has a generous free tier (100k vCPU-seconds/month) — low-traffic internal
tools often run entirely within the free allowance.

---

## Local development (unchanged)

```bash
# Terminal 1 — backend
cd backend && node src/index.js

# Terminal 2 — frontend (hot reload)
cd frontend && npm start
```
