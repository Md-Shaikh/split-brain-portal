# 🧠 Split-Brain Portal: Behavioral Cockpit & Emotion Matrix

Split-Brain Portal is a premium, high-fidelity personal cockpit that helps you log, map, analyze, and gain deep intelligence on your cognitive states, emotional valence, and the core entities (people, projects, tools) in your life. 

It syncs in real-time with a personal Google Sheet (as a secure backend database) and uses Gemini and Groq (Llama) models to extract emotional tone, key entities, and generate deep cognitive logs.

---

## 🚀 Step-by-Step Google Sheets Setup Guide

To store your logs, you need to connect the portal to a Google Sheet. Follow these steps:

### Step 1: Create Your Google Sheet
1. Open [Google Sheets](https://sheets.new) and create a new spreadsheet.
2. You can leave it empty or rename the first tab to **`SplitBrainLogs`**. 
   *(The Apps Script will automatically create the tab and headers for you if they don't exist!)*

### Step 2: Open Apps Script
1. In the top menu of your Google Sheet, click **Extensions** &rarr; **Apps Script**.
2. This will open the Google Apps Script editor in a new browser tab.

### Step 3: Copy and Paste the Script Code
1. Inside the Portal dashboard, go to the **Settings** tab.
2. Scroll to the **Google Sheets Integration Guide** and click the **Copy Apps Script Code** button (or copy the contents of `google-apps-script.js` from this codebase).
3. In the Google Apps Script editor, delete any code that is currently in `Code.gs` and paste the copied script.
4. Click the **Save** (floppy disk) icon at the top of the editor.

### Step 4: Deploy as a Web App
1. Click the blue **Deploy** button in the top right &rarr; Select **New deployment**.
2. Click the gear icon next to "Select type" and select **Web app**.
3. Configure the settings exactly as follows:
   - **Description**: `Split-Brain Sync API`
   - **Execute as**: **`Me (your-email@gmail.com)`**
   - **Who has access**: **`Anyone`** *(This is required so the frontend portal can securely send logs to it)*
4. Click **Deploy**.
5. Google will ask you to authorize access. Click **Authorize access**, choose your account, click **Advanced** (at the bottom), and click **Go to Untitled project (unsafe)**. Click **Allow**.

### Step 5: Link the URL to the Portal
1. Copy the generated **Web App URL** (it ends in `/exec`).
2. Paste it into the **Google Sheets Web App Integration URL** field in the portal's **Settings** tab.
3. Click **Sync Configuration Settings**. Your sheet is now connected!

---

## 🌐 Deploying to GitHub & Vercel (First-Time Guide)

Deploying your Split-Brain Portal to a live, secure website is free and takes less than 5 minutes. No coding tools or command line installations are needed!

### Step 1: Create a GitHub Repository
1. Go to [GitHub](https://github.com) and log in or create a free account.
2. Click the green **New** button (or go to `github.com/new`) to create a new repository.
3. Name your repository `split-brain-portal`.
4. Choose whether to make it **Public** or **Private**, then click **Create repository**.
5. You will see a "Quick setup" page. Under the section "Get started by creating a new file or uploading an existing file", click the **uploading an existing file** link.

### Step 2: Upload Portal Files
1. Drag and drop all the files from your local `split-brain-portal` folder directly into the browser box:
   - `index.html`
   - `LLMService.js`
   - `LLMService_Oracle.js`
   - `google-apps-script.js`
   - `README.md`
2. Wait for the upload progress bar to finish.
3. Scroll to the bottom of the page, type a commit message like `Initial release`, and click the green **Commit changes** button.

### Step 3: Import and Deploy on Vercel
1. Go to [Vercel](https://vercel.com) and log in using your **GitHub** account.
2. In the Vercel dashboard, click **Add New...** &rarr; **Project**.
3. Under the list of repositories, find your `split-brain-portal` repository and click **Import**.
4. Keep the default configuration options (Vercel automatically detects this as a static web portal).
5. Click **Deploy**.
6. Within a few seconds, your portal is live! Vercel will give you a public URL (e.g. `split-brain-portal.vercel.app`) to access your dashboard from any device.

---

## 🔄 How Future Upgrades Work (Zero-Configuration)

Whenever a new version of the Split-Brain Portal is released, updating your live website is extremely simple:

1. **Only Update GitHub**: Go to your GitHub repository in your web browser, click **Add file** &rarr; **Upload files**, and drag-and-drop the updated files (like `index.html` or `LLMService.js`) to overwrite the old ones. Click **Commit changes**.
2. **Auto-Deployment**: Vercel instantly detects your commit and builds/deploys the update in the background. Your live website is updated in seconds.
3. **No Setup Redo**: Since the portal stores your API Keys and Google Sheet URLs in your browser's secure **local storage** rather than hardcoding them in the files:
   - **You do NOT need to enter your API Keys or Sheets URLs again.**
   - **Your dashboard will remain fully configured and connected after the upgrade.**
   - If there is ever an update to the Google Apps Script backend, you'll simply copy the new Apps Script code from the Settings page and paste it into your existing Google Sheet's Apps Script editor (then click Deploy -> Manage Deployments -> edit the active deployment).
