import { PrismaClient, MenuItemType } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Database initialization function
export async function initializeDatabase() {
  try {
    // Check if we need to seed the database
    const userCount = await prisma.user.count();
    const menuCount = await prisma.menuConfig.count();
    
    // Create default admin user if none exists
    if (userCount === 0) {
      const bcrypt = await import('bcryptjs');
      const hashedPassword = await bcrypt.hash(process.env.APP_PASSWORD || 'password123', 12);
      
      await prisma.user.create({
        data: {
          username: process.env.APP_USERNAME || 'admin',
          password: hashedPassword,
        },
      });
      
      console.log('Default admin user created');
    }
    
    // Create default menu items if none exist
    if (menuCount === 0) {
      const defaultMenuItems = [
        // Drinks
        { itemType: MenuItemType.DRINK, itemName: 'Latte', price: 4.0 },
        { itemType: MenuItemType.DRINK, itemName: 'Coffee', price: 3.0 },
        { itemType: MenuItemType.DRINK, itemName: 'Cappuccino', price: 4.5 },
        { itemType: MenuItemType.DRINK, itemName: 'Americano', price: 3.5 },
        { itemType: MenuItemType.DRINK, itemName: 'Mocha', price: 5.0 },
        { itemType: MenuItemType.DRINK, itemName: 'Macchiato', price: 4.5 },
        { itemType: MenuItemType.DRINK, itemName: 'Espresso', price: 2.5 },
        
        // Milk options
        { itemType: MenuItemType.MILK, itemName: 'Whole', price: null },
        { itemType: MenuItemType.MILK, itemName: 'Oat', price: null },
        { itemType: MenuItemType.MILK, itemName: 'Almond', price: null },
        { itemType: MenuItemType.MILK, itemName: 'Soy', price: null },
        { itemType: MenuItemType.MILK, itemName: '2%', price: null },
        { itemType: MenuItemType.MILK, itemName: 'Skim', price: null },
        { itemType: MenuItemType.MILK, itemName: 'Coconut', price: null },
        
        // Syrups
        { itemType: MenuItemType.SYRUP, itemName: 'Vanilla', price: null },
        { itemType: MenuItemType.SYRUP, itemName: 'Caramel', price: null },
        { itemType: MenuItemType.SYRUP, itemName: 'Hazelnut', price: null },
        { itemType: MenuItemType.SYRUP, itemName: 'Cinnamon', price: null },
        { itemType: MenuItemType.SYRUP, itemName: 'Peppermint', price: null },
        { itemType: MenuItemType.SYRUP, itemName: 'Chocolate', price: null },
        
        // Foam options
        { itemType: MenuItemType.FOAM, itemName: 'Regular Foam', price: null },
        { itemType: MenuItemType.FOAM, itemName: 'Extra Foam', price: null },
        { itemType: MenuItemType.FOAM, itemName: 'Light Foam', price: null },
        { itemType: MenuItemType.FOAM, itemName: 'No Foam', price: null },
        
        // Temperature options
        { itemType: MenuItemType.TEMPERATURE, itemName: 'Hot', price: null },
        { itemType: MenuItemType.TEMPERATURE, itemName: 'Iced', price: null },
        { itemType: MenuItemType.TEMPERATURE, itemName: 'Extra Hot', price: null },
      ];
      
      await prisma.menuConfig.createMany({
        data: defaultMenuItems,
      });
      
      console.log('Default menu items created');
    }
    
    // Create default settings if none exist
    const settingsCount = await prisma.settings.count();
    if (settingsCount === 0) {
      await prisma.settings.createMany({
        data: [
          { settingKey: 'wait_time_yellow_threshold', settingValue: '5' },
          { settingKey: 'wait_time_red_threshold', settingValue: '10' },
        ],
      });
      
      console.log('Default settings created');
    }
    
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  }
}