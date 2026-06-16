fetch('https://api.jsonbin.io/v3/b', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Master-Key': '$2a$10$OZJ9a2Kz9U8yStP9QrJjh.SALhoBgiH/xw0bQtbflwfMy5GbD7fNG'
  },
  body: JSON.stringify([{ "default": "value" }])
}).then(r => r.json()).then(console.log).catch(console.error);
