# 🎾 Tennis Mate - Google Sheets Setup Guide

> **Perfect guide for beginners**: No coding knowledge required!
> **Estimated time**: 5-10 minutes

---

## 📌 Table of Contents

1. [Why connect to Google Sheets?](#1-why-connect-to-google-sheets)
2. [How it works (Simple Explanation)](#2-how-it-works-simple-explanation)
3. [Step-by-Step Setup Guide](#3-step-by-step-setup-guide)
4. [Testing Connection & Getting Started](#4-testing-connection--getting-started)
5. [Troubleshooting (FAQ)](#5-troubleshooting-faq)

---

## 1. Why connect to Google Sheets?

### 💾 The Importance of Data Persistence

By default, Tennis Mate saves data in your web browser. However:

- ❌ Clearing browser cache will **erase all your match history**.
- ❌ You cannot view your records on **other devices**.
- ❌ If data is accidentally deleted, **recovery is impossible**.

### ✅ Advantages of Google Sheets Connection

| Advantage | Description |
|-----|------|
| 🔒 **Permanent Storage** | Automatically saved to Google's secure servers. |
| 📊 **Data Utilization** | Edit and analyze statistics just like an Excel file. |
| 🌍 **Access Anywhere** | Check from your smartphone, tablet, or PC. |
| 💾 **Free & Unlimited** | Utilize 15GB of Google Drive storage for free. |
| 📥 **Easy Export** | Download as Excel/CSV at any time. |
| 🔐 **Full Ownership** | Saved only to your Google account (No external servers). |

---

## 2. How it works (Simple Explanation)

### 🏤 The "Digital Post Office" System

For security reasons, the Tennis Mate app cannot directly access your Google Drive.
To solve this, we use **Google Apps Script** as a "Middleman" (Bridge).

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│  Tennis Mate    │ ──1──>  │ Google Apps      │ ──2──>  │ Google Sheets   │
│  (App)          │         │ Script           │         │ (My Sheet)      │
│                 │         │ (Digital Post)   │         │                 │
│ Writes a letter │         │ Fills it for you │         │ Record is saved │
└─────────────────┘ <──4──  └──────────────────┘ <──3──  └─────────────────┘
```

### 🔑 Key Concepts

- **Tennis Mate App**: The "Sender" of match records.
- **Apps Script**: The "Post Office" that fills the sheet on your behalf.
- **Web App URL**: The "Private PO Box Address" for this post office.
- **Google Sheets**: The "Ledger" where actual match records are stored.

💡 **In short**: When Tennis Mate sends data to the Post Office (Apps Script), it writes it into your sheet for you!

---

## 3. Step-by-Step Setup Guide

### Preparation ✅

- [ ] Google Account (Gmail)
- [ ] PC or Laptop (Mobile is not recommended for setup)
- [ ] About 5-10 minutes

---

### 🗂️ **Step 1: Prepare Google Sheets**

#### 1-1. Create a New Sheet

1. Go to [Google Sheets](https://sheets.google.com).
2. Click **+ Blank spreadsheet** in the top left.
3. Rename the sheet to something like "Tennis Mate Records".

#### 1-2. Open Apps Script Editor

1. Click **Extensions** in the top menu.
2. Click **Apps Script** from the dropdown.

![Apps Script Menu Location](./files/google%20sheets%20mode%20setting%201.png)

✅ **Success Confirmation**: The Apps Script editor will open in a new tab.

---

### 💻 **Step 2: Copy & Paste Code**

#### 2-1. Delete Existing Code

In the Apps Script editor, you will see a sample code like this:

```javascript
function myFunction() {

}
```

**Select all and delete it.** (Ctrl+A → Delete)

#### 2-2. Paste Tennis Mate Code

**Copy the entire block below** and paste it:

```javascript
/* ========================================
   Tennis Mate - Google Sheets Backend
   ======================================== */

// Column definitions (Do not edit!)
const COLS = {
  TIMESTAMP: 0,    // Col A
  DATE: 1,         // Col B
  DURATION: 2,     // Col C
  WINNER1: 3,      // Col D
  WINNER2: 4,      // Col E
  LOSER1: 5,       // Col F
  LOSER2: 6,       // Col G
  SCORE: 7,        // Col H
  WINNER_SCORE: 8, // Col I
  LOSER_SCORE: 9,  // Col J
  LOCATION: 10     // Col K
};

function getOrCreateMatchesSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName('Matches');

  if (!sheet) {
    sheet = spreadsheet.insertSheet('Matches');
    sheet.appendRow([
      'timestamp', 'date', 'duration',
      'winner1', 'winner2', 'loser1', 'loser2',
      'score', 'winner_score', 'loser_score', 'location'
    ]);

    const headerRange = sheet.getRange(1, 1, 1, 11);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#4285f4');
    headerRange.setFontColor('#ffffff');
  }

  return sheet;
}

function doGet(e) {
  try {
    const sheet = getOrCreateMatchesSheet();
    const data = sheet.getDataRange().getValues();
    const rows = data.slice(1);
    const recentRows = rows.slice(-100).reverse();

    return ContentService
      .createTextOutput(JSON.stringify(recentRows))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.tryLock(10000);

    if (!lock.hasLock()) {
      throw new Error('Another request is being processed. Please try again later.');
    }

    const sheet = getOrCreateMatchesSheet();
    const params = JSON.parse(e.postData.contents);

    const newRow = [];
    newRow[COLS.TIMESTAMP] = new Date();
    newRow[COLS.DATE] = params.date || '';
    newRow[COLS.DURATION] = params.duration || 0;
    newRow[COLS.WINNER1] = params.winner1 || '';
    newRow[COLS.WINNER2] = params.winner2 || '';
    newRow[COLS.LOSER1] = params.loser1 || '';
    newRow[COLS.LOSER2] = params.loser2 || '';
    newRow[COLS.SCORE] = params.score || '';
    newRow[COLS.WINNER_SCORE] = params.winner_score || 0;
    newRow[COLS.LOSER_SCORE] = params.loser_score || 0;
    newRow[COLS.LOCATION] = params.location || '';

    sheet.appendRow(newRow);

    return ContentService
      .createTextOutput(JSON.stringify({status: 'success'}))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({
        status: 'error',
        message: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);

  } finally {
    if (lock.hasLock()) {
      lock.releaseLock();
    }
  }
}
```

#### 2-3. Save Code

1. Click the 💾 **Save** icon or press **Ctrl+S**.
2. When prompted for a project name, enter "Tennis Mate Backend".
3. Click **OK**.

![Save Code Confirmation](./files/google%20sheets%20mode%20setting%202.png)

> 💡 **You don't need to understand the code!**
> This code simply acts as a bridge. Just copy and paste it exactly.

---

### 🚀 **Step 3: Deploy as Web App** (Most Important!)

This is the **most critical** step. Please follow closely!

#### 3-1. Open Deploy Menu

1. Click the **Deploy** button in the top right.
2. Select **New deployment**.

![Deploy Menu](./files/google%20sheets%20mode%20setting%203%20배포.png)

#### 3-2. Select Type

1. Click the **⚙️ Gear icon** ("Select type") in the top left.
2. Select **Web app**.

![Select Web App](./files/google%20sheets%20mode%20setting%204%20배포.png)

#### 3-3. Critical Settings

Enter the following in the setup screen:

| Field | Value | Description |
|-----|--------|------|
| **Description** | "Tennis Mate v1" | (Optional) |
| **Execute as** | **Me (your@email.com)** | Keep default |
| **Who has access** | ⚠️ **Anyone** | **CRITICAL! Must change to Anyone** |

![Deployment Settings](./files/google%20sheets%20mode%20setting%205%20배포.png)

> ⚠️ **Warning!**
> You **MUST** set "Who has access" to **"Anyone"**.
> If set to "Only me", the Tennis Mate app won't be able to save your data.

#### 3-4. Authorize Access

1. Click **Deploy**.
2. Click **Authorize access** when the prompt appears.
3. Select your Google Account.
4. If you see "Google hasn't verified this app":
   - Click **Advanced**.
   - Click **Go to Tennis Mate Backend (unsafe)**.
   - Click **Allow**.

![Authorization Process](./files/google%20sheets%20mode%20setting%205%20배포.png)

#### 3-5. Copy Web App URL

Once authorized:

1. A "New deployment" message will appear.
2. You will see a **Web App URL** like this:
   `https://script.google.com/macros/s/AKfycbz.../exec`
3. Click the **📋 Copy** button.

![Copy Web App URL](./files/google%20sheets%20mode%20setting%206%20배포.png)

> 💡 **URL Examples**
> - ✅ **Correct**: `https://script.google.com/macros/s/AKfycb.../exec`
> - ❌ **Incorrect**: `https://docs.google.com/spreadsheets/d/...` (That's the sheet address, not the API!)

---

## 4. Testing Connection & Getting Started

### 🔗 **Step 4: Register URL in Tennis Mate**

1. Return to the Tennis Mate app.
2. Select **📊 Google Sheets Mode**.
3. Paste your URL into the **Web App URL** field.
4. Click **Test Connection**.

### ✅ **Step 5: Start Using!**

- **If successful**: "Connection successful!" message appears.
- **First time use**: Click **"Start New Session"** to create default players and begin!

---

## 5. Troubleshooting (FAQ)

### 🔧 Common Issues

#### ❌ Q1. "Invalid response format" error
**Cause**: You edited code but didn't perform a **New deployment**.
**Fix**: Go to **Deploy → New deployment** and use the *new* URL.

#### ❌ Q2. "Connection Failed" / "403 Forbidden"
**Cause**: "Who has access" is set to "Only me".
**Fix**: Update deployment settings to **"Anyone"**.

---

**Made with ❤️ & 🎾 by Tennis Mate Team**
