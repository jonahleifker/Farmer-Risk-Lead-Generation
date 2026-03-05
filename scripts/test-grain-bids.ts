/**
 * Test script for the grain bid aggregation service.
 * Runs directly against the database to bypass auth.
 */
import { refreshGrainBids, haversineDistance } from '@/lib/grain-scraper';
import { prisma } from '@/lib/prisma';
import zipcodes from 'zipcodes';

async function main() {
    console.log('\n=== Grain Bid Aggregation Test ===\n');

    // Step 1: Refresh data from all sources
    console.log('Step 1: Refreshing grain bids from all Agricharts sources...');
    const result = await refreshGrainBids();
    console.log(`✅ Scraped ${result.sources} sources, stored ${result.totalBids} bids`);
    if (result.errors.length > 0) {
        console.log(`⚠️  Errors: ${result.errors.join(', ')}`);
    }

    // Step 2: Query for Iowa corn bids
    console.log('\nStep 2: Querying corn bids near 50010 (Ames, IA)...');
    const iowaLoc = zipcodes.lookup('50010');
    const cornBids = await prisma.grainBid.findMany({ where: { commodity: 'corn' } });
    const iowaCorn = cornBids
        .filter(b => b.lat != null && b.lon != null)
        .map(b => ({
            facility: b.facility,
            city: b.city,
            state: b.state,
            basis: b.basis,
            contract: b.futuresContract,
            distance: Math.round(haversineDistance(iowaLoc!.latitude, iowaLoc!.longitude, b.lat!, b.lon!) * 10) / 10,
        }))
        .filter(b => b.distance <= 150)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);
    console.log(`Found ${iowaCorn.length} corn bids within 150 miles of Ames, IA:`);
    iowaCorn.forEach(b => console.log(`  - ${b.facility} (${b.city}, ${b.state}) | ${b.distance} mi | Basis: ${b.basis > 0 ? '+' : ''}${b.basis.toFixed(2)} | ${b.contract}`));

    // Step 3: Query for SD soybeans
    console.log('\nStep 3: Querying soybean bids near 57401 (Aberdeen, SD)...');
    const sdLoc = zipcodes.lookup('57401');
    const sbBids = await prisma.grainBid.findMany({ where: { commodity: 'soybeans' } });
    const sdSoybeans = sbBids
        .filter(b => b.lat != null && b.lon != null)
        .map(b => ({
            facility: b.facility,
            city: b.city,
            state: b.state,
            basis: b.basis,
            contract: b.futuresContract,
            distance: Math.round(haversineDistance(sdLoc!.latitude, sdLoc!.longitude, b.lat!, b.lon!) * 10) / 10,
        }))
        .filter(b => b.distance <= 150)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);
    console.log(`Found ${sdSoybeans.length} soybean bids within 150 miles of Aberdeen, SD:`);
    sdSoybeans.forEach(b => console.log(`  - ${b.facility} (${b.city}, ${b.state}) | ${b.distance} mi | Basis: ${b.basis > 0 ? '+' : ''}${b.basis.toFixed(2)} | ${b.contract}`));

    // Step 4: Summary stats
    const totalCorn = await prisma.grainBid.count({ where: { commodity: 'corn' } });
    const totalSoy = await prisma.grainBid.count({ where: { commodity: 'soybeans' } });
    const states = await prisma.grainBid.groupBy({ by: ['state'], _count: true });
    console.log(`\n=== Summary ===`);
    console.log(`Total corn bids: ${totalCorn}`);
    console.log(`Total soybean bids: ${totalSoy}`);
    console.log(`States covered: ${states.map(s => s.state).filter(Boolean).join(', ')}`);

    await prisma.$disconnect();
}

main().catch(console.error);
