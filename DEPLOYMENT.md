# Deployment Guide

## 1. Backend Deployment (Render)

We will deploy the backend on Render because it requires system-level dependencies (`poppler-utils`) for PDF processing.

1.  **Push your code to GitHub.**
2.  **Go to the [Render Dashboard](https://dashboard.render.com/).**
3.  Click **New +** and select **Blueprint**.
4.  Connect your GitHub repository.
5.  Render will detect the `render.yaml` file in your repository.
6.  Click **Apply**.
7.  You will be prompted to enter the following environment variables:
    *   `MONGODB_URI`: Your MongoDB connection string.
    *   `GROQ_API_KEY`: Your Groq API Key.
    *   `CLIENT_URL`: The URL of your frontend (e.g., `https://your-app.vercel.app`). *You can leave this strictly as `*` for now or update it after deploying the frontend.*
8.  Click **Update/Deploy**.
9.  Wait for the deployment to finish. **Copy the backend URL** (e.g., `https://answer-paper-correction-backend.onrender.com`).

## 2. Frontend Deployment (Vercel)

1.  **Go to the [Vercel Dashboard](https://vercel.com/dashboard).**
2.  Click **Add New...** -> **Project**.
3.  Import your GitHub repository.
4.  **Configure Project:**
    *   **Root Directory:** Click `Edit` and select `client`.
    *   **Framework Preset:** It should auto-detect `Vite`.
    *   **Environment Variables:**
        *   `VITE_API_BASE_URL`: Paste the backend URL you copied from Render (e.g., `https://answer-paper-correction-backend.onrender.com`).
5.  Click **Deploy**.

## 3. Final Configuration

1.  Once the frontend is deployed, copy its URL (e.g., `https://your-project.vercel.app`).
2.  Go back to **Render Dashboard** -> **Services** -> **answer-paper-correction-backend** -> **Environment**.
3.  Update allow CORS for security (Optional):
    *   Edit `CLIENT_URL` to be your Vercel URL (e.g., `https://your-project.vercel.app`).
4.  If you change the variable, Render will redeploy automatically.

## Troubleshooting

*   **Backend Build Failed?** Check the logs. Since we use Docker, it should install `poppler-utils` automatically.
*   **Frontend API Errors?**
    *   Check the Network tab in your browser.
    *   Ensure calls are going to `https://your-backend.onrender.com/...` and NOT `localhost`.
    *   If they are going to localhost, ensure `VITE_API_BASE_URL` is set correctly in Vercel and you **Redeployed** (Environment variables usually require a redeploy to take effect in Vite apps).
