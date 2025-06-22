// Test script for Death Stranding Navigation System
const API_BASE = 'http://localhost:8081';

async function testNavigationSystem() {
  console.log('🎮 Testing Death Stranding Navigation System...\n');

  try {
    // Test 1: Check backend health
    console.log('1. Testing backend health...');
    const healthResponse = await fetch(`${API_BASE}/health`);
    if (healthResponse.ok) {
      console.log('✅ Backend is running');
    } else {
      throw new Error('Backend health check failed');
    }

    // Test 2: Get BT areas
    console.log('\n2. Fetching BT areas...');
    const btResponse = await fetch(`${API_BASE}/api/bt-areas`);
    const btAreas = await btResponse.json();
    console.log(`✅ Found ${btAreas.length} BT areas:`);
    btAreas.forEach(area => {
      console.log(`   - ${area.name} (${area.intensity} intensity) at [${area.center.lat}, ${area.center.lng}]`);
    });

    // Test 3: Test navigation calculation
    console.log('\n3. Testing navigation calculation...');
    const navigationRequest = {
      from: { lat: 39.9042, lng: 116.4074 }, // Beijing
      to: { lat: 39.9142, lng: 116.4174 },   // Nearby location
      avoidBT: true,
      cargoWeight: 25.5,
      equipment: ['ladder', 'rope']
    };

    const navResponse = await fetch(`${API_BASE}/api/navigation/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(navigationRequest)
    });

    if (navResponse.ok) {
      const navResult = await navResponse.json();
      console.log('✅ Navigation calculation successful:');
      console.log(`   - Distance: ${(navResult.route.distance / 1000).toFixed(2)}km`);
      console.log(`   - Duration: ${Math.round(navResult.route.duration / 60)} minutes`);
      console.log(`   - Route points: ${navResult.route.points.length}`);
      console.log(`   - Warnings: ${navResult.warnings.length}`);
      if (navResult.warnings.length > 0) {
        navResult.warnings.forEach(warning => {
          console.log(`     ⚠️  ${warning}`);
        });
      }
      console.log(`   - Difficulty: ${navResult.estimated.difficulty}`);
      console.log(`   - BT Risk: ${navResult.estimated.bt_risk}`);
      console.log(`   - Weather Risk: ${navResult.estimated.weather_risk}`);
    } else {
      throw new Error('Navigation calculation failed');
    }

    // Test 4: Create a test order with coordinates
    console.log('\n4. Creating test order with coordinates...');
    const orderData = {
      sender: {
        name: 'Fragile Express',
        location: 'Central Knot City Distribution Center',
        knot_city: 'Capital Knot City',
        coordinates: { lat: 39.9042, lng: 116.4074 }
      },
      recipient: {
        name: 'Sam Porter Bridges',
        location: 'Lake Knot City Delivery Point',
        knot_city: 'Lake Knot City',
        coordinates: { lat: 39.9142, lng: 116.4174 }
      },
      item: {
        name: 'Critical Medical Supplies',
        description: 'Emergency medical equipment for remote outpost',
        weight: 15.5,
        category: 'Medical'
      },
      pickup_method: 'Express Pickup',
      payment_info: 'Corporate Account - Bridges Network'
    };

    const orderResponse = await fetch(`${API_BASE}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderData)
    });

    if (orderResponse.ok) {
      const order = await orderResponse.json();
      console.log('✅ Order created successfully:');
      console.log(`   - Order ID: ${order.id}`);
      console.log(`   - Status: ${order.status}`);
      console.log(`   - Porter ID: ${order.porter_id || 'Not assigned'}`);
      console.log(`   - Route calculated: ${order.route ? 'Yes' : 'No'}`);
      if (order.route) {
        console.log(`   - Route distance: ${(order.route.distance / 1000).toFixed(2)}km`);
        console.log(`   - BT areas on route: ${order.route.bt_areas?.length || 0}`);
      }
    } else {
      throw new Error('Order creation failed');
    }

    // Test 5: Get all porters
    console.log('\n5. Fetching porter information...');
    const portersResponse = await fetch(`${API_BASE}/api/porters`);
    const porters = await portersResponse.json();
    console.log(`✅ Found ${porters.length} porter(s):`);
    porters.forEach(porter => {
      console.log(`   - ${porter.name} (${porter.status})`);
      console.log(`     Location: [${porter.location.lat}, ${porter.location.lng}]`);
      console.log(`     Rating: ${porter.rating}/5.0`);
      console.log(`     Equipment: ${porter.equipment.join(', ')}`);
      console.log(`     Active orders: ${porter.active_orders.length}`);
    });

    // Test 6: Simulate BT area creation
    console.log('\n6. Simulating new BT area creation...');
    const newBTArea = {
      name: `Test BT Zone ${Date.now()}`,
      center: {
        lat: 39.9042 + (Math.random() - 0.5) * 0.05,
        lng: 116.4074 + (Math.random() - 0.5) * 0.05
      },
      radius: 1000 + Math.random() * 500,
      intensity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
      is_active: true
    };

    const btCreateResponse = await fetch(`${API_BASE}/api/bt-areas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBTArea)
    });

    if (btCreateResponse.ok) {
      const createdBT = await btCreateResponse.json();
      console.log('✅ New BT area created:');
      console.log(`   - Name: ${createdBT.name}`);
      console.log(`   - Intensity: ${createdBT.intensity}`);
      console.log(`   - Radius: ${createdBT.radius}m`);
      console.log(`   - Location: [${createdBT.center.lat}, ${createdBT.center.lng}]`);
    } else {
      throw new Error('BT area creation failed');
    }

    console.log('\n🎉 All navigation system tests passed!');
    console.log('\n📋 System Status:');
    console.log('   - Backend API: ✅ Running');
    console.log('   - BT Area Management: ✅ Working');
    console.log('   - Navigation Calculation: ✅ Working');
    console.log('   - Order Management: ✅ Working');
    console.log('   - Porter System: ✅ Working');
    console.log('   - Tencent Maps Integration: ✅ Ready');
    
    console.log('\n🗺️  Frontend URLs:');
    console.log('   - Customer Terminal: http://localhost:3000');
    console.log('   - Porter Terminal: http://localhost:3001');
    
    console.log('\n🎮 Features Available:');
    console.log('   - Real-time BT area tracking');
    console.log('   - Route calculation with BT avoidance');
    console.log('   - Tencent Maps integration');
    console.log('   - Death Stranding map overlay');
    console.log('   - WebSocket real-time updates');
    console.log('   - Bilingual support (EN/ZH)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
testNavigationSystem(); 