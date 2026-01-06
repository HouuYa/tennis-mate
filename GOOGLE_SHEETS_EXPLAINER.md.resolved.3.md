<<<<<<< HEAD
# How Tennis Mate Connects to Google Sheets

Here is a simple explanation of how the application talks to your Google Sheet behind the scenes.

## The Big Picture

Tennis Mate runs entirely in your browser (Client-side). It cannot talk directly to the Google Sheets file in your Google Drive because of security restrictions (CORS) and authentication complexity.

To solve this, we use **Google Apps Script** as a "Bridge" or "Middleman".

```mermaid
graph LR
    A[Tennis Mate App] -- 1. Send Data (POST) --> B[Google Apps Script]
    B -- 2. Read/Write --> C[Google Sheet]
    C -- 3. Return Data --> B
    B -- 4. Response (JSON) --> A
```

## Step-by-Step Connection

1.  **Deployment**: When you deploy the Apps Script as a "Web App", Google gives you a unique URL (starts with `https://script.google.com/...`). This URL acts like a public mailbox for your specific sheet.
2.  **Request**: When you click "Save" in Tennis Mate, the app bundles your data (players, matches) into a text packages (JSON) and sends it to that URL.
3.  **The Script**: The script sits on Google's servers. It receives the package, opens the spreadsheet it is attached to, and writes the data into the cells.
4.  **Response**: Once finished, the script sends a "Success" message back to Tennis Mate, and the app updates your screen.

## Why did it hang before?

Tennis Mate is designed to show the **Player List** only when there are players to show.
-   **The Problem**: When you connected a brand new Google Sheet, it was successfully connected, but it was empty (0 players).
-   **The Result**: The app said "Connection Successful" but didn't close the setup window because it was waiting for players to exist before showing the main screen.
-   **The Fix**: We added a feature to detect this "Empty Sheet" state and give you a button to **"Start New Session"**, which automatically creates default players (Nadal, Federer, etc.) so you can enter the app immediately.

### Troubleshooting
- **"Invalid response format" Error**:
  - This usually means you haven't deployed the script updates properly.
  - **Action**: Go to **Deploy > New deployment** (do NOT just save).
  - Ensure "Who has access" is set to **"Anyone"**.
  - Copy the *new* Web App URL and paste it into Tennis Mate.
- **Connection Failed**: Ensure "Who has access" is set to "Anyone". If set to "Only me", the app cannot access it.
- **CORS Error**: The script must return properly formatted JSON. Ensure you copied the code exactly.

### Can I use my existing Google Sheet?
**YES.** You do not need to create a new sheet.
1. Keeping your existing data is fine.
2. The new script will simply start adding new columns (Location, etc.) to new rows.
3. Old rows will remain valid.
4. Just update the **Apps Script Code** attached to that sheet and **Deploy New Version**.

## ⚠️ CRITICAL: Updated Google Apps Script

To support the new **Location** and **Split Score** features, you MUST replace your existing Google Apps Script with the code below.

### 1. Code.gs

Copy this entire block and paste it into your `Code.gs` file in the Apps Script editor.

```javascript
/*
  Tennis Mate Google Sheets Backend
  Handles GET (Read) and POST (Write) requests from the web app.
*/

// CONSTANTS - Column Indices (0-based)
const COLS = {
  TIMESTAMP: 0, // A
  DATE: 1,      // B
  DURATION: 2,  // C
  WINNER1: 3,   // D
  WINNER2: 4,   // E
  LOSER1: 5,    // F
  LOSER2: 6,    // G
  SCORE: 7,     // H (Legacy format "6-4")
  WINNER_SCORE: 8, // I (New)
  LOSER_SCORE: 9,  // J (New)
  LOCATION: 10     // K (New)
};

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  // Remove header row if exists (assuming row 1 is header)
  if (data.length > 1) {
    data.shift(); 
  }

  // Format response for the app
  // output: Raw array of rows [[...], [...]]
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);
  
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    const params = JSON.parse(e.postData.contents);
    
    // Validate required fields (optional but recommended)
    // if (!params.winner1 || !params.loser1) ...

    const newRow = [];
    newRow[COLS.TIMESTAMP] = new Date();
    newRow[COLS.DATE] = params.date || '';
    newRow[COLS.DURATION] = params.duration || 0;
    newRow[COLS.WINNER1] = params.winner1 || '';
    newRow[COLS.WINNER2] = params.winner2 || '';
    newRow[COLS.LOSER1] = params.loser1 || '';
    newRow[COLS.LOSER2] = params.loser2 || '';
    newRow[COLS.SCORE] = params.score || ''; // Legacy
    newRow[COLS.WINNER_SCORE] = params.winner_score || 0; // New
    newRow[COLS.LOSER_SCORE] = params.loser_score || 0;   // New
    newRow[COLS.LOCATION] = params.location || '';        // New
    
    sheet.appendRow(newRow);
    
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success', 
      message: 'Match saved successfully'
    })).setMimeType(ContentService.MimeType.JSON);
    
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error', 
      message: e.toString()
    })).setMimeType(ContentService.MimeType.JSON);
    
  } finally {
    lock.releaseLock();
  }
}
```

### 2. Deployment Instructions (Important!)

1.  In the Apps Script Editor, click **Deploy** -> **New deployment**.
2.  Select **Type**: Web app.
3.  **Description**: "Added location and split scores".
4.  **Execute as**: `Me (your@email.com)`.
5.  **Who has access**: `Anyone`.
6.  Click **Deploy**.
7.  **Copy the newly generated URL**.
8.  Paste this new URL into Tennis Mate's **Reference Setup**.

> **Note**: Even if the URL looks the same, you MUST do "New deployment" for code changes to take effect!

=======
# How Tennis Mate Connects to Google Sheets

Here is a simple explanation of how the application talks to your Google Sheet behind the scenes.

## The Big Picture

Tennis Mate runs entirely in your browser (Client-side). It cannot talk directly to the Google Sheets file in your Google Drive because of security restrictions (CORS) and authentication complexity.

To solve this, we use **Google Apps Script** as a "Bridge" or "Middleman".

```mermaid
graph LR
    A[Tennis Mate App] -- 1. Send Data (POST) --> B[Google Apps Script]
    B -- 2. Read/Write --> C[Google Sheet]
    C -- 3. Return Data --> B
    B -- 4. Response (JSON) --> A
```

## Step-by-Step Connection

1.  **Deployment**: When you deploy the Apps Script as a "Web App", Google gives you a unique URL (starts with `https://script.google.com/...`). This URL acts like a public mailbox for your specific sheet.
2.  **Request**: When you click "Save" in Tennis Mate, the app bundles your data (players, matches) into a text packages (JSON) and sends it to that URL.
3.  **The Script**: The script sits on Google's servers. It receives the package, opens the spreadsheet it is attached to, and writes the data into the cells.
4.  **Response**: Once finished, the script sends a "Success" message back to Tennis Mate, and the app updates your screen.

## Why did it hang before?

Tennis Mate is designed to show the **Player List** only when there are players to show.
-   **The Problem**: When you connected a brand new Google Sheet, it was successfully connected, but it was empty (0 players).
-   **The Result**: The app said "Connection Successful" but didn't close the setup window because it was waiting for players to exist before showing the main screen.
-   **The Fix**: We added a feature to detect this "Empty Sheet" state and give you a button to **"Start New Session"**, which automatically creates default players (Nadal, Federer, etc.) so you can enter the app immediately.

### Troubleshooting
- **"Invalid response format" Error**:
  - This usually means you haven't deployed the script updates properly.
  - **Action**: Go to **Deploy > New deployment** (do NOT just save).
  - Ensure "Who has access" is set to **"Anyone"**.
  - Copy the *new* Web App URL and paste it into Tennis Mate.
- **Connection Failed**: Ensure "Who has access" is set to "Anyone". If set to "Only me", the app cannot access it.
- **CORS Error**: The script must return properly formatted JSON. Ensure you copied the code exactly.

### Can I use my existing Google Sheet?
**YES.** You do not need to create a new sheet.
1. Keeping your existing data is fine.
2. The new script will simply start adding new columns (Location, etc.) to new rows.
3. Old rows will remain valid.
4. Just update the **Apps Script Code** attached to that sheet and **Deploy New Version**.

## ⚠️ CRITICAL: Updated Google Apps Script

To support the new **Location** and **Split Score** features, you MUST replace your existing Google Apps Script with the code below.

### 1. Code.gs

Copy this entire block and paste it into your `Code.gs` file in the Apps Script editor.

```javascript
// Tennis Mate - Google Sheets Backend
function getOrCreateMatchesSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName('Matches');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('Matches');
    sheet.appendRow(['timestamp', 'date', 'duration', 'winner1', 'winner2', 'loser1', 'loser2', 'score', 'winner_score', 'loser_score', 'location']);
  }
  return sheet;
}

function doGet(e) {
  const sheet = getOrCreateMatchesSheet();
  const data = sheet.getDataRange().getValues();
  const rows = data.slice(1);
  const recentRows = rows.slice(-100).reverse();
  return ContentService.createTextOutput(JSON.stringify(recentRows)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const sheet = getOrCreateMatchesSheet();
  const params = JSON.parse(e.postData.contents);
  sheet.appendRow([
    new Date(),
    params.date,
    params.duration,
    params.winner1,
    params.winner2,
    params.loser1,
    params.loser2,
    params.score,
    params.winner_score,
    params.loser_score,
    params.location
  ]);
  return ContentService.createTextOutput(JSON.stringify({result: 'success'})).setMimeType(ContentService.MimeType.JSON);
}
```

### 2. Deployment Instructions (Important!)

1.  In the Apps Script Editor, click **Deploy** -> **New deployment**.
2.  Select **Type**: Web app.
3.  **Description**: "Added location and split scores".
4.  **Execute as**: `Me (your@email.com)`.
5.  **Who has access**: `Anyone`.
6.  Click **Deploy**.
7.  **Copy the newly generated URL**.
8.  Paste this new URL into Tennis Mate's **Reference Setup**.

> **Note**: Even if the URL looks the same, you MUST do "New deployment" for code changes to take effect!


>>>>>>> 5989b219f0fffe723a72a78c90eed037a19ce7bc
