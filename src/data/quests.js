// Quest data for FarmRPG
// This file contains all quest chains and their quests

export const questChains = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Learn the basics of farming',
    icon: 'plant',
    quests: [
      {
        id: 'first-steps',
        name: 'First Steps',
        description: 'Plant your first crops and begin your farming journey',
        requirements: [
          { type: 'item', item: 'Seeds', amount: 10 }
        ],
        rewards: [
          { type: 'item', item: 'Gold', amount: 100 },
          { type: 'xp', amount: 50 }
        ]
      },
      {
        id: 'harvest-time',
        name: 'Harvest Time',
        description: 'Harvest your crops to earn resources',
        requirements: [
          { type: 'item', item: 'Wheat', amount: 20 }
        ],
        rewards: [
          { type: 'item', item: 'Gold', amount: 200 },
          { type: 'xp', amount: 100 }
        ]
      },
      {
        id: 'craft-basics',
        name: 'Craft Basics',
        description: 'Learn to craft items from resources',
        requirements: [
          { type: 'item', item: 'Board', amount: 5 }
        ],
        rewards: [
          { type: 'item', item: 'Gold', amount: 300 },
          { type: 'xp', amount: 150 }
        ]
      }
    ]
  },
  {
    id: 'woodworking',
    name: 'Woodworking Master',
    description: 'Master the art of woodworking',
    icon: '🪓',
    quests: [
      {
        id: 'lumber-jack',
        name: 'Lumber Jack',
        description: 'Collect wood from the forest',
        requirements: [
          { type: 'item', item: 'Wood', amount: 50 }
        ],
        rewards: [
          { type: 'item', item: 'Board', amount: 10 },
          { type: 'xp', amount: 150 }
        ]
      },
      {
        id: 'board-crafter',
        name: 'Board Crafter',
        description: 'Craft boards for building',
        requirements: [
          { type: 'item', item: 'Board', amount: 25 }
        ],
        rewards: [
          { type: 'item', item: 'Gold', amount: 400 },
          { type: 'xp', amount: 200 }
        ]
      },
      {
        id: 'master-crafter',
        name: 'Master Crafter',
        description: 'Craft advanced wooden items',
        requirements: [
          { type: 'item', item: 'Board', amount: 50 },
          { type: 'item', item: 'Nails', amount: 30 }
        ],
        rewards: [
          { type: 'item', item: 'Gold', amount: 800 },
          { type: 'item', item: 'Chest', amount: 1 }
        ]
      }
    ]
  },
  {
    id: 'explorer',
    name: 'Explorer',
    description: 'Discover all locations in the game',
    icon: 'map',
    quests: [
      {
        id: 'forest-scout',
        name: 'Forest Scout',
        description: 'Explore the Forest and gather resources',
        requirements: [
          { type: 'location', location: 'Forest', visits: 10 }
        ],
        rewards: [
          { type: 'item', item: 'Gold', amount: 150 },
          { type: 'xp', amount: 100 }
        ]
      },
      {
        id: 'lake-explorer',
        name: 'Lake Explorer',
        description: 'Visit the Lake and catch some fish',
        requirements: [
          { type: 'location', location: 'Lake', visits: 10 }
        ],
        rewards: [
          { type: 'item', item: 'Fish', amount: 20 },
          { type: 'xp', amount: 100 }
        ]
      },
      {
        id: 'mountain-climber',
        name: 'Mountain Climber',
        description: 'Reach the Mountain peak',
        requirements: [
          { type: 'location', location: 'Mountain', visits: 10 }
        ],
        rewards: [
          { type: 'item', item: 'Gold', amount: 200 },
          { type: 'xp', amount: 150 }
        ]
      }
    ]
  },
  {
    id: 'fishing',
    name: 'Master Angler',
    description: 'Become a fishing expert',
    icon: 'fishing',
    quests: [
      {
        id: 'first-catch',
        name: 'First Catch',
        description: 'Catch your first fish',
        requirements: [
          { type: 'item', item: 'Fish', amount: 1 }
        ],
        rewards: [
          { type: 'item', item: 'Gold', amount: 50 },
          { type: 'xp', amount: 25 }
        ]
      },
      {
        id: 'fish-collector',
        name: 'Fish Collector',
        description: 'Build up your fish collection',
        requirements: [
          { type: 'item', item: 'Fish', amount: 50 }
        ],
        rewards: [
          { type: 'item', item: 'Gold', amount: 250 },
          { type: 'xp', amount: 150 }
        ]
      },
      {
        id: 'legendary-angler',
        name: 'Legendary Angler',
        description: 'Catch a legendary fish',
        requirements: [
          { type: 'item', item: 'Fish', amount: 100 },
          { type: 'item', item: 'Fishing Rod', amount: 1 }
        ],
        rewards: [
          { type: 'item', item: 'Gold', amount: 1000 },
          { type: 'item', item: 'Legendary Fish', amount: 1 }
        ]
      }
    ]
  },
  {
    id: 'cooking',
    name: 'Master Chef',
    description: 'Master the culinary arts',
    icon: 'chef',
    quests: [
      {
        id: 'first-meal',
        name: 'First Meal',
        description: 'Cook your first meal',
        requirements: [
          { type: 'item', item: 'Bread', amount: 1 }
        ],
        rewards: [
          { type: 'item', item: 'Gold', amount: 75 },
          { type: 'xp', amount: 50 }
        ]
      },
      {
        id: 'kitchen-expert',
        name: 'Kitchen Expert',
        description: 'Cook a variety of dishes',
        requirements: [
          { type: 'item', item: 'Bread', amount: 10 },
          { type: 'item', item: 'Apple Cider', amount: 5 }
        ],
        rewards: [
          { type: 'item', item: 'Gold', amount: 300 },
          { type: 'xp', amount: 200 }
        ]
      },
      {
        id: 'gourmet-chef',
        name: 'Gourmet Chef',
        description: 'Create exquisite meals',
        requirements: [
          { type: 'item', item: 'Apple Cider', amount: 20 },
          { type: 'item', item: 'Bread', amount: 30 }
        ],
        rewards: [
          { type: 'item', item: 'Gold', amount: 600 },
          { type: 'item', item: 'Master Recipe Book', amount: 1 }
        ]
      }
    ]
  }
]
