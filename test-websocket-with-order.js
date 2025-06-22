const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8081/ws');

ws.on('open', function open() {
  console.log('WebSocket connection opened');
  
  // Identify as Sam Porter Bridges
  const identifyMessage = {
    type: 'identify_porter',
    payload: '550e8400-e29b-41d4-a716-446655440000'
  };
  
  console.log('Sending identification:', identifyMessage);
  ws.send(JSON.stringify(identifyMessage));
  
  // Create a test order after a short delay
  setTimeout(() => {
    console.log('Creating test order...');
    
    // Use child_process to call curl instead of node-fetch
    const { exec } = require('child_process');
    const curlCommand = `curl -X POST http://localhost:8081/api/orders \\
      -H "Content-Type: application/json" \\
      -d '{
        "sender": {
          "name": "WebSocket Test Sender",
          "location": "Central Knot City",
          "knot_city": "Central Knot City"
        },
        "recipient": {
          "name": "WebSocket Test Recipient", 
          "location": "Lake Knot City",
          "knot_city": "Lake Knot City"
        },
        "item": {
          "name": "WebSocket Test Package",
          "description": "Testing WebSocket delivery",
          "weight": 3.0,
          "category": "Emergency"
        },
        "pickup_method": "Direct Pickup",
        "payment_info": "Prepaid"
      }'`;
    
    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('Error creating order:', error);
      } else {
        console.log('Order created:', JSON.parse(stdout));
      }
    });
  }, 2000);
});

ws.on('message', function message(data) {
  console.log('✅ Received WebSocket message:', JSON.parse(data.toString()));
});

ws.on('error', function error(err) {
  console.error('WebSocket error:', err);
});

ws.on('close', function close() {
  console.log('WebSocket connection closed');
});

// Keep the process alive for testing
setTimeout(() => {
  console.log('Test completed');
  ws.close();
  process.exit(0);
}, 15000); 