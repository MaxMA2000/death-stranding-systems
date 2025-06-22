const WebSocket = require('ws');
const { exec } = require('child_process');

const ws = new WebSocket('ws://localhost:8081/ws');

ws.on('open', function open() {
  console.log('✅ WebSocket connection opened');
  
  // Identify as Sam Porter Bridges
  const identifyMessage = {
    type: 'identify_porter',
    payload: '550e8400-e29b-41d4-a716-446655440000'
  };
  
  console.log('📤 Sending identification:', identifyMessage);
  ws.send(JSON.stringify(identifyMessage));
  
  // Wait longer before creating order to ensure identification is processed
  setTimeout(() => {
    console.log('📦 Creating test order...');
    
    const curlCommand = `curl -X POST http://localhost:8081/api/orders \\
      -H "Content-Type: application/json" \\
      -d '{
        "sender": {
          "name": "Detailed Test Sender",
          "location": "Central Knot City",
          "knot_city": "Central Knot City"
        },
        "recipient": {
          "name": "Detailed Test Recipient", 
          "location": "Lake Knot City",
          "knot_city": "Lake Knot City"
        },
        "item": {
          "name": "Detailed Test Package",
          "description": "Testing WebSocket delivery with detailed logging",
          "weight": 2.5,
          "category": "Medical"
        },
        "pickup_method": "Direct Pickup",
        "payment_info": "Prepaid"
      }'`;
    
    exec(curlCommand, (error, stdout, stderr) => {
      if (error) {
        console.error('❌ Error creating order:', error);
      } else {
        console.log('✅ Order created:', JSON.parse(stdout));
        console.log('⏳ Waiting for WebSocket message...');
      }
    });
  }, 5000); // Wait 5 seconds for identification
});

ws.on('message', function message(data) {
  console.log('🎉 RECEIVED WebSocket message:', JSON.parse(data.toString()));
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err);
});

ws.on('close', function close(code, reason) {
  console.log('🔌 WebSocket connection closed. Code:', code, 'Reason:', reason.toString());
});

// Keep the process alive longer for testing
setTimeout(() => {
  console.log('⏰ Test timeout - closing connection');
  ws.close();
  process.exit(0);
}, 30000); // 30 seconds

console.log('🚀 Starting WebSocket test...'); 