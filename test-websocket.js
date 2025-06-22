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
});

ws.on('message', function message(data) {
  console.log('Received message:', JSON.parse(data.toString()));
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
}, 10000); 