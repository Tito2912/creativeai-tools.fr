# Deployment Guide - Newsletter Google Apps Script

## Step 1: Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet named "CreativeAI Tools Newsletter Subscriptions"
3. Note the Spreadsheet ID from the URL: `https://docs.google.com/spreadsheets/d/[SPREADSHEET_ID]/edit`

## Step 2: Create Apps Script

1. Go to [Google Apps Script](https://script.google.com)
2. Create a new project
3. Replace the default code with the content of `appscript-newsletter.js`
4. Update the `CONFIG.SPREADSHEET_ID` with your actual spreadsheet ID

## Step 3: Configure Script Properties

1. In Apps Script editor, go to Project Settings (gear icon)
2. Add the following script properties:
   - `SPREADSHEET_ID`: Your Google Sheet ID
   - `SECRET_KEY`: A random string for security (optional)

## Step 4: Deploy as Web App

1. Click "Deploy" > "New deployment"
2. Choose type: "Web app"
3. Execute as: "Me"
4. Who has access: "Anyone"
5. Click "Deploy"
6. Copy the Web App URL (you'll need this for the website)

## Step 5: Update Website Configuration

In your website's JavaScript files, update the newsletter script URL:

```javascript
const NEWSLETTER_SCRIPT_URL = 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';