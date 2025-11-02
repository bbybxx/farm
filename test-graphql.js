// Тестовый скрипт для проверки структуры GraphQL API

// Сначала запросим схему через introspection
const schemaQuery = `
  query IntrospectionQuery {
    __schema {
      queryType {
        fields {
          name
          description
          args {
            name
            type {
              name
              kind
            }
          }
        }
      }
      types {
        name
        kind
        fields {
          name
          type {
            name
            kind
          }
        }
      }
    }
  }
`;

const testQuery = `
  query {
    locations {
      name
      image
      baseDropRate
      dropRates {
        runecube
        seed {
          name
        }
        silverPerHit
        xpPerHit
        items {
          item {
            name
            type
            image
          }
          rate
        }
      }
    }
  }
`;

const itemsQuery = `
  query {
    items {
      name
      type
      image
      canCraft
      craftingLevel
      recipeItems {
        ingredientItem {
          name
          type
        }
        quantity
      }
    }
  }
`;

async function testAPI() {
  try {
    console.log('🔍 Step 1: Fetching GraphQL schema...\n');
    
    // First, get the schema
    let response = await fetch('https://api.buddy.farm/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: schemaQuery })
    });

    if (response.ok) {
      const schemaData = await response.json();
      
      if (!schemaData.errors) {
        console.log('✅ Available Query fields:');
        schemaData.data?.__schema?.queryType?.fields?.forEach(field => {
          console.log(`  - ${field.name}${field.args?.length > 0 ? '(' + field.args.map(a => a.name).join(', ') + ')' : ''}`);
        });
        
        // Find Location type
        const locationType = schemaData.data?.__schema?.types?.find(t => t.name === 'Location');
        if (locationType) {
          console.log('\n📍 Location type fields:');
          locationType.fields?.forEach(field => {
            console.log(`  - ${field.name}: ${field.type?.name || field.type?.kind}`);
          });
        }
        
        // Find DropRates type
        const dropRatesType = schemaData.data?.__schema?.types?.find(t => t.name === 'DropRates');
        if (dropRatesType) {
          console.log('\n💧 DropRates type fields:');
          dropRatesType.fields?.forEach(field => {
            console.log(`  - ${field.name}: ${field.type?.name || field.type?.kind}`);
          });
        }
        
        // Find DropRatesItems type
        const dropRatesItemsType = schemaData.data?.__schema?.types?.find(t => t.name === 'DropRatesItems');
        if (dropRatesItemsType) {
          console.log('\n📊 DropRatesItems type fields:');
          dropRatesItemsType.fields?.forEach(field => {
            console.log(`  - ${field.name}: ${field.type?.name || field.type?.kind}`);
          });
        }
        
        // Find Item type
        const itemType = schemaData.data?.__schema?.types?.find(t => t.name === 'Item');
        if (itemType) {
          console.log('\n📦 Item type fields:');
          itemType.fields?.forEach(field => {
            console.log(`  - ${field.name}: ${field.type?.name || field.type?.kind}`);
          });
        }
      }
    }
    
    console.log('\n🔍 Step 2: Testing locations query...\n');
    
    response = await fetch('https://api.buddy.farm/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: testQuery })
    });

    if (!response.ok) {
      console.error('❌ HTTP Error:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response:', text);
      return;
    }

    const data = await response.json();
    
    if (data.errors) {
      console.error('❌ GraphQL Errors:');
      console.log(JSON.stringify(data.errors, null, 2));
      return;
    }

    console.log('📊 Summary:');
    console.log('Locations received:', data.data?.locations?.length || 0);
    
    if (data.data?.locations) {
      // Найдем Small Spring
      const smallSpring = data.data.locations.find(loc => loc.name === 'Small Spring');
      if (smallSpring) {
        console.log('\n�️ Small Spring location:');
        console.log('Name:', smallSpring.name);
        console.log('Base drop rate:', smallSpring.baseDropRate);
        console.log('Number of drop rates:', smallSpring.dropRates?.length || 0);
        
        console.log('\n📋 First dropRate structure:');
        console.log(JSON.stringify(smallSpring.dropRates[0], null, 2));
        
        // Проверяем все items во всех dropRates
        console.log('\n🔍 Searching for Pearl Berries...');
        let found = false;
        smallSpring.dropRates?.forEach((dr, idx) => {
          console.log(`\nDropRate #${idx}:`);
          console.log(`  Runecube: ${dr.runecube}`);
          console.log(`  Seed: ${dr.seed?.name || 'none'}`);
          console.log(`  Items count: ${dr.items?.length || 0}`);
          
          if (dr.items && dr.items.length > 0) {
            // Check ALL items, not just first 3
            dr.items.forEach((itemWrapper, itemIdx) => {
              if (itemWrapper.item?.name === 'Pearl Berries') {
                found = true;
                console.log(`\n✅ FOUND Pearl Berries at position ${itemIdx}!`);
                console.log(`  Runecube: ${dr.runecube}`);
                console.log(`  Seed: ${dr.seed?.name || 'none'}`);
                console.log(JSON.stringify(itemWrapper, null, 2));
              }
            });
            console.log(`  Total items in this dropRate: ${dr.items.length}`);
          }
        });
        
        if (!found) {
          console.log('\n⚠️ Pearl Berries NOT found in any dropRate');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
