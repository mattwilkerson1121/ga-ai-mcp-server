## GA4 Automation MCP Server

This project is a **Google Analytics 4 (GA4) automation server** implemented as a
**Model Context Protocol (MCP)** tool. It lets AI agents query GA4 data
(reports, traffic sources, demographics, etc.) and also includes a simple
connection test script.

---

## 1. Prerequisites

- **Node.js** (recommended: a recent LTS, e.g. via `nvm`)
- **npm** (comes with Node)
- A **GA4 property** you have access to
- A **Google Cloud service account** with:
  - The **Analytics Data API** enabled
  - Access to your GA4 property (Viewer or higher)

---

## 2. Clone the project and install dependencies

```bash
cd /<path-to-your-projects>/ga4-automation
git clone https://github.com/mattwilkerson1121/ga-ai-mcp-server/ # or copy the folder another way
cd ga4-automation

npm install
```

*(If the repo is already on disk, just `cd /<path-to-your-project>/ga4-automation` and run `npm install`.)*

---

## 3. Create your GA4 service account key

1. Go to **Google Cloud Console → IAM & Admin → Service Accounts**.
2. Create or select a service account.
3. Under **Keys**, create a new **JSON** key and download it.
4. Save the JSON key file into the project root as:

```text
/<path-to-project-folder>/ga4-automation/credentials.json
```

5. In GA4, grant this service account email access to your property:
   - Admin → Property Access Management → Add user → paste the service account email → give at least **Viewer**.


---

## 4. Configure environment and test script

The **test script** (`test-connection.js`) uses environment variables (and `.env`)
to locate credentials and GA4 properties.

Create a `.env` file in the project root:

```bash
cd /<path-to-project-folder>/ga4-automation
cat > .env << 'EOF'
GOOGLE_APPLICATION_CREDENTIALS=/<path-to-project-folder>/ga4-automation/credentials.json
GA_PROPERTY_ID=<your-ga4-property-id>   # for multiple properties use comma‑separated list of your GA4 property IDs
EOF
```

Key variables:

- **`GOOGLE_APPLICATION_CREDENTIALS`**: absolute path to your service account JSON.
- **`GA_PROPERTY_ID`**: one or more GA4 property IDs, separated by commas.

### Run the GA4 connection test

From the project root:

```bash
cd /<path-to-project-folder>/ga4-automation
npm run test:connection
```

Expected behavior:

- For each property ID you configured, it will:
  - Run a small GA4 report
  - Print metrics like `activeUsers`, `sessions`, `screenPageViews`, `newUsers`
  - Show any permission or configuration errors with helpful hints

If you see a message like:

- `Credentials file not found` → check `GOOGLE_APPLICATION_CREDENTIALS` and file path.
- `PERMISSION_DENIED` → ensure the service account has access to the GA4 property.
- `NOT_FOUND` → the property ID is probably incorrect.

---

## 5. MCP server overview (`src/index.js`)

The main GA4 automation server is implemented in `src/index.js` as an **MCP
server over stdio** (not an HTTP server).

- It:
  - Reads the credentials file at `credentials.json` in the project root.
  - Creates a `GoogleAuth` and `BetaAnalyticsDataClient`.
  - Exposes several tools such as:
    - `query_analytics`
    - `get_realtime_data`
    - `get_traffic_sources`
    - `get_user_demographics`
    - `get_page_performance`
    - `get_conversion_data`
    - `get_custom_report`
  - Connects to an MCP client via stdin/stdout (`StdioServerTransport`).

You don’t hit this server via a browser or `curl`; instead, an MCP‑aware client
(like Claude Desktop) launches and talks to it.

---

## 6. Running the MCP server manually (for sanity checks)

From the project root:

```bash
cd /<path-to-project-folder>/ga4-automation

# Quick syntax check (no execution)
node --check src/index.js

# Start the server (will wait for MCP messages on stdin)
npm start
```

The `npm start` script is defined in `package.json` as:

```bash
NODE_OPTIONS='--no-deprecation' node src/index.js
```

If you run `npm start` in a normal terminal, it will just wait because no MCP
client is connected to its stdin/stdout. That’s expected.

---

## 7. Using the server from Claude (MCP)

This project already includes an example Claude MCP configuration. You will need to update the contents with the appropriate paths and then copy the json and add it to your Claude Desktop Configuration file (you can find the path to the file in the Claude AI Desktop App by going to settings > developer > and clicking the edit config button):

`claude-config.json`:

```json
{
  "mcpServers": {
    "ga4-analytics": {
      "command": "/Users/<your-user-name>/.nvm/versions/node/<your-node-version>/bin/node",
      "args": [
        "/<path-to-project-folder>/ga4-automation/src/index.js"
      ],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/<path-to-project-folder>/ga4-automation/credentials.json",
        "GA4_PROPERTY_ID": "<your-ga4-property-id>",
        "NODE_OPTIONS": "--no-deprecation"
      }
    }
  }
}
```

### Steps to use with Claude Desktop

1. Copy `claude-config.json` into (or merge it with) Claude’s MCP config file
   location (varies by OS; see Claude documentation).
2. Adjust all **absolute paths** to match your environment:
   - `command` (your Node binary path)
   - `args[0]` (path to `src/index.js`)
   - `GOOGLE_APPLICATION_CREDENTIALS`
   - `GA4_PROPERTY_ID` value(s)
3. Restart Claude Desktop so it picks up the new MCP server.
4. In Claude, ask something like:
   - “Use the `ga4-analytics` tool to get page performance data for the last 7
     days.”
   - "Query Analytics and show me the number of new users for 01/01/2025 to 01/31/2025"
   - "Create a table with columns containing the metric name in the header and show me the number of sessions, new 
      users, and the percentage of new users vs total users for the last 30 days in a row corresponding to the correct columns."

Claude will:

- Spawn the Node MCP server using the `command`/`args` from `claude-desktop-config.json`.
- Call the tools you defined (`get_page_performance`, etc.) to run GA4 reports.

---

## 8. Example tool payloads (conceptual)

These examples show the *shape* of the tool inputs the MCP server expects. The
actual wiring is handled by the MCP client (Claude); you normally do **not**
send this JSON manually, but this should give you an idea on how to structure your prompts in the Claude UI.

### Example: `query_analytics`

```json
{
  "propertyId": "<your-ga4-property-id>",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "dimensions": ["country", "city"],
  "metrics": ["sessions", "activeUsers"]
}
```

### Example: `get_page_performance`

```json
{
  "propertyId": "<your-ga4-property-id>",
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "limit": 50
}
```

The responses are normalized into a JSON structure containing:

- `rows`: an array of objects (dimension/metric name → value)
- `rowCount`: number of rows
- `totals`: any totals provided by GA4

---

## 9. Troubleshooting

- **`node: command not found`**
  - Install Node (e.g. `brew install node` or `nvm install --lts`) and open a
    new terminal.

- **`ENOENT: no such file or directory, open 'credentials.json'`**
  - Ensure a valid JSON key exists at:
    - `/<path-to-project-folder>/ga4-automation/credentials.json`, or
    - Update `src/index.js` to point at `credentials.json`.

- **`PERMISSION_DENIED` when running `npm run test:connection`**
  - Confirm the service account has access to the GA4 property in GA4 Admin.

- **`NOT_FOUND: Property ID`**
  - Check for typos in `GA_PROPERTY_ID` / `GA4_PROPERTY_ID`.

If you hit an error that isn’t covered here, capture the full stack trace and
logs from `npm run test:connection` or the MCP client and adjust credentials,
env vars, or GA4 access as needed.

If you continually run into errors you may need to clear the cache for the
Claude Desktop App.
