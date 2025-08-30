import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RolePermission {
  resource: string;
  action: string;
}

interface RoleConfig {
  name: string;
  description: string;
  permissions: RolePermission[];
}

const roleConfigurations: RoleConfig[] = [
  {
    name: 'super_user',
    description: 'Complete administrative control with full system access',
    permissions: [
      // System Management
      { resource: 'system', action: 'manage' },
      { resource: 'roles', action: 'create' },
      { resource: 'roles', action: 'update' },
      { resource: 'roles', action: 'delete' },
      { resource: 'permissions', action: 'manage' },
      
      // User Management (All Organizations)
      { resource: 'users', action: 'create' },
      { resource: 'users', action: 'read' },
      { resource: 'users', action: 'update' },
      { resource: 'users', action: 'delete' },
      
      // Organization Management
      { resource: 'organizations', action: 'create' },
      { resource: 'organizations', action: 'read' },
      { resource: 'organizations', action: 'update' },
      { resource: 'organizations', action: 'delete' },
      
      // Client Management (All Clients)
      { resource: 'clients', action: 'create' },
      { resource: 'clients', action: 'read' },
      { resource: 'clients', action: 'update' },
      { resource: 'clients', action: 'delete' },
      
      // Device Management (All Devices)
      { resource: 'devices', action: 'create' },
      { resource: 'devices', action: 'read' },
      { resource: 'devices', action: 'update' },
      { resource: 'devices', action: 'delete' },
      
      // Command Control (All Commands - Can Delegate)
      { resource: 'commands', action: 'pump_start' },
      { resource: 'commands', action: 'pump_stop' },
      { resource: 'commands', action: 'pump_restart' },
      { resource: 'commands', action: 'system_reboot' },
      { resource: 'commands', action: 'system_shutdown' },
      { resource: 'commands', action: 'maintenance_mode' },
      { resource: 'commands', action: 'diagnostic_run' },
      { resource: 'commands', action: 'parameter_update' },
      { resource: 'commands', action: 'delegate' }, // Can give command permissions to others
      
      // Dashboard & Widgets
      { resource: 'dashboard', action: 'view' },
      { resource: 'dashboard', action: 'customize' },
      { resource: 'widgets', action: 'create' },
      { resource: 'widgets', action: 'configure' },
      
      // Quick View Pages (Full Management)
      { resource: 'quick_view_pages', action: 'create' },
      { resource: 'quick_view_pages', action: 'read' },
      { resource: 'quick_view_pages', action: 'update' },
      { resource: 'quick_view_pages', action: 'delete' },
      { resource: 'quick_view_pages', action: 'share' },
      
      // Templates (Can Share with Anyone)
      { resource: 'templates', action: 'create' },
      { resource: 'templates', action: 'share_global' },
      { resource: 'templates', action: 'share_role' },
      { resource: 'templates', action: 'share_user' },
      
      // Reports (All)
      { resource: 'reports', action: 'generate' },
      { resource: 'reports', action: 'view' },
      { resource: 'reports', action: 'download' },
      
      // Settings
      { resource: 'settings', action: 'system' },
      { resource: 'settings', action: 'organization' },
      
      // Alarms (Full Control)
      { resource: 'alarms', action: 'create' },
      { resource: 'alarms', action: 'manage' },
      { resource: 'alarms', action: 'acknowledge' },
      { resource: 'alarms', action: 'delete' },
      
      // Files
      { resource: 'files', action: 'upload' },
      { resource: 'files', action: 'manage' },
      { resource: 'files', action: 'delete' },
      
      // Notifications
      { resource: 'notifications', action: 'send' },
      { resource: 'notifications', action: 'manage' },
      
      // Device-Specific Viewer Assignment
      { resource: 'viewers', action: 'assign_devices' },
    ]
  },
  
  {
    name: 'super_admin',
    description: 'Administrative control with full system access except critical deletions',
    permissions: [
      // System Management (No Delete Rights)
      { resource: 'system', action: 'manage' },
      { resource: 'roles', action: 'create' },
      { resource: 'roles', action: 'update' },
      // { resource: 'roles', action: 'delete' }, // REMOVED
      { resource: 'permissions', action: 'manage' },
      
      // User Management (All Organizations)
      { resource: 'users', action: 'create' },
      { resource: 'users', action: 'read' },
      { resource: 'users', action: 'update' },
      { resource: 'users', action: 'delete' },
      
      // Organization Management
      { resource: 'organizations', action: 'create' },
      { resource: 'organizations', action: 'read' },
      { resource: 'organizations', action: 'update' },
      { resource: 'organizations', action: 'delete' },
      
      // Client Management (All Clients)
      { resource: 'clients', action: 'create' },
      { resource: 'clients', action: 'read' },
      { resource: 'clients', action: 'update' },
      // { resource: 'clients', action: 'delete' }, // REMOVED
      
      // Device Management (No Delete)
      { resource: 'devices', action: 'create' },
      { resource: 'devices', action: 'read' },
      { resource: 'devices', action: 'update' },
      // { resource: 'devices', action: 'delete' }, // REMOVED
      
      // Command Control (Can Delegate - Same as Super User)
      { resource: 'commands', action: 'pump_start' },
      { resource: 'commands', action: 'pump_stop' },
      { resource: 'commands', action: 'pump_restart' },
      { resource: 'commands', action: 'system_reboot' },
      { resource: 'commands', action: 'system_shutdown' },
      { resource: 'commands', action: 'maintenance_mode' },
      { resource: 'commands', action: 'diagnostic_run' },
      { resource: 'commands', action: 'parameter_update' },
      { resource: 'commands', action: 'delegate' },
      
      // Dashboard & Widgets
      { resource: 'dashboard', action: 'view' },
      { resource: 'dashboard', action: 'customize' },
      { resource: 'widgets', action: 'create' },
      { resource: 'widgets', action: 'configure' },
      
      // Quick View Pages (Full Management)
      { resource: 'quick_view_pages', action: 'create' },
      { resource: 'quick_view_pages', action: 'read' },
      { resource: 'quick_view_pages', action: 'update' },
      { resource: 'quick_view_pages', action: 'delete' },
      { resource: 'quick_view_pages', action: 'share' },
      
      // Templates (Can Share with Anyone)
      { resource: 'templates', action: 'create' },
      { resource: 'templates', action: 'share_global' },
      { resource: 'templates', action: 'share_role' },
      { resource: 'templates', action: 'share_user' },
      
      // Reports (All)
      { resource: 'reports', action: 'generate' },
      { resource: 'reports', action: 'view' },
      { resource: 'reports', action: 'download' },
      
      // Settings
      { resource: 'settings', action: 'system' },
      { resource: 'settings', action: 'organization' },
      
      // Alarms (No Delete)
      { resource: 'alarms', action: 'create' },
      { resource: 'alarms', action: 'manage' },
      { resource: 'alarms', action: 'acknowledge' },
      // { resource: 'alarms', action: 'delete' }, // REMOVED
      
      // Files
      { resource: 'files', action: 'upload' },
      { resource: 'files', action: 'manage' },
      
      // Notifications
      { resource: 'notifications', action: 'send' },
      { resource: 'notifications', action: 'manage' },
      
      // Device-Specific Viewer Assignment
      { resource: 'viewers', action: 'assign_devices' },
    ]
  },
  
  {
    name: 'admin',
    description: 'Administrative interface for specific organizational units with command delegation',
    permissions: [
      // User Management (Scoped to Organization)
      { resource: 'users', action: 'create' },
      { resource: 'users', action: 'read' },
      { resource: 'users', action: 'update' },
      { resource: 'users', action: 'delete' },
      
      // Client Management (Assigned Clients Only)
      { resource: 'clients', action: 'read' },
      { resource: 'clients', action: 'update' },
      
      // Device Management (No Full CRUD - Only Read/Update)
      { resource: 'devices', action: 'read' },
      { resource: 'devices', action: 'update' },
      
      // Command Control (Only Commands Delegated by Super User/Super Admin)
      { resource: 'commands', action: 'delegate' }, // Can delegate their commands to others
      // Specific commands will be assigned by Super User/Super Admin dynamically
      
      // Dashboard & Widgets
      { resource: 'dashboard', action: 'view' },
      { resource: 'dashboard', action: 'customize' },
      { resource: 'widgets', action: 'create' },
      { resource: 'widgets', action: 'configure' },
      
      // Templates (Can Share with Role/User)
      { resource: 'templates', action: 'create' },
      { resource: 'templates', action: 'share_role' },
      { resource: 'templates', action: 'share_user' },
      
      // Reports (Scoped)
      { resource: 'reports', action: 'generate' },
      { resource: 'reports', action: 'view' },
      { resource: 'reports', action: 'download' },
      
      // Settings (Organization Level)
      { resource: 'settings', action: 'organization' },
      
      // Alarms
      { resource: 'alarms', action: 'create' },
      { resource: 'alarms', action: 'manage' },
      { resource: 'alarms', action: 'acknowledge' },
      
      // Files
      { resource: 'files', action: 'upload' },
      { resource: 'files', action: 'manage' },
      
      // Notifications
      { resource: 'notifications', action: 'send' },
    ]
  },
  
  {
    name: 'client',
    description: 'Organization client with restricted user creation and device management capabilities',
    permissions: [
      // User Management (Can Only Create Operators and Viewers)
      { resource: 'users', action: 'create_operator' },
      { resource: 'users', action: 'create_viewer' },
      { resource: 'users', action: 'read' },
      { resource: 'users', action: 'update' },
      
      // Client Data (Own Organization)
      { resource: 'clients', action: 'read' },
      { resource: 'clients', action: 'update' },
      
      // Device Management (Own Devices)
      { resource: 'devices', action: 'create' },
      { resource: 'devices', action: 'read' },
      { resource: 'devices', action: 'update' },
      
      // Command Control (Only Commands Delegated by Admin/Super User)
      // Specific commands will be assigned dynamically
      
      // Dashboard Access
      { resource: 'dashboard', action: 'view' },
      { resource: 'dashboard', action: 'customize' },
      
      // Reports (Own Data)
      { resource: 'reports', action: 'generate' },
      { resource: 'reports', action: 'view' },
      { resource: 'reports', action: 'download' },
      
      // Alarms (Acknowledge Only)
      { resource: 'alarms', action: 'acknowledge' },
      
      // Files
      { resource: 'files', action: 'upload' },
      { resource: 'files', action: 'view' },
    ]
  },
  
  {
    name: 'operator',
    description: 'Device operation, monitoring, and reporting within client scope',
    permissions: [
      // Device Operations (Assigned Devices)
      { resource: 'devices', action: 'read' },
      
      // Command Control (Only Commands Delegated by Client/Admin)
      // Specific commands will be assigned dynamically
      
      // Dashboard Access
      { resource: 'dashboard', action: 'view' },
      
      // Reports (Generate, View, Download - Own Data Only)
      { resource: 'reports', action: 'generate' },
      { resource: 'reports', action: 'view' },
      { resource: 'reports', action: 'download' },
      
      // Alarms (Acknowledge Only)
      { resource: 'alarms', action: 'acknowledge' },
      
      // Files (View Only)
      { resource: 'files', action: 'view' },
    ]
  },
  
  {
    name: 'viewer',
    description: 'Read-only access to assigned devices or specific client data',
    permissions: [
      // Device Viewing (Assigned Devices or Specific Devices)
      { resource: 'devices', action: 'read' },
      
      // Dashboard Access (View Only)
      { resource: 'dashboard', action: 'view' },
      
      // Reports (View Only)
      { resource: 'reports', action: 'view' },
      
      // Files (View Only)
      { resource: 'files', action: 'view' },
    ]
  }
];

async function seedUpdatedRoles() {
  console.log('🌱 Starting updated role and permission seeding...');

  try {
    // Clean existing permissions (but keep roles that might have users)
    await prisma.rolePermission.deleteMany();
    
    for (const roleConfig of roleConfigurations) {
      console.log(`\\n📝 Processing role: ${roleConfig.name}`);
      
      // Create or update role
      const role = await prisma.role.upsert({
        where: { name: roleConfig.name },
        update: { description: roleConfig.description },
        create: {
          name: roleConfig.name,
          description: roleConfig.description,
        },
      });
      
      console.log(`   ✅ Role "${role.name}" ready`);
      
      // Create permissions
      for (const permission of roleConfig.permissions) {
        await prisma.rolePermission.create({
          data: {
            roleId: role.id,
            resource: permission.resource,
            action: permission.action,
          },
        });
      }
      
      console.log(`   ✅ Added ${roleConfig.permissions.length} permissions`);
    }
    
    console.log('\\n🎉 Updated role and permission seeding completed successfully!');
    
    // Display summary
    const summary = await prisma.role.findMany({
      include: {
        permissions: true,
        _count: {
          select: { users: true }
        }
      }
    });
    
    console.log('\\n📊 Updated Role Summary:');
    summary.forEach(role => {
      console.log(`   ${role.name}: ${role.permissions.length} permissions, ${role._count.users} users`);
    });
    
  } catch (error) {
    console.error('❌ Error seeding updated roles:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedUpdatedRoles().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

export { seedUpdatedRoles };