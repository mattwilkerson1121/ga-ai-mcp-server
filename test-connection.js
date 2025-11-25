import { BetaAnalyticsDataClient } from '@google-analytics/data';
import dotenv from 'dotenv';

dotenv.config();

const CREDENTIALS_PATH = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'asidatakpiskey.json';
const PROPERTY_IDS = (process.env.GA_PROPERTY_ID || 'YOUR GA PROPERTY ID').split(',');

function getDateRange() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

async function testConnection() {
  try {
    // Set the credentials path as environment variable (like Python script does)
    process.env.GOOGLE_APPLICATION_CREDENTIALS = CREDENTIALS_PATH;
    
    // Initialize client without explicit auth - it will use GOOGLE_APPLICATION_CREDENTIALS
    const analyticsClient = new BetaAnalyticsDataClient();

    const { startDate, endDate } = getDateRange();
    
    console.log('🔍 Testing Google Analytics Connection...\n');
    console.log(`📅 Date Range: ${startDate} to ${endDate}\n`);

    for (const propertyId of PROPERTY_IDS) {
      const propertyIdTrimmed = propertyId.trim();
      console.log(`\n📊 Property ID: ${propertyIdTrimmed}`);
      console.log('─'.repeat(50));

      try {
        const [response] = await analyticsClient.runReport({
          property: `properties/${propertyIdTrimmed}`,
          dateRanges: [
            {
              startDate,
              endDate,
            },
          ],
          metrics: [
            { name: 'activeUsers' },
            { name: 'sessions' },
            { name: 'screenPageViews' },
            { name: 'newUsers' },
          ],
        });

        if (response.rows && response.rows.length > 0) {
          const row = response.rows[0];
          const metrics = {
            activeUsers: row.metricValues[0]?.value || '0',
            sessions: row.metricValues[1]?.value || '0',
            screenPageViews: row.metricValues[2]?.value || '0',
            newUsers: row.metricValues[3]?.value || '0',
          };

          console.log('✅ Connection successful!');
          console.log('\n📈 Metrics (Last 7 Days):');
          console.log(`   Active Users: ${parseInt(metrics.activeUsers).toLocaleString()}`);
          console.log(`   Sessions: ${parseInt(metrics.sessions).toLocaleString()}`);
          console.log(`   Page Views: ${parseInt(metrics.screenPageViews).toLocaleString()}`);
          console.log(`   New Users: ${parseInt(metrics.newUsers).toLocaleString()}`);
        } else {
          console.log('⚠️  Connection successful but no data returned for this period.');
        }
      } catch (error) {
        console.log(`❌ Error querying property ${propertyIdTrimmed}:`);
        console.log(`   ${error.message}`);
        if (error.message.includes('PERMISSION_DENIED')) {
          console.log('   → Check that the service account has access to this property.');
        } else if (error.message.includes('NOT_FOUND')) {
          console.log('   → Property ID may be incorrect.');
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Test completed!');
  } catch (error) {
    console.error('\n❌ Connection test failed:');
    console.error(`   ${error.message}`);
    if (error.code === 'ENOENT') {
      console.error(`   → Credentials file not found: ${CREDENTIALS_PATH}`);
      console.error('   → Check GOOGLE_APPLICATION_CREDENTIALS in .env file');
    } else if (error.message.includes('Unexpected token')) {
      console.error('   → Credentials file may be invalid JSON');
    }
    process.exit(1);
  }
}

testConnection();

