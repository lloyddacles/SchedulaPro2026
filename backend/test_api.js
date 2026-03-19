async function testApi() {
  try {
    const res = await fetch('http://localhost:5001/api/rooms', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Fetch Test Room 5001',
        type: 'Lecture',
        capacity: 50
      })
    });
    
    console.log('API Status:', res.status);
    const data = await res.text();
    console.log('API Response:', data);
  } catch (error) {
    console.error('Fetch Error:', error.message);
  }
}

testApi();
