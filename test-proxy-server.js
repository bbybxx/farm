// Тест прокси-сервера
async function testProxyServer() {
  try {
    console.log('🧪 Тестируем прокси-сервер...');
    
    const response = await fetch('http://localhost:3001/api/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          query {
            items {
              name
              type
              canCraft
            }
          }
        `
      })
    });

    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Response error:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ API прокси работает!');
    console.log('📊 Items count:', data.data?.items?.length || 0);
    console.log('🔍 First 5 items:', data.data?.items?.slice(0, 5)?.map(item => item.name) || []);
    
  } catch (error) {
    console.error('❌ Ошибка при тестировании прокси:', error);
  }
}

testProxyServer();
