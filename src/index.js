import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { BetaAnalyticsDataClient } from '@google-analytics/data';
import { GoogleAuth } from 'google-auth-library';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CREDENTIALS_PATH = join(__dirname, '..', 'asidatakpiskey.json');

let analyticsClient = null;

function initializeClient() {
  if (!analyticsClient) {
    const credentials = JSON.parse(readFileSync(CREDENTIALS_PATH, 'utf8'));
    const auth = new GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/analytics.readonly'],
    });
    analyticsClient = new BetaAnalyticsDataClient({ auth });
  }
  return analyticsClient;
}

function formatReportResponse(response) {
  const rows = [];
  for (const row of response.rows || []) {
    const rowData = {};
    if (response.dimensionHeaders) {
      response.dimensionHeaders.forEach((header, index) => {
        rowData[header.name] = row.dimensionValues[index]?.value || '';
      });
    }
    if (response.metricHeaders) {
      response.metricHeaders.forEach((header, index) => {
        rowData[header.name] = row.metricValues[index]?.value || '0';
      });
    }
    rows.push(rowData);
  }
  return {
    rows,
    rowCount: response.rowCount || 0,
    totals: response.totals || [],
  };
}

const server = new Server(
  {
    name: 'ga4-analytics-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'query_analytics',
        description: 'Query Google Analytics 4 data with custom dimensions, metrics, and date ranges',
        inputSchema: {
          type: 'object',
          properties: {
            propertyId: {
              type: 'string',
              description: '325253028',
            },
            startDate: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            endDate: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
            dimensions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of dimension names (e.g., ["country", "city"])',
            },
            metrics: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of metric names (e.g., ["sessions", "users"])',
            },
          },
          required: ['propertyId', 'startDate', 'endDate', 'metrics'],
        },
      },
      {
        name: 'get_realtime_data',
        description: 'Get real-time analytics data from GA4',
        inputSchema: {
          type: 'object',
          properties: {
            propertyId: {
              type: 'string',
              description: 'GA4 property ID',
            },
            dimensions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional array of dimension names',
            },
            metrics: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of metric names for real-time data',
            },
          },
          required: ['propertyId', 'metrics'],
        },
      },
      {
        name: 'get_traffic_sources',
        description: 'Get traffic source data including channels, sources, and mediums',
        inputSchema: {
          type: 'object',
          properties: {
            propertyId: {
              type: 'string',
              description: 'GA4 property ID',
            },
            startDate: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            endDate: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
          },
          required: ['propertyId', 'startDate', 'endDate'],
        },
      },
      {
        name: 'get_user_demographics',
        description: 'Get user demographic data including age, gender, and interests',
        inputSchema: {
          type: 'object',
          properties: {
            propertyId: {
              type: 'string',
              description: 'GA4 property ID',
            },
            startDate: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            endDate: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
          },
          required: ['propertyId', 'startDate', 'endDate'],
        },
      },
      {
        name: 'get_page_performance',
        description: 'Get page performance metrics including page views, bounce rate, and time on page',
        inputSchema: {
          type: 'object',
          properties: {
            propertyId: {
              type: 'string',
              description: 'GA4 property ID',
            },
            startDate: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            endDate: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of pages to return',
              default: 50,
            },
          },
          required: ['propertyId', 'startDate', 'endDate'],
        },
      },
      {
        name: 'get_conversion_data',
        description: 'Get conversion and event data including conversion events and e-commerce metrics',
        inputSchema: {
          type: 'object',
          properties: {
            propertyId: {
              type: 'string',
              description: 'GA4 property ID',
            },
            startDate: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            endDate: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
          },
          required: ['propertyId', 'startDate', 'endDate'],
        },
      },
      {
        name: 'get_custom_report',
        description: 'Get a custom report with specified dimensions, metrics, date ranges, and filters',
        inputSchema: {
          type: 'object',
          properties: {
            propertyId: {
              type: 'string',
              description: 'GA4 property ID',
            },
            startDate: {
              type: 'string',
              description: 'Start date in YYYY-MM-DD format',
            },
            endDate: {
              type: 'string',
              description: 'End date in YYYY-MM-DD format',
            },
            dimensions: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of dimension names',
            },
            metrics: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of metric names',
            },
            dimensionFilter: {
              type: 'object',
              description: 'Optional dimension filter object',
            },
            metricFilter: {
              type: 'object',
              description: 'Optional metric filter object',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of rows to return',
            },
            offset: {
              type: 'number',
              description: 'Row offset for pagination',
            },
          },
          required: ['propertyId', 'startDate', 'endDate', 'metrics'],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    const client = initializeClient();
    const propertyId = args.propertyId;

    switch (name) {
      case 'query_analytics': {
        const [response] = await client.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [
            {
              startDate: args.startDate,
              endDate: args.endDate,
            },
          ],
          dimensions: args.dimensions?.map((d) => ({ name: d })) || [],
          metrics: args.metrics.map((m) => ({ name: m })),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatReportResponse(response), null, 2),
            },
          ],
        };
      }

      case 'get_realtime_data': {
        const [response] = await client.runRealtimeReport({
          property: `properties/${propertyId}`,
          dimensions: args.dimensions?.map((d) => ({ name: d })) || [],
          metrics: args.metrics.map((m) => ({ name: m })),
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatReportResponse(response), null, 2),
            },
          ],
        };
      }

      case 'get_traffic_sources': {
        const [response] = await client.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [
            {
              startDate: args.startDate,
              endDate: args.endDate,
            },
          ],
          dimensions: [
            { name: 'sessionDefaultChannelGroup' },
            { name: 'sessionSource' },
            { name: 'sessionMedium' },
          ],
          metrics: [
            { name: 'sessions' },
            { name: 'users' },
            { name: 'newUsers' },
            { name: 'engagementRate' },
          ],
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatReportResponse(response), null, 2),
            },
          ],
        };
      }

      case 'get_user_demographics': {
        const [response] = await client.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [
            {
              startDate: args.startDate,
              endDate: args.endDate,
            },
          ],
          dimensions: [
            { name: 'userAgeBracket' },
            { name: 'userGender' },
            { name: 'country' },
          ],
          metrics: [
            { name: 'activeUsers' },
            { name: 'newUsers' },
            { name: 'sessions' },
          ],
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatReportResponse(response), null, 2),
            },
          ],
        };
      }

      case 'get_page_performance': {
        const [response] = await client.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [
            {
              startDate: args.startDate,
              endDate: args.endDate,
            },
          ],
          dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
          metrics: [
            { name: 'screenPageViews' },
            { name: 'averageSessionDuration' },
            { name: 'bounceRate' },
            { name: 'engagementRate' },
          ],
          limit: args.limit || 50,
          orderBys: [
            {
              metric: { metricName: 'screenPageViews' },
              desc: true,
            },
          ],
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatReportResponse(response), null, 2),
            },
          ],
        };
      }

      case 'get_conversion_data': {
        const [response] = await client.runReport({
          property: `properties/${propertyId}`,
          dateRanges: [
            {
              startDate: args.startDate,
              endDate: args.endDate,
            },
          ],
          dimensions: [{ name: 'eventName' }],
          metrics: [
            { name: 'conversions' },
            { name: 'eventCount' },
            { name: 'totalRevenue' },
            { name: 'purchaseRevenue' },
          ],
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatReportResponse(response), null, 2),
            },
          ],
        };
      }

      case 'get_custom_report': {
        const requestConfig = {
          property: `properties/${propertyId}`,
          dateRanges: [
            {
              startDate: args.startDate,
              endDate: args.endDate,
            },
          ],
          dimensions: args.dimensions?.map((d) => ({ name: d })) || [],
          metrics: args.metrics.map((m) => ({ name: m })),
        };

        if (args.limit) {
          requestConfig.limit = args.limit;
        }
        if (args.offset) {
          requestConfig.offset = args.offset;
        }

        const [response] = await client.runReport(requestConfig);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(formatReportResponse(response), null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            error: error.message,
            stack: error.stack,
          }),
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(() => {
  process.exit(1);
});

