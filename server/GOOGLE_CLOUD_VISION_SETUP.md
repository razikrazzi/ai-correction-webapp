# Google Cloud Vision API Setup Guide

This guide will help you set up Google Cloud Vision API for handwritten text recognition in the Answer Paper Correction system.

## Prerequisites

1. A Google Cloud Platform (GCP) account
2. A GCP project with billing enabled (Vision API is a paid service)

## Step 1: Create a GCP Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable billing for your project (required for Vision API)

## Step 2: Enable Vision API

1. Navigate to **APIs & Services** > **Library**
2. Search for "Cloud Vision API"
3. Click on it and press **Enable**

## Step 3: Create a Service Account

1. Go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Fill in the details:
   - Name: `vision-api-service`
   - Description: `Service account for Vision API OCR processing`
4. Click **Create and Continue**
5. Grant the role: **Cloud Vision API User** (or **Cloud Vision API Admin**)
6. Click **Continue** and then **Done**

## Step 4: Create and Download Service Account Key

1. Click on the service account you just created
2. Go to the **Keys** tab
3. Click **Add Key** > **Create new key**
4. Select **JSON** format
5. Click **Create** - the key file will be downloaded automatically

## Step 5: Configure the Application

You have two options to configure the credentials:

### Option 1: Using GOOGLE_APPLICATION_CREDENTIALS (Recommended)

1. Save the downloaded JSON key file to your server directory (e.g., `server/google-vision-key.json`)
2. Add the path to your `.env` file:
   ```
   GOOGLE_APPLICATION_CREDENTIALS=./google-vision-key.json
   ```
3. **Important**: Add the key file to `.gitignore` to prevent committing it to version control:
   ```
   echo "google-vision-key.json" >> .gitignore
   echo "*.json" >> .gitignore  # Or be more specific
   ```

### Option 2: Using GOOGLE_CLOUD_VISION_KEY Environment Variable

1. Open the downloaded JSON key file
2. Copy its entire contents as a single-line JSON string
3. Add it to your `.env` file:
   ```
   GOOGLE_CLOUD_VISION_KEY='{"type":"service_account","project_id":"...","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'
   ```

**Note**: Option 1 is recommended as it's easier to manage and more secure.

## Step 6: Install Dependencies

The `@google-cloud/vision` package has already been added to `package.json`. Install it:

```bash
cd server
npm install
```

## Step 7: Test the Setup

1. Start your server:
   ```bash
   npm run dev
   ```

2. You should see in the console:
   ```
   Google Cloud Vision API client initialized successfully
   ```

3. If you see an error, check:
   - The credentials file path is correct
   - The service account has the correct permissions
   - Vision API is enabled in your GCP project
   - Your GCP project has billing enabled

## Pricing Information

Google Cloud Vision API pricing:
- **First 1,000 units/month**: Free
- **1,001-5,000,000 units/month**: $1.50 per 1,000 units
- **5,000,001-20,000,000 units/month**: $0.60 per 1,000 units

*1 unit = 1 page (image or PDF page)*

Check the [official pricing page](https://cloud.google.com/vision/pricing) for current rates.

## Supported File Formats

The Vision API supports:
- **Images**: JPEG, PNG, GIF, BMP, WEBP
- **PDF**: PDF files (processed page by page)
- **TIFF**: Multi-page TIFF files

## Troubleshooting

### Error: "Google Cloud Vision API client is not initialized"
- Check that `GOOGLE_APPLICATION_CREDENTIALS` or `GOOGLE_CLOUD_VISION_KEY` is set correctly
- Verify the credentials file exists and is valid JSON
- Ensure the service account has the Vision API User role

### Error: "OCR processing failed: Permission denied"
- Check that the service account has the "Cloud Vision API User" role
- Verify Vision API is enabled in your GCP project

### Error: "Billing account required"
- Enable billing in your GCP project
- The free tier includes 1,000 units per month

## Security Best Practices

1. **Never commit credentials to version control**
   - Add `*.json` (or specific key files) to `.gitignore`
   - Use environment variables in production

2. **Restrict service account permissions**
   - Only grant the minimum required permissions
   - Use "Cloud Vision API User" role instead of "Admin"

3. **Rotate keys regularly**
   - Create new keys and update your configuration
   - Delete old keys from GCP Console

4. **Use different service accounts for different environments**
   - Separate development and production credentials

## Production Deployment

For production deployments:
- Use environment variables or secret management services (AWS Secrets Manager, Azure Key Vault, etc.)
- Store credentials securely and never expose them in client-side code
- Consider using Google Cloud's built-in authentication if running on GCP infrastructure

